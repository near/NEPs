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

To enable sharding, specifically, phase 0 of Simple Nightshade, we need to find a way to split the current one shard state into eight shards.

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
This in turn involves two parts, how the validators know when and how sharding changes happen and how they store states of shards from different epochs during the transition.
The former is a protocol change and the latter only affects validators' internal states.

### Protocol Change
Sharding config for an epoch will be encapsulated in a struct `ShardLayout`, which not only contains the number of shards, but also layout information to decide which account ids should be mapped to which shards. 
The `ShardLayout` information will be stored as part of `EpochConfig`. 
Right now, `EpochConfig` is stored in `EpochManager` and remains static accross epochs. 
That will be changed in the new implementation so that `EpochConfig` can be changed according to protocol versions, similar to how `RuntimeConfig` is implemented right now.

The switch to Simple Nightshade will be implemented as a protocol upgrade.
`EpochManager` creates a new `EpochConfig` for each epoch from the protocol version of the epoch.
When the protocol version is large enough and the `SimpleNightShade` feature is enabled, the `EpochConfig` will be use the `ShardLayout` of Simple Nightshade, otherwise it uses the genesis `ShardLayout`.
Since the protocol version and the shard information of epoch T will be determined at the end of epoch T-2, the validators will have time to prepare for states of the new shards during epoch T-1.

Although not ideal, the `ShardLayout` for Simple Nightshade will be added as part of the genesis config in the code.
The genesis config file itself will not be changed, but the field will be set to a default value we specify in the code.
This process is as hacky as it sounds, but currently we have no better way to account for changing protocol config.
To completely solve this issue will be a hard problem by itself, thus we do not try to solve it in this NEP.


We will discuss how the sharding transition will be managed in the next section.

### State Change
In epoch T-1, the validators need to maintain two versions of states for all shards, one for the current epoch, one that is split for the next epoch.
Currently, shards are identified by their `shard_id`, which is a number ranging from `0` to `NUM_SHARDS-1`.`shard_id` is also used as part of the indexing keys by which trie nodes are stored in the database.
However, when shards may change accross epochs, `shard_id` can no longer be used to uniquely identify states because new shards and old shards will share the same `shard_id`s under this representation.

To solve this issue, the new proposal creates a new struct `ShardUId` as an unique identifier to reference shards accross epochs. 
`ShardUId` will only be used for storing and managing states, for example, in `Trie` related structures, 
In most other places in the code, it is clear which epoch the referenced shard belongs, and `ShardId` is enough to identify the shard. 
There will be no change in the protocol level since `ShardId` will continue to be used in protocol level specs.

`ShardUId` contains a version number and the corresponding `shard_id`.
```rust
pub struct ShardUId {
    version: u32,
    shard_id: u32,
}
```
The version number is different between different shard layouts, to ensure `ShardUId`s for shards from different epochs are different.
`EpochManager` will be responsible for managing shard versions and `ShardUId` accross epochs.

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
## Protocol-Level Shard Representation
### `ShardLayout`
```rust
pub enum ShardLayout {
    V0(ShardLayoutV0),
    V1(ShardLayoutV1),
}
```
ShardLayout is a versioned struct that contains all information needed to decide which accounts belong to which shards. Note that `ShardLayout` only contains information at the protocol level, so it uses `ShardOrd` instead of `ShardId`. 

The API contains the following two functions.
#### `get_split_shards`
```
pub fn get_split_shards(&self, parent_shard_id: ShardId) -> Option<&Vec<ShardId>>
```
returns the children shards of shard `parent_shard_id` (we will explain parent-children shards shortly). Note that `parent_shard_id` is a shard from the last ShardLayout, not from `self`. The returned `ShardId` represents shard in the current shard layout.
This information is needed for constructing states for the new shards.

We only allow adding new shards that are split from the existing shards. If shard B and C are split from shard A, we call shard A the parent shard of shard B and C.
For example, if epoch T-1 has a shard layout `shardlayout0` with two shards with `shard_ord` 0 and 1 and each of them will be split to two shards in `shardlayout1` in epoch T, then `shard_layout1.get_split_shards(0)` returns `[0,1]` and `shard_layout.get_split_shards(1)` returns `[2,3]`.
    
