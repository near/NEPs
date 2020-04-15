# Consensus

The fields in the Block header relevant to the consensus process are:

```rust
struct BlockHeader {
    ...
    prev_hash: BlockHash,
    height: BlockHeight,
    epoch_id: EpochId,
    last_final_block_hash: BlockHash,
    approvals: Vec<Option<Signature>>
    ...
}
```

Each block belongs to a particular epoch, and has a particular height. The largest height block accepted by a particular node is its head.

Each epoch has a set of block producers who are assigned to produce blocks in the epoch, and has an assigned block producer for each height in the epoch (to whom we refer as *block proposer at `h`*). The block producers and the assignments in a particular epoch are known from the first block of the *preceding* epoch.

Consecutive blocks do not necessarily have sequential heights. A block at height `h` can have as its previous block a block with height `h-1` or lower.

If a block `B` at some height `h` builds on top of a block `B_prev` that has height `h-1`, and `B_prev` in turn builds on top of a block `B_prev_prev` that has height `h-2`, the block `B_prev_prev` is final, and cannot be reverted unless block producers with more than `1/3` cumulative stake deviate from the protocol. 

Block producers in the particular epoch exchange many kinds of messages. The two kinds that are relevant to the consensus are **Blocks** and **Approvals**. The approval contains the following fields:

```rust
enum ApprovalInner {
    Endorsement(BlockHash),
    Skip(BlockHeight),
}

struct Approval {
    inner: ApprovalInner,
    target_height: BlockHeight,
    signature: Signature,
    account_id: AccountId
}
```

Where the parameter of the `Endorsement` is the hash of the approved block, the parameter of the `Skip` is the height of the approved block, `target_height` is the specific height at which the approval can be used (an approval with a particular `target_height` can be only included in the `approvals` of a block that has `height = target_height`), `account_id` is the account of the block producer who created the approval, and `signature` is their signature on the tuple `(inner, target_height)`.

## Approvals Requirements

