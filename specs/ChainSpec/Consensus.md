# Consensus

The fields in the Block header relevant to the consensus process are:

```rust
struct BlockHeader {
    ...
    prev_hash: BlockHash,
    height: BlockHeight,
    epoch_id: EpochId,
    last_final_block_hash: BlockHash,
    approvals: Vec<Approval>
    ...
}
```

Each block belongs to a particular epoch, and has a particular height. The highest height block known to a particular node is its head.

Each epoch has a set of block producers who are assigned to produce blocks in the epoch, and has an assigned block producer for each height in the epoch. The block producers and the assignments in a particular epoch are known from the first block of the *preceding* epoch.

Consecutive blocks do not necessarily have sequential heights. For example, if a block producer responsible for producing a block at height `h` is offline, the block at height `h+1` can have as its previous block a block with height `h-1`.

If a block `B` at some height `h` builds on top of a block `B_prev` that has height `h-1`, and `B_prev` in turn builds on top of a block `B_prev_prev` that has height `h-2` (i.e. if the last three blocks in the chain ending at `B` have sequential heights), and all three blocks are in the same epoch, the block `B_prev_prev` is final, and cannot be reverted unless block producers with more than `2/3` cumulative stake deviate from the protocol. 

TODO: talk about epoch boundaries here

Block producers in the particular epoch exchange many kinds of messages. The two kinds that are relevant to the consensus are **Blocks** and **Approvals**. The approval contains five fields:

```rust
struct Approval {
    prev_hash: BlockHash,
    prev_height: BlockIndex,
    target_height: BlockHeight,
    signature: Signature,
    account_id: AccountId
}
```

Where `prev_hash` and `prev_height` are the hash and the height of the block being approved, `target_height` is the specific height at which the approval can be used (an approval with a particular `target_height` can be only included in the `approvals` of a block that has `height = target_height`), `account_id` is the account of the block producer who created the approval, and `signature` is their signature on the tuple `(prev_hash, target_height)` if `target_height == prev_height+1` and the tuple `(prev_height, target_height)` otherwise.

Any valid block must contain approvals from block producers whose cumulative stake exceeds 2/3 of the total stake in the epoch. For a block `B` and its previous block `B'` each approval in `B` must have `prev_height` to be equal to the height of `B'`. If (and only if) `B.height == B'.height + 1`, each approval's `prev_hash` must also be exactly the hash of `B'`. See [this section](#approval-condition) below for details on why the condition must be exactly such.

On receival of the approval message the participant just stores it in the collection of approval messages.

```python
def on_approval(self, approval):
    self.approvals.append(approval)
```

Whenever a participant receives a block, the operations relevant to the consensus include updating the `head` and initiating a timer to start sending the approvals on the block to the block producerse at the consecutive `target_height`s. The timer delays depend on the height of the last final block, so that information is also persisted.

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

    if self.endorsement_pending and \
          now > self.timer_started + ENDORSEMENT_DELAY:

        if self.head_height >= self.largest_target_height:
            self.larget_target_height = self.head_height + 1
            self.send_approval(head_height + 1)

        self.endorsement_pending = False

    if now > self.timer_started + skip_delay:
        assert not self.endorsement_pending

        self.largest_target_height = max(self.largest_target_height, self.timer_height + 1)
        self.send_approval(self.timer_height + 1)

        self.timer_started = now
        self.timer_height += 1
```

Where `send_approval` creates an approval with `prev_hash` and `prev_height` equal to `self.head_hash` and `self.head_height` correspondingly, `target_height` to the passed argument, and sends to the block producer at `target_height`.

## Block Production
We first define a convenience function to fetch approvals that can be included in a block at particular height:

```python
def get_approvals(self, target_height):
    return [approval for approval
                     in self.approvals
                     if approval.target_height == target_height and
                        approval.prev_height == self.head_height and
                        (approval.prev_height + 1 != target_height or
                         approval.prev_hash == self.head_hash)]
```

A block producer assigned for a particular height produces a block at that height whenever they have `get_approvals` return approvals from block producers whose stake collectively exceeds 2/3 of the total stake.

## Safety

We call approvals for which `prev_height + 1 = target_height` endorsements, and all other approvals skips.

Note that with the implementation above a honest block producer can never produce two endorsements with the same `prev_height` (call this condition *conflicting endorsements*), neigher can they produce a skip message `s` and an endorsement `e` such that `s.prev_height > e.prev_height and s.target_height <= e.target_height` (call this condition *conflicting skip and endorsement*).

Say a block `B0` is final, i.e. there are blocks `B1` and `B2` that build on top of it and have sequential heights.

Let's show that there's no other block `Bx` that has height higher than `B0` and doesn't have `B0` in its ancestry. Say it is not the case and such block `Bx` exists. Say `Bx` has the smallest height among such blocks. Thus, its previous block `Bp` has height less or equal to the height of `B0`. Consider three cases:

1. `Bp.height < B0.height`. Then each approval in `Bx` is a skip. For each block producer that included a skip in `Bx` and an endorsement in `B1` these two messages conflict, thus at least 1/3 of stake-weighted block producers deviated from the protocol.
2. `Bp.height == B0.height and Bx.height == B1.height`. Then each approval in `B1` is an endorsement. For each block producer that included an endorsement in `Bx` and an endorsement in `B1` these two messages conflict, thus at least 1/3 of stake-weighted block producers deviated from the protocol.
3. `Bp.height == B0.height and Bx.height > B1.height`. Then each approval in `Bx` is a skip. For each block producer that included a skip in `Bx` and an endorsement in `B2` these two messages conflict, thus at least 1/3 of stake-weighted block producers deviated from the protocol.

Thus, for any block with height higher than `B0.height` that doesn't have `B0` in its ancestry to be produced at least 1/3 of stake-weighted block producers must deviate from the protocol.

## Liveness

See the proof of livness in [near.ai/doomslug](near.ai/doomslug). The consensus in this section differs in that it requires two consecutive blocks with endorsements. The proof in the linked paper trivially extends, by observing that once the delay is sufficiently long for a honest block producer to collect enough endorsements, the next block producer ought to have enough time to collect all the endorsements too.

## Approval condition
The approval condition above

> Any valid block must contain approvals from block producers whose cumulative stake exceeds 2/3 of the total stake in the epoch. For a block `B` and its previous block `B'` each approval in `B` must have `prev_height` to be equal to the height of `B'`. If (and only if) `B.height == B'.height + 1`, each approval's `prev_hash` must also be exactly the hash of `B'`.

Sounds unnecessarily hacky, and it is tempting to unify the two conditions. Unfortunately, they cannot be unified.

It is critical that for endorsements each approval has the `prev_hash` equal to the hash of the previous block, because otherwise the [safety proof](#safety) above doesn't work, in the second case the endorsements in `B1` and `Bx` can be the very same approvals.

It is critical that for the skip messages we do **not** require the hashes in the approvals to match the hash of the previous block, because otherwise a malicious actor can create two blocks at the same height, and distribute them such that half of the block producers have one as their head, and the other half has the other. The two halves of the block producers will be sending skip messages with different `prev_hash` but the same `prev_height` to the future block producers, and if there's a requirement that the `prev_hash` in the skip matches exactly the `prev_hash` of the block, no block producer will be able to create their blocks.