#### `version`
```rust
pub fn version(&self) -> ShardVersion
```
returns the version number of this shard layout. This version number is used to create `ShardUId` for shards in this `ShardLayout`. The version numbers must be different for all shard layouts used in the blockchain.

#### `account_id_to_shard_id`
```rust
pub fn account_id_to_shard_id(account_id: &AccountId, shard_layout: ShardLayout) -> ShardId
```
maps account id to shard id given a shard layout

#### `ShardLayoutV0`
```rust
pub struct ShardLayoutV0 {
    /// map accounts evenly accross all shards
    num_shards: NumShards,
}
```
A shard layout that maps accounts evenly accross all shards -- by calculate the hash of account id and mod number of shards. This is added to capture the current `account_id_to_shard_id` algorithm, to keep backward compatibility for some existing tests. `parent_shards` for `ShardLayoutV1` is always `None` and `version`is always `0`.

#### `ShardLayoutV1`
```rust
pub struct ShardLayoutV1 {
    /// num_shards = fixed_shards.len() + boundary_accounts.len() + 1
    /// Each account and all subaccounts map to the shard of position in this array.
    fixed_shards: Vec<AccountId>,
    /// The rest are divided by boundary_accounts to ranges, each range is mapped to a shard
    boundary_accounts: Vec<AccountId>,
    /// Parent shards for the shards, useful for constructing states for the shards.
    /// None for the genesis shard layout
    parent_shards: Option<Vec<ShardId>>,
    /// Version of the shard layout, useful to uniquely identify the shard layout
    version: ShardVersion,
}
```
A shard layout that consists some fixed shards each of which is mapped to a fixed account and other shards which are mapped to ranges of accounts. This will be the ShardLayout used by Simple Nightshade.

### `EpochConfig`
`EpochConfig` will contain the shard layout for the given epoch.

```rust
pub struct EpochConfig {
    // existing fields
    ...
    /// Shard layout of this epoch, may change from epoch to epoch
    pub shard_layout: ShardLayout,
```
### `AllEpochConfig`
`AllEpochConfig` stores a mapping from protocol versions to `EpochConfig`s. `EpochConfig` for a particular epoch can be retrieved from `AllEpochConfig`, given the protocol version of the epoch. For SimpleNightshade migration, it only needs to contain two configs. `AllEpochConfig` will be stored inside `EpochManager` to be used to construct `EpochConfig` for different epochs.

```rust
pub struct AllEpochConfig {
    genesis_epoch_config: Arc<EpochConfig>,
    simple_nightshade_epoch_config: Arc<EpochConfig>,
}
```
#### `for_protocol_version`
```rust
pub fn for_protocol_version(&self, protocol_version: ProtocolVersion) -> &Arc<EpochConfig>
```
returns `EpochConfig` according to the given protocol version. `EpochManager` will call this function for every new epoch.

### `EpochManager`
`EpochManager` will be responsible for managing `ShardLayout` accross epochs. As we mentioned, `EpochManager` stores an instance of `AllEpochConfig`, so it can returns the `ShardLayout` for each epoch. 

####  `get_shard_layout`
```rust
pub fn get_shard_layout(&mut self, epoch_id: &EpochId) -> Result<&ShardLayout, EpochError> 
```

## Internal Shard Representation in Validators' State
### `ShardUId`
`ShardUId` is a unique identifier that a validator uses internally to identify shards from all epochs. It only exists inside a validator's internal state and can be different among validators, thus it should never be exposed to outside APIs.

```rust
pub struct ShardUId {
    pub version: ShardVersion,
    pub shard_id: u32,
}
```

`version` in `ShardUId` comes from the version of `ShardLayout` that this shard belongs. This way, different shards from different shard layout will have different `ShardUId`s.

### Database storage
The following database columns are stored with `ShardId` as part of the database key, it will be replaced by `ShardUId`
- ColState
- ColChunkExtra
- ColTrieChanges