A block `B` at height `h` that has some other block `B'` as its previous block must logically contain approvals of a form described in the next paragraph from block producers whose cumulative stake exceeds 2/3 of the total stake in the current epoch, and in specific conditions described in section [epoch switches](#epoch-switches) also the approvals of the same form from block producers whose cumulative stake exceeds 2/3 of the total stake in the next epoch.

If a block to be produced will have height `h` and previous block `B'`, the approvals logically included in it must be an `Endorsement` with the hash of `B'` if and only if `h == B'.height + 1`, otherwise it must be a `Skip` with the height of `B'`. See [this section](#approval-condition) below for details on why the endorsements must contain the hash of the previous block, and skips must contain the height.

Note that since each approval that is logically stored in the block is the same for each block producer (except for the `account_id` of the sender and the `signature`), it is redundant to store the full approvals. Instead physically we only store the signatures of the approvals. The specific way they are stored is the following: we first fetch the ordered set of block producers from the current epoch. If the block is on the epoch boundary and also needs to include approvals from the next epoch (see [epoch switches](#epoch-switches)), we add new accounts from the new epoch

```python
def get_accounts_for_block_ordered(h, prev_block):
    cur_epoch = get_next_block_epoch(prev_block)
    next_epoch = get_next_block_next_epoch(prev_block)

    account_ids = get_epoch_block_producers_ordered(cur_epoch)
    if next_block_needs_approvals_from_next_epoch(prev_block):
        for account_id in get_epoch_block_producers_ordered(next_epoch):
            if account_id not in account_ids:
                account_ids.append(account_id)

    return account_ids
```

The block then contains a vector of optional signatures of the same or smaller size than the resulting set of `account_ids`, with each element being `None` if the approval for such account is absent, or the signature on the approval message if it is present. It's easy to show that the actual approvals that were signed by the block producers can easily be reconstructed from the information available in the block, and thus the signatures can be verified. If the vector of signatures is shorter than the length of `account_ids`, the remaining signatures are assumed to be `None`.

## Messages

On receival of the approval message the participant just stores it in the collection of approval messages.

```python
def on_approval(self, approval):
    self.approvals.append(approval)
```

Whenever a participant receives a block, the operations relevant to the consensus include updating the `head` and initiating a timer to start sending the approvals on the block to the block producers at the consecutive `target_height`s. The timer delays depend on the height of the last final block, so that information is also persisted.

```python
def on_block(self, block):
    header = block.header

    if header.height <= self.head_height:
        return

    last_final_block = store.get_block(header.last_final_block_hash)

    self.head_height = header.height
    self.head_hash = block.hash()
    self.largest_final_height = last_final_block.height

    self.timer_height = self.head_height + 1
    self.timer_started = time.time()

    self.endorsement_pending = True
```

The timer needs to be checked periodically, and contain the following logic:

```python
def get_delay(n):
    min(MAX_DELAY, MIN_DELAY + DELAY_STEP * (n-2))

def process_timer(self):
    now = time.time()

    skip_delay = get_delay(self.timer_height - self.largest_final_height)

    if self.endorsement_pending and now > self.timer_started + ENDORSEMENT_DELAY:

        if self.head_height >= self.largest_target_height:
            self.largest_target_height = self.head_height + 1
            self.send_approval(head_height + 1)

        self.endorsement_pending = False

    if now > self.timer_started + skip_delay:
        assert not self.endorsement_pending

        self.largest_target_height = max(self.largest_target_height, self.timer_height + 1)
        self.send_approval(self.timer_height + 1)

        self.timer_started = now
        self.timer_height += 1

def send_approval(self, target_height):
    if target_height == self.head_height + 1:
        inner = Endorsement(self.head_hash)
    else:
        inner = Skip(self.head_height)
    
    approval = Approval(inner, target_height)
    send(approval, to_whom = get_block_proposer(self.head_hash, target_height))
```

Where `get_block_proposer` returns the next block proposer given the previous block and the height of the next block.

It is also necessary that `ENDORSEMENT_DELAY < MIN_DELAY`. Moreover, while not necessary for correctness, we require that `ENDORSEMENT_DELAY * 2 <= MIN_DELAY`.

## Block Production
We first define a convenience function to fetch approvals that can be included in a block at particular height:

```python
def get_approvals(self, target_height):
    return [approval for approval
                     in self.approvals
                     if approval.target_height == target_height and
                        (isinstance(approval.inner, Skip) and approval.prev_height == self.head_height or
                         isinstance(approval.inner, Endorsement) and approval.prev_hash == self.head_hash)
```

A block producer assigned for a particular height produces a block at that height whenever they have `get_approvals` return approvals from block producers whose stake collectively exceeds 2/3 of the total stake.

## Epoch Switches
There's a parameter `epoch_length` in genesis config that defines the expected length of an epoch. Say a particular epoch `e_cur` started at height `h`, and say the next epoch will be `e_next`. Say `BP(e)` is a set of block producers in epoch `e`. Say `last_final_height(B)` is the height of most recent block that is known to be final by observing the chain that ends in `B`.

```python
def last_final_height(B):
    if B == genesis or prev(B) == genesis:
        return height(genesis)
    if height(B) == height(prev(B)) + 1 and height(prev(B)) == height(prev(prev(B))) + 1:
        return height(B) - 2
    else
        return last_final_height(prev(B))
```

The following are the rules of what blocks contain approvals from what block producers, and belong to what epoch.

- Any block `B` with `height(prev(B)) < h + epoch_length - 3` is in the epoch `e_cur` and must have approvals from more than 2/3 of `BP(e_cur)` (stake-weighted).
- Any block `B` with `height(prev(B)) >= h + epoch_length - 3` for which `last_final_height(prev(B)) < h + epoch_length - 3` is in the epoch `e_cur` and must logically include approvals from both more than 2/3 of `BP(e_cur)` and more than 2/3 of `BP(e_next)` (both stake-weighted).
- The first block `B` with `last_final_height(prev(B)) >= h + epoch_length - 3` is in the epoch `e_next` and must logically include approvals from more than 2/3 of `BP(e_next)` (stake-weighted).

(see the definition of *logically including* approvals in [approval requirements](#approvals-requirements))

```python
def next_block_is_in_next_epoch(prev_block):
    first_height = get_epoch_start_height(get_epoch(prev_block))
    return last_final_height(prev_block) >= first_height + epoch_length - 3

def next_block_needs_approvals_from_next_epoch(prev_block):
    first_height = get_epoch_start_height(get_epoch(prev_block))
    return height(prev_block) >= first_height + epoch_length - 2 and not next_block_is_in_next_epoch(prev_block)
```

## Safety

Note that with the implementation above a honest block producer can never produce two endorsements with the same `prev_height` (call this condition *conflicting endorsements*), neither can they produce a skip message `s` and an endorsement `e` such that `s.prev_height < e.prev_height and s.target_height >= e.target_height` (call this condition *conflicting skip and endorsement*).

Say a block `B0` is final, i.e. there are blocks `B1` and `B2` that build on top of it and have sequential heights.

Let's show that there's no other block `Bx` that has height higher than `B0` and doesn't have `B0` in its ancestry. Say it is not the case and such block `Bx` exists. Say `Bx` has the smallest height among such blocks. Thus, its previous block `Bp` has height less or equal to the height of `B0`.

**`Bx` in the same epoch as `B0`**

Consider the following three cases:

1. `Bp.height < B0.height`. Then each approval in `Bx` is a skip. For each block producer that included a skip in `Bx` and an endorsement in `B1` these two messages conflict, thus at least 1/3 of stake-weighted block producers deviated from the protocol.
2. `Bp.height == B0.height and Bx.height == B1.height`. Then each approval in `B1` is an endorsement. For each block producer that included an endorsement in `Bx` and an endorsement in `B1` these two messages conflict, thus at least 1/3 of stake-weighted block producers deviated from the protocol.
3. `Bp.height == B0.height and Bx.height > B1.height`. Then each approval in `Bx` is a skip. For each block producer that included a skip in `Bx` and an endorsement in `B2` these two messages conflict, thus at least 1/3 of stake-weighted block producers deviated from the protocol.

Thus, for any block with height higher than `B0.height` that doesn't have `B0` in its ancestry to be produced at least 1/3 of stake-weighted block producers must deviate from the protocol in a way that is cryptographically provable.

**`Bx` and `B0` are in two different epochs**

TODO

## Liveness

See the proof of livness in [near.ai/doomslug](near.ai/doomslug). The consensus in this section differs in that it requires two consecutive blocks with endorsements. The proof in the linked paper trivially extends, by observing that once the delay is sufficiently long for a honest block producer to collect enough endorsements, the next block producer ought to have enough time to collect all the endorsements too.

## Approval condition
The approval condition above

> Any valid block must logically include approvals from block producers whose cumulative stake exceeds 2/3 of the total stake in the epoch. For a block `B` and its previous block `B'` each approval in `B` must be an `Endorsement` with the hash of `B'` if and only if `B.height == B'.height + 1`, otherwise it must be a `Skip` with the height of `B'`

Is more complex that desired, and it is tempting to unify the two conditions. Unfortunately, they cannot be unified.

It is critical that for endorsements each approval has the `prev_hash` equal to the hash of the previous block, because otherwise the [safety proof](#safety) above doesn't work, in the second case the endorsements in `B1` and `Bx` can be the very same approvals.

It is critical that for the skip messages we do **not** require the hashes in the approvals to match the hash of the previous block, because otherwise a malicious actor can create two blocks at the same height, and distribute them such that half of the block producers have one as their head, and the other half has the other. The two halves of the block producers will be sending skip messages with different `prev_hash` but the same `prev_height` to the future block producers, and if there's a requirement that the `prev_hash` in the skip matches exactly the `prev_hash` of the block, no block producer will be able to create their blocks.
