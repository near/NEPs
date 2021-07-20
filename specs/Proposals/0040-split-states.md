- Proposal Name: Splitting States for Simple Nightshade
- Start Date: 2021-07-19
- NEP PR: [near/NEPs#241](https://github.com/near/NEPs/pull/241)
- Issue(s): [near/NEPs#225](https://github.com/near/NEPs/issues/225) [near/nearcore#4419](https://github.com/near/nearcore/issues/4419)

# Summary
[summary]: #summary

This proposal proposes a way to split each shard in the blockchain into multiple shards.

Currently, the near blockchain only has one shard and it needs to be split into eight shards for Simple Nightshade.

# Motivation
[motivation]: #motivation

To enable sharding, specifically, [Simple Nightshade](https://gov.near.org/t/road-to-simple-nightshade/1790), we need to find a way to split the current one shard state into eight shards.

# Guide-level explanation 
[guide-level-explanation]: #guide-level-explanation

The proposal assumes that all validators track all shards and that challenges are not enabled.

Suppose the new sharding assignment comes into effect at epoch T.

State migration is done at epoch T-1, when the validators for epoch T are catching up states for the next epoch.
At the beginning of epoch T-1, they run state sync for the current shards if needed.
From the existing states, they build states for the new shards, then apply changes to the new states when they process the blocks in epoch T-1.
 This whole process runs off-chain as the new states will be not included in blocks at epoch T-1.
At the beginning of epoch T, the new validators start to build blocks based on the new state roots.

The change involves three parts.

## Dynamic Shards
The first issue to address in splitting shards is the assumption that the current implementation of chain and runtime makes that the number of shards never changes.
This in turn involves two parts, how the validators know when sharding changes happen and how they store states of shards from different epochs during the transition.
The former is a protocol change and the latter only affects validators' internal states.

### Protocol Change
Sharding change will be triggered as protocol version changes.
Every time a resharding is scheduled, a new protocol version number is created for the switch to new sharding.
Epochs with `protocol_version` larger or equal than the threshold number will take the new sharding assignment while epochs with `protocol_version` less will take the old sharding assignment.
Since the `EpochInfo` of epoch T will be determined at the end of epoch T-2, the validators will have time to prepare for states of the new shards during epoch T-1.

For example, for the Simple NightShade migration, assume that the current protocol version is 45.
If there is no other pending protocol update, we can schedule `SimpleNightShadeShardSplit` to happen at protocol version 46.
Then when the epoch's protocol version is updated to 46, the new sharding for Simple NightShade will be enabled.

We will discuss how the sharding transition will be managed in the next section.

### State Change
In epoch T-1, the validators need to maintain two versions of states for all shards, one for the current epoch, one that is split for the next epoch.
Currently, shards are identified by their `shard_id`, which is a number ranging from `0` to `NUM_SHARDS-1`.`shard_id` is also used as part of the indexing keys by which trie nodes are stored in the database.
However, when shards may change accross epochs, `shard_id` can no longer be used to uniquely identify states because new shards and old shards will share the same `shard_id`s under this representation.

To solve this issue, the new proposal differenciates between `ShardId`, which can be used to uniquely identify shards accross epochs, and `ShardOrd`, which is an ordinal number that can be used to locate shards within an epoch.
In other words, the new `ShardId` will be a real identifier and the new `ShardOrd` replaces the old `ShardId`.
`ShardOrd` will be used in ChunkHeader and other communication messages between validators, so that there will be no change in the protocol level.
`ShardId` is used by the validators to store and manage states internally.
New values of `ShardId` will be created and assigned to new shards when sharding change is scheduled.
`EpochManager` will be responsible for assigning and managing `ShardId` accross epochs.
It will provide an interface to convert `shard_id` to `epoch_id` and `shard_ord`, and vice versa.

Take the Simple Nightshade migration as an example.
At epoch T-2, there is one shard with `shard_id = 0` and `shard_ord = 0`.
At the end of epoch T-2, the epoch info for epoch T will be created and validators will know that epoch T will use a new sharding assignment that has eight shards.
They then assign `shard_id`s from 1 to 8 to the new shards.
At epoch T-1, on chain there will only be one shard `shard_id = 0`, but the validators can build states for shard 1 to 8.
At epoch T, the new shards will be used, with `shard_ord` from 0 to 7 and `shard_id`s from 1 to 8.

## Build New States
Currently, when receiving the first block of every epoch, validators start downloading states to prepare for the next epoch.
We can modify this existing process to make the validators build states for the new shards after they finish downloading states for the existing shards.
To build the new states, the validator iterates through all accounts in the current states and adds them to the new states one by one.

## Update States
Similar to how validators usually catch up for the next epoch, the new states are updated as new blocks are processed.
The difference is that in epoch T-1, chunks are still sharded by the current sharding assignment, but the validators need to perform updates on the new states.
We cannot simply split transactions and receipts to the new shards and process updates on each new shard separately.
If we do so, since each shard processes transactions and receipts with their own gas limits, some receipts may be delayed in the new states but not in the current states, or the other way around.
That will lead to inconsistencies between the orderings by which transactions and receipts are applied to the current and new states.

For example, for simplicity, assume there is only one shard A in epoch T-1 and there will be two shards B and C in epoch T.
 To process a block in epoch T-1, shard A needs to process receipts 0, 1, .., 99 while in the new sharding assignments receipts 0, 2, …, 98 belong to shard B and receipts 1, 3, …, 99 belong to shard C.
Assume in shard A, the gas limit is hit after receipt 89 is processed, so receipts 90 to 99 are delayed.
To achieve the same processing result, shard B must process receipt 0, 2, …, 88 and delay 90, 92, ..., 98 and shard C must process receipt 1, 3, ..., 89 and delay receipts 91, 93, …, 99.
However, shard B and C have their own gas limits and which receipts will be processed and delayed cannot be guaranteed.

Whether a receipt is processed in a block or delayed can affect the execution result of this receipt because transactions are charged and local receipts are processed before delayed receipts are processed.
For example, let’s assume Alice’s account has 0N now and Bob sends a transaction T1 to transfer 5N to Alice.
The transaction has been converted to a receipt R at block i-1 and sent to Alice's shard at block i.
Let's say Alice signs another transaction T2 to send 1N to Charlie and that transaction is included in block i+1.
Whether transaction T2 succeeds depends on whether receipt R is processed or delayed in block i.
If R is processed in block i, Alice’s account will have 5N before block i+1 and T2 will succeed while if R is delayed in block i, Alice’s account will have 0N and T2 will be declined.

Therefore, the validators must still process transactions and receipts based on the current sharding assignment.
After the processing is finished, they can take the generated state changes to apply to the new states.

# Reference-level explanation
[reference-level-explanation]: #reference-level-explanation
## Sharding Representation
### `ShardOrd`
`ShardOrd` will replace the old `ShardId` in most places, especially in `ShardChunkHeader`.
Note that such change does not require change in the struct version because it is simply a rename of the field.

### `EpochManager`
`EpochManager` will be responsible for managing shards info accross epochs.
#### `from_shard_id_to_ord`
```rust
from_shard_id_to_ord(&self, shard_id: ShardId, current_epoch_id: &EpochId) -> Result<(EpochId, ShardOrd), EpochError>
```
converts `shard_id` to the `shard_ord` and `epoch_id` of a shard.
`current_epoch_id` will be used as the starting search point, the function will only search for epoch T-1, T, T+1 if the current epoch is T.
If it cannot find the `shard_id`, it returns an `EpochError`.
#### `from_shard_ord_to_id`
```rust
from_shard_ord_to_id(&self, shard_ord: ShardOrd, epoch_id: &EpochId) -> Result<ShardId, EpochError>
```
converts `shard_ord` and `epoch_id` for a shard to its `shard_id`.
It returns an EpochError if such shard does not exist.
### EpochInfoV3
Epoch info will include the `shard_id` of the shards in this epoch and a mapping from the current shards to their parent shards.
We only allow adding new shards that are split from the existing shards, and if shard B and C are split from shard A, we call shard A the parent shard of shard B and C.
For example, if epoch T-1 has two shards with `shard_id` 0 and 1 and each of them will be split to two shards in epoch T, then the `EpochInfo` for epoch T will have `shards = [2, 3, 4, 5]` and `parent_shards = {2:0, 3:0, 4:1, 5:1}`.

```rust
pub struct EpochInfoV3 {
    ...
// All fields in EpochInfoV2
    shards: Vec<ShardId>,
    parent_shards: HashMap<ShardId, ShardId>,
}
```

### ShardVersionManager
A new struct `ShardVersionManager` will be created to manage sharding assignment when `ProtocolVersion` is changed.
`EpochManager` will own `ShardVersionManager` that it can call to create shards for the `EpochInfo` of the next next epoch.

#### ShardVersionManager
`ShardVersionManager` replies on some static variables that store the mapping from `ProtocolVersion` to sharding assignments.
Its implementation can be changed easily when a new sharding assignment is added as long as its behavior for the existing protocol versions do not change.
For Simple Nightshade, the following implementation suffices.
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
checks if the given `protocol_version` will trigger a change in sharding.
If so, returns the new shards and a mapping from the current shards to parent shards.
This will be called in `EpochManager::finalize_epoch` when `next_version` is determined.

### ShardTracker
Various functions such as `account_id_to_shard_id` in `ShardTracker` will be changed to incorporate the change in `ShardId`.
New functions such as `account_id_to_shard_ord` can also be added easily if needed.
The `num_shards` field will be removed from `ShardTracker` since it is no longer a static number.
The current shard information can be accessed by the following functions.
These changes will also be propagated to wrapper functions in `RuntimeAdapter` since `ShardTracker` cannot be directly accessed through `RuntimeAdapter`.

#### `get_shards`
```rust
pub fn get_shards() -> Vec<ShardId>
```
returns the `shard_id`s of the shards in the current epoch.

#### `get_shards_next_epoch`
```rust
pub fn get_shards_next_epoch() -> (Vec<ShardId>, HashMap<ShardId, ShardId>)
```
returns the `shard_id`s of the shards in the next epoch and a map from those shards to their parent shards.

## Build New States
The following method in `Client` will be added or modified to split a shard's current state into multiple states.

### `split_shards`
```rust
pub fn split_shards(me: &Option<AccountId>, sync_hash: CryptoHash, shard_id: ShardId)
```
builds states for the new shards that the shard `shard_id` will be split to.
After this function is finished, the states for the new shards should be ready in `ShardTries` to be accessed.

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
`apply_chunks` will be modified so that states of the new shards will be updated when processing chunks.
 In `apply_chunks`, after processing each chunk, the state changes in `apply_results` are sorted into changes to new shards.
At the end, we apply these changes to the new shards.
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
I think garbage collection should mostly work automatically? Need to verify that new ChunkExtra stored for these new shards will be garbage collected correctly.
Otherwise I think it should be fine.

# Drawbacks
[drawbacks]: #drawbacks

The drawback of this approach is that it will not work when challenges are enabled since challenges to the transition to the new states will be too large to construct or verify.
Thus, most of the change will likely be a one time use that only works for the Simple Nightshade transition, although part of the change involing `ShardId` may be reused in the future.

# Rationale and alternatives
[rationale-and-alternatives]: #rationale-and-alternatives
- Why is this design the best in the space of possible designs?
  - It is the best because its implementation is the simplest.
    Considering we want to launch Simple Nightshade as soon as possible by Q4 2021 and we will not enable challenges any time soon, this is the best option we have.
- What other designs have been considered and what is the rationale for not choosing them?
  - We have considered other designs that changes states incrementally and keep state roots on chain to make it compatible with challenges.
However, the implementaion of those approaches are overly complicated and does not fit into our timeline for launching Simple Nightshade.
- What is the impact of not doing this?
  - The impact will be the delay of launching Simple Nightshade, or no launch at all.

# Unresolved questions
[unresolved-questions]: #unresolved-questions
- What parts of the design do you expect to resolve through the NEP process before this gets merged?
  - None. The NEP is quite thorough already.
- What parts of the design do you expect to resolve through the implementation of this feature before stabilization?
  - There might be small changes in the detailed implemenations or specifications of some of the functions described above, but the overall structure will not be changed.
- What related issues do you consider out of scope for this NEP that could be addressed in the future independently of the solution that comes out of this NEP?
  - One issue that is related to this NEP but will be resolved indepdently is how trie nodes are stored in the database.
    Right now, it is a combination of `shard_id` and the node hash.
    Part of the change proposed in this NEP regarding `ShardId` is because of this.
    Plans on how to only store the node hash as keys are being discussed [here](https://github.com/near/nearcore/issues/4527), but it will happen after the Simple Nightshade migration since completely solving the issue will take some careful design and we want to prioritize launching Simple Nightshade for now.

# Future possibilities
[future-possibilities]: #future-possibilities
None