#### `TrieCachingStorage`
Trie storage will contruct database key from `ShardUId` and hash of the trie node.
##### `get_shard_uid_and_hash_from_key`
```rust
fn get_shard_uid_and_hash_from_key(key: &[u8]) -> Result<(ShardUId, CryptoHash), std::io::Error>
```
##### `get_key_from_shard_uid_and_hash`
```rust
fn get_key_from_shard_uid_and_hash(shard_uid: ShardUId, hash: &CryptoHash) -> [u8; 40]
```


## Build New States
The following method in `Chain` will be added or modified to split a shard's current state into multiple states.

### `build_state_for_split_shards`
```rust
pub fn build_state_for_split_shards(&mut self, sync_hash: &CryptoHash, shard_id: ShardId) -> Result<(), Error>
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
splits state changes to be made to a current shard to changes that should be applid to the new shards. Note that this function call can take a long time. To avoid blocking the client actor from processing and producing blocks for the current epoch, it should be called from a separate thread. Unfortunately, as of now, catching up states and catching up blocks are both run in client actor. They should be moved to a separate actor. However, that can be a separate project, although this NEP will depend on that project. In fact, the issue has already been discussed in [#3201](https://github.com/near/nearcore/issues/3201).

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

## Garbage Collection
The old states need to be garbage collected after the resharding finishes. The garbage collection algorithm today won't automatically handle that. (#TODO: why?)

Although we need to handle garbage collection eventually, it is not a pressing issue. Thus, we leave the discussion from this NEP for now and will add a detailed plan later.

# Drawbacks
[drawbacks]: #drawbacks

The drawback of this approach is that it will not work when challenges are enabled since challenges to the transition to the new states will be too large to construct or verify.
Thus, most of the change will likely be a one time use that only works for the Simple Nightshade transition, although part of the change involving `ShardId` may be reused in the future.

# Rationale and alternatives
[rationale-and-alternatives]: #rationale-and-alternatives
- Why is this design the best in the space of possible designs?
  - It is the best because its implementation is the simplest.
    Considering we want to launch Simple Nightshade as soon as possible by Q4 2021 and we will not enable challenges any time soon, this is the best option we have.
- What other designs have been considered and what is the rationale for not choosing them?
  - We have considered other designs that change states incrementally and keep state roots on chain to make it compatible with challenges.
However, the implementation of those approaches are overly complicated and does not fit into our timeline for launching Simple Nightshade.
- What is the impact of not doing this?
  - The impact will be the delay of launching Simple Nightshade, or no launch at all.

# Unresolved questions
[unresolved-questions]: #unresolved-questions
- What parts of the design do you expect to resolve through the NEP process before this gets merged?
  - Garbage collection
  - State Sync?
- What parts of the design do you expect to resolve through the implementation of this feature before stabilization?
  - There might be small changes in the detailed implementations or specifications of some of the functions described above, but the overall structure will not be changed.
- What related issues do you consider out of scope for this NEP that could be addressed in the future independently of the solution that comes out of this NEP?
  - One issue that is related to this NEP but will be resolved indepdently is how trie nodes are stored in the database.
    Right now, it is a combination of `shard_id` and the node hash.
    Part of the change proposed in this NEP regarding `ShardId` is because of this.
    Plans on how to only store the node hash as keys are being discussed [here](https://github.com/near/nearcore/issues/4527), but it will happen after the Simple Nightshade migration since completely solving the issue will take some careful design and we want to prioritize launching Simple Nightshade for now.
  - Another issue that is not part of this NEP but must be solved for this NEP to work is to move expensive computation related to state sync / catch up into a separate actor [#3201](https://github.com/near/nearcore/issues/3201).
  - Lastly, we should also build a better mechanism to deal with changing protocol config. The current way of putting changing protocol config in the genesis config and changing how the genesis config file is parsed is not a long term solution.

# Future possibilities
[future-possibilities]: #future-possibilities
## Extension
In the future, when challenges are enabled, resharding and state upgrade should be implemented on-chain.
## Affected Projects
- 
## Pre-mortem
- Building and catching up new states takes longer than one epoch to finish.
- Protocol version switched back to pre simple nightshade
- Validators cannot track shards properly after resharding
- Genesis State
- Must load the correct `shard_version`
- ShardTracker?
