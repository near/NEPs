- Proposal Name: Splitting States for Simple Nightshade
- Start Date: 2021-07-19
- NEP PR: [nearprotocol/neps#0000](https://github.com/nearprotocol/neps/pull/0000)
- Issue(s): [near/NEPs#225](https://github.com/near/NEPs/issues/225) [near/nearcore#4419](https://github.com/near/nearcore/issues/4419)

# Summary
[summary]: #summary

This proposal proposes a way to split each shard in the blockchain into multiple shards. Currently, the near blockchain only has one shard and it needs to be split into eight shards.

# Motivation
[motivation]: #motivation

To enable sharding, specifically, [Simple Nightshade](https://gov.near.org/t/road-to-simple-nightshade/1790), we need to find a way to split the current one shard state into eight shards. 


# Guide-level explanation 
[guide-level-explanation]: #guide-level-explanation

The proposal assumes that all validators track all shards and that challenges are not enabled.

Suppose the new sharding assignment come into effect at epoch T. State migration is done at epoch T-1, when the validators for epoch T are catching up states for the next epoch. At the beginning of epoch T-1, they run state sync for the current shards if needed. From the existing states, they build states for the new shards, then apply changes to the new states when they process the blocks in epoch T-1.  This whole process runs off-chain as the new states will be not included in blocks at epoch T-1. At the beginning of epoch T, the new validators start to build blocks based on the new state roots.

The change involves three parts. 

## Dynamic Shards
The first issue to address in splitting shards is the assumption that the current implmentation of chain and runtime makes that the number of shards never changes. This in turn involves two parts, how the validators know when sharding changes happen and how they store different states of shards from different epochs during the transition. The former is a protocol change and the latter only affects validators' internal states.

### Protocol Change
Sharding change will be triggered as protocol version changes. Everytime a resharding is scheduled, a new protocol version number is created for the switch to new sharding. Epochs with `protocol_version` larger or equal than the threshold number will take the new sharding assignment and epochs with `protocol_version` less will take the old sharding assignment. Since the `EpochInfo` of epoch T will be determined at the end of epoch T-2, the validators will have time to prepare for states for the new shards during epoch T-1.

For example, for the Simple NightShade migration, the current protocol version is 42. If there is no other pending protcol update, we can schedule the SimpleNightShadeShardSplit to happen at protocol version 43. Then when the epoch's protocol version is updated to 43, the new sharding for Simple NightShade will be enabled. 

We will discuss how the sharding transition will be managed in the next section.

### State Change
In epoch T-1, the validators need to maintain two versions of states for all shards, one for the current epoch, one that is split for the next epoch. Currently, shards are identified by their `shard_id`, which is a number ranging from `0` to `NUM_SHARDS-1`. It is also used as part of the indexing keys by which trie nodes are stored in the database. However, `shard_id` can not be used to uniquely identify states because new shards and old shards will share the same `shard_id`s under this representation.

To solve this issue, the new implementation differenciates between `ShardId`, which can be used to uniquely identify shards accross epochs, and `ShardOrd`, which is an ordinal number that can be used to locate shards within an epoch. In other words, the new `ShardId` will be a real identifier and the new `ShardOrd` replaces the old `ShardId`. `ShardOrd` will be used in ChunkHeader and other communication messages between validators, so there will be no change in the protocol level. `ShardId` is used for the validators to internally store and manage states. New values of `ShardId` will be created and assigned to new shards when resharding is scheduled. `EpochManager` will be responsible for assigning and managing `ShardId` accross epochs. It will provide an interface to convert `shard_id` to `epoch_id` and `shard_ord`, and vice versa.

Take the Simple Nightshade migration as an example. At epoch T-2, there is one shard with `shard_id = 0` and `shard_ord = 0`. At the end of epoch T-2, the epoch info for epoch T will be created and validators will know that epoch T will use a new sharding assignment that has eight shards. They then assign `shard_id`s from 1 to 8 to the new shards. At epoch T-1, on chain there will only be one shard `shard_id = 0`, but the validators can build states for shard 1 to 8. At epoch T, the new shards will be used, with `shard_ord` from 0 to 7 and `shard_id`s from 1 to 8.

## Build New States
Currently, when receiving the first block of every epoch, validators start downloading states to prepare for the next epoch. We can modify this existing process to make the validators build states for the new shards after they finish downloading states for the existing shards. To build the new states, the validator iterates through all accounts in the current states and adds them to the new states one by one.

## Update States
Similar to how validators usually catch up for the next epoch, the new states are updated as new blocks are processed. The difference is that in epoch T-1, chunks are still sharded by the current sharding assignment, but the validators need to perform updates on the new states. We cannot simply split transactions and receipts to the new shards and process updates on each new shard separately. If we do so, since each shard processes transactions and receipts with their own gas limits, some receipts may be delayed in the new states but not in the current states, or the other way around. That will lead to inconsistent ordering transactions and receipts applied to the current and new states.

For example, for simplicity, assume there is only one shard A in epoch T-1 and there will be two shards B and C in epoch T.  To process a block in epoch T-1, shard A needs to process receipts 0, 1, .., 99 while in the new sharding assignments receipts 0, 2, …, 98 belong to shard B and receipts 1, 3, …, 99 belong to shard C. Assume in shard A, the gas limit is hit after receipt 89 is processed, so receipts 90 to 99 are delayed. To achieve the same processing result, shard B must process receipt 0, 2, …, 88 and delay 90, 92, ..., 98 and shard C must process receipt 1, 3, ..., 89 and delay receipts 91, 93, …, 99. However, shard B and C have their own gas limits and which receipts will be processed and delayed cannot be guaranteed.

Whether a receipt is processed in a block or delayed can affect the execution result of this receipt because transactions are charged and local receipts are processed before delayed receipts are processed. For example, let’s assume Alice’s account has 0N now and Bob sends a transaction T1 to transfer 5N to Alice. The transaction has been converted to a receipt R at block i-1 and sent to Alice's shard at block i. Let's say Alice signs another transaction T2 to send 1N to Charlie and that transaction is included in block i+1. Whether transaction T2 succeeds depends on whether receipt R is processed or delayed in block i. If R is processed in block i, Alice’s account will have 5N before block i+1 and T2 will succeed while if R is delayed in block i, Alice’s account will have 0N and T2 will be declined.

Therefore, the validators still process transactions and receipts based on the current sharding assignment. After the processing is finished, they can take the generated state changes to apply to the new states.

# Reference-level explanation
[reference-level-explanation]: #reference-level-explanation
## Sharding Representation
### `EpochManager`
`EpochManager` will be responsible for managing shards info accross epochs.
#### `from_shard_id_to_ord`
```rust
from_shard_id_to_ord(&self, shard_id: ShardId, current_epoch_id: &EpochId) -> Result<(EpochId, ShardOrd), EpochError>
```
converts `shard_id` to the `shard_ord` and `epoch_id` of a shard. `current_epoch_id` will be used as the starting search point, the function will only search for epoch T-1, T, T+1 if the current epoch is T. If it cannot find the `shard_id`, it returns an `EpochError`.
#### `from_shard_ord_to_id`
```rust
from_shard_ord_to_id(&self, shard_ord: ShardOrd, epoch_id: &EpochId) -> Result<ShardId, EpochError>
```
converts `shard_ord` and `epoch_id` for a shard to its `shard_id`. It returns an EpochError if such shard does not exist.
### EpochInfoV3
Epoch info will include the `shard_id` of the shards in this epoch and a mappting from the current shards to their parent shards. We only allow adding new shards that are split from the existing shards, and if shard B and C are split from shard A, we call shard A the parent shard of shard B and C. For example, if epoch T-1 has shard with `shard_id` 0 and 1 and each of them will be split to two shards in epoch T, then the `EpochInfo` for epoch T will have `shards = [2, 3, 4, 5]` and `parent_shards = {2:0, 3:0, 4:1, 5:1}`.

```rust
pub struct EpochInfoV3 {
    ... // All fields in EpochInfoV2
    shards: Vec<ShardId>,
    parent_shards: HashMap<ShardId, ShardId>,
}
```

### ShardVersionManager
A new struct `ShardVersionManager` will be created to manage sharding assignment when `ProtocolVersion` is changed. `EpochManager` will own `ShardVersionManager` that it can call to create shards for the `EpochInfo` of the next next epoch.

#### ShardVersionManager
`ShardVersionManager` contains some static fields that store the mapping from `ProtocolVersion` to sharding assignments. Its implementation can be changed easily when a new sharding assignment is added as long as its behavior for the existing protocol versions do not change.
```rust
pub const SIMPLE_NIGHTSHADE_SHARD_VERSION: ProtocolVersion;
pub struct ShardVersionManager {
    // current shards
    shards: Vec<ShardId>,
    // protocol version of the current shards
    protocol_version: ProtocolVersion,
}
```
#### new
```rust
pub fn new(current_protocol_version: ProtocolVersion) -> Self
```
creates a new `ShardVersionManager` struct given the current protocol version.
#### `try_update_shards`
```rust
pub fn try_update_shards(protocol_version: ProtocolVersion) -> (Option<(Vec<ShardId>, HashMap<ShardId, ShardId>))
```
checks if the given `protocol_version` will trigger a change in sharding. If so, returns the new shards and a mapping from the current shards to parent shards. This will be called in `EpochManager::finalize_epoch` when `next_version` is determined.

### ShardTracker
Various functions such as `account_id_to_shard_id` in `ShardTracker` will be changed to incorporate the change in `ShardId`. New functions such as `account_id_to_shard_ord` can also be added easily if needed. The `num_shards` field will be removed from `ShardTracker` since it is no longer a static number. The current shard information can be accessed by the following functions. These changes will be propagated to `RuntimeAdapter` since `ShardTracker` cannot be directly accessed through `RuntimeAdapter`.

#### `get_shards`
```rust
pub fn get_shards() -> Vec<ShardId>
```
returns the `shard_id`s of the shards in the current epoch

#### `get_shards_next_epoch`
```rust
pub fn get_shards_next_epoch() -> Vec<ShardId>
```
returns the `shard_id`s of the shards in the next epoch

## Build New States
The following method in `Client` will be added or modified to split a shard's current state into multiple states.

### `split_shards`
```rust
pub fn split_shards(me: &Option<AccountId>, sync_hash: CryptoHash, shard_id: ShardId)
```
builds states for the new shards that the shard `shard_id` will be split to. After this function is finished, the states for the new shards should be ready in `ShardTries` to be accessed.

### `run_catchup`
```rust
pub fn run_catchup(...) {
    ...
    match state_sync.run(
        ...
    )? {
        StateSyncResult::Unchanged => {}
        StateSyncResult::Changed(fetch_block) => {...}
            StateSyncResult::Completed => {
            // build states for new shards if shards will change and we will track some of the new shards
            if self.runtime_adapter.will_shards_change_next_epoch(epoch_id) {
                let mut parent_shards = HashSet::new();
                let (new_shards, mapping_to_parent_shards) = self.runtime_adapter.get_shards_next_epoch(epoch_id);
                for shard_id in new_shards {
                    if self.runtime_adapter.will_care_about_shard(None, &sync_hash, shard_id, true) {
                	parent_shards.insert(mapping_to_parent_shards.get(shard_id)?);
                    }
                }
                for shard_id in parent_shards {
                    self.split_shards(me, &sync_hash, shard_id);
                }
            }
           ...
       }
   }
   ...
}
```

## Update States
### `split_state_changes`
```rust
split_state_changes(shard_id: ShardId, state_changes: &Vec<RawStateChangesWithTrieKey>) -> HashMap<ShardId, Vec<RawStateChangesWithTrieKey>>
```
splits state changes to be made to a current shard to changes that should be applid to the new shards

### `apply_chunks`
`apply_chunks` will be modified so that states of the new shards will be updated when processing chunks.  In `apply_chunks`, after processing each chunk, the state changes in `apply_results` are sorted into changes to new shards. At the end, we apply these changes to the new shards.
```rust
fn apply_chunks(...) -> Result<(), Error> {
    ...
    for (shard_id, (chunk_header, prev_chunk_header)) in
	(block.chunks().iter().zip(prev_block.chunks().iter())).enumerate()
    {
	...
        let apply_result = ...;
	// split states to new shards
	let changes_to_new_shards = self.split_state_changes(trie_changes);
	// apply changes_to_new_changes to the new shards
        for (new_shard_id, new_state_changes) in changes_to_new_states {
	    // locate the state for the new shard
            let trie = self.get_trie_for_shard(new_shard_id);
            let chunk_extra =
                self.chain_store_update.get_chunk_extra(&prev_block.hash(), new_shard_id)?.clone();
            let mut state_update = TrieUpdate::new(trie.clone(), *chunk_extra.state_root());
            
	    // update the state
	    for state_change in new_state_changes {
                state_update.set(state_change.trie_key, state_change.value);
            }
            state_update.commit(StateChangeCause::Resharding);
            let (trie_changes, state_changes) = state_update.finalize()?;
	    
	    // save the TrieChanges and ChunkExtra
	    self.chain_store_update.save_trie_changes(WrappedTrieChanges::new(
                self.tries,
                new_shard_id,
                trie_changes,
                state_changes,
                *block.hash(),
            ));
            self.chain_store_update.save_chunk_extra(
                &block.hash(),
                new_shard_id,
                ChunkExtra::new(&trie_changes.new_root, CryptoHash::default(), Vec::new(), 0, 0, 0),
            );
        }
    }
    ... 
}
```

## Garbage collection
#TODO
???

# Drawbacks
[drawbacks]: #drawbacks

The drawback of this approach is that it will not work when challenges are enabled since challenges to the transition to the new states will be too large to construct or verify. Thus, most of the change will likely be a one time use that only works for the Simple Nightshade transition, although part of the change involing `ShardId` may be reused in the future.

# Rationale and alternatives
[rationale-and-alternatives]: #rationale-and-alternatives
#TODO

- Why is this design the best in the space of possible designs?
- What other designs have been considered and what is the rationale for not choosing them?
- What is the impact of not doing this?

# Unresolved questions
[unresolved-questions]: #unresolved-questions
#TODO

- What parts of the design do you expect to resolve through the NEP process before this gets merged?
- What parts of the design do you expect to resolve through the implementation of this feature before stabilization?
- What related issues do you consider out of scope for this NEP that could be addressed in the future independently of the solution that comes out of this NEP?

# Future possibilities
[future-possibilities]: #future-possibilities

Think about what the natural extension and evolution of your proposal would
be and how it would affect the project as a whole in a holistic
way. Try to use this section as a tool to more fully consider all possible
interactions with the project in your proposal.
Also consider how the this all fits into the roadmap for the project
and of the relevant sub-team.

This is also a good place to "dump ideas", if they are out of scope for the
NEP you are writing but otherwise related.

If you have tried and cannot think of any future possibilities,
you may simply state that you cannot think of anything.

Note that having something written down in the future-possibilities section
is not a reason to accept the current or a future NEP. Such notes should be
in the section on motivation or rationale in this or subsequent NEPs.
The section merely provides additional information.
