---
NEP: 0605
Title: Sharded Contracts
Authors: Akhi Singhania <akhi3030@gmail.com>; Jakob Meier <jakob@nearone.org>
Status: Draft
DiscussionsTo: https://github.com/nearprotocol/neps/pull/0000
Type: Protocol
Version: 0.0.0
Created: 2025-04-07
LastUpdated: 2025-07-11
---

## Summary

Today, a single contract is limited to the transactions per second throughput (TPS) of a single a shard, therefore a contract already at the TPS limit of a single shard cannot benefit from increase in TPS made possible by increasing the number of shards.  This NEP builds on top of the global contracts NEP-591 and adds the necessary tools to enable sharded contracts.

A sharded contract spreads its state across shards of accounts that use it, rather than storing the entire state in a single shard. This becomes possible to implement securely once users can have multiple isolated subcontracts in one account that are guaranteed to run the same sharded contract code.

With that, sharded contracts are able to seamlessly scale to use the entire TPS capacity of the network.


## Motivation

As a single contract is deployed on a single shard, the maximum TPS that it can have is the maximum TPS of the single shard.  Horizontally scaling (i.e. increasing the number of shards) a blockchain is easier than vertically scaling (i.e. increasing the TPS of a single shard).  Once, all the software bottlenecks are addressed, the only way to vertically scale a shard is by requiring the validators to use faster machines.  Faster machines are more expensive and thereby hurts decentralisation.

Vertical scaling opportunities are limited, imposing a hard upper limit on the throughput of a single-shard contract. This limit remains an issue for the contract regardless of how many shards are added to the network. This is especially true with today's protocol; options to spread state across multiple shards (i.e. to scale horizontally) are very limited.

1. One could deploy multiple worker contracts on different accounts to benefit from multi-shard throughput.  In that case, developers need an off-chain load-balancing solution to distribute users among the workers.  Workers among themselves need to communicate with cross-contract function calls to execute any operation that involves user state from two different user groups.
2. State could also be stored on every user account, which needs to run the shared contract code.  Global contracts NEP-591 makes this economically feasible.  However, this means one account can only use one contract.  For example, if the accounts holds an FT that's sharded in this way, the user cannot buy an NFT and hold it on the same account.

Neither of these architectures is satisfying.

This NEP proposes solving this problem by introducing new protocol level primitives which are necessary to get around these limitations.

Discussion https://github.com/near/NEPs/issues/614 has a concrete example of how to implement a sharded FT contract using the proposed changes.


## Specification


### Subcontracts

A *subcontract* is an isolated module inside an account.  Aside from the main contract, an account can have up to `N` subcontracts deployed, each with separate code and state.


### Contract Context

Every subcontract is created inside a certain *context*.  Contexts are defined by a pair of an account id and a contract context.  The main contract uses the root context, while subcontracts have to use a different context.

This NEP introduces three contexts:

- `Root` - Runs the code deployed directly on the account. Reserved is for the main contract, which is technically not a *subcontract*.
- `ShardedByAccountId { account_id: AccountId }` - Runs code deployed globally under the given account id.
- `ShardedByCodeHash { code_hash: CryptoHash }` - Runs code deployed globally under the given code hash.

For sharded contexts, the code is implicitly defined by the context fields. An account can use any global contract as a sharded contract, even if doing so was not intended by the smart contract developer.  We do not see any security concerns with allowing this.

While not necessary for sharded contracts, this design leaves the door open to add more contexts in the future.  A future proposal could add a way to deploy multiple local modules without the need to deploy the code globally first.  For example, using a context like `LocalSubcontract { module_name: String }`.  The code for such a subcontract could be deployed using `DeployContractAction` inside the context.


### Isolation Requirements

This proposal allows holding multiple subcontracts in the same account.  But if every subcontract has the same tools available as the main contract, this makes building secure sharded contracts difficult if not impossible.

A bit of necessary background.  Code running inside the main contract has full access on the account.  It can, among other things, send all tokens to an arbitrary address, delete itself, or even redeploy its own code.  The limitations are only set by the source code of the contract.  This makes sense if users only deploy code to their account that they have either written themselves or vetted thoroughly.

With the introduction of sharded contracts, users will deploy **untrusted** subcontracts on their account on a regular basis.  For example, receiving an FT requires installing the corresponding subcontract on the user account.  It is not feasible to assume users vet the code of every meme coin they get airdropped.  Therefore, the first isolation requirement is that the permissions of subcontracts can be limited.

On the flip side, contract developers will store critical state inside the subcontracts context, such as the user's own balance of a token, or their liabilities.  Therefore this state must be tamper-proof.  Not even a full access key to the account should allow modifying this state.  This includes the ability to delete the subcontract state, which also must be limited.

The next sections explain different isolation requirements in more detail.


#### Basic state isolation

Each (sub)contract context has its own namespaced storage.  Only code running in the exact same context can access this state.

This protects different subcontracts and the main contract from each other.

Further, this means the limits of what can be done to a subcontract's state is defined in the source code of the subcontract.  With the sharded contexts, this code is controlled by the developer who deploys the code globally.  Hence, the state is protected from the user tampering with the state, too.

Deleting subcontracts is forbidden, to completely shut off state tampering.


#### Subcontract Permissions

Most subcontracts only need to access their own state and make calls to other subcontracts on other users.  However, it would be too limiting to disallow all other actions entirely.  We propose a binary permission system, akin to how access keys in NEAR Protocol work today.

- `FullAccess` - A subcontract with this permission has the same capabilities as the main contract.
- `Limited` - A subcontract with this permission is forbidden to use most actions in outgoing receipts.  Only function calls to non-root contexts are allowed.  No NEAR balance can be attached to outgoing calls.

The idea is that `FullAccess` subcontracts are only deployed when users have either written the code themselves or it comes from a highly trusted source.  `Limited` subcontracts, on the other hand, can be deployed even from untrusted sources, without security concerns.

Note that regardless of the permissions, basic state isolation still holds.


#### Cross-Contract Call Authorization

Today, for cross contract calls, the `predecessor_id` is used for authorization in the receiver's code.

With this proposal, subcontracts making cross-contract calls will have the same `predecessor_id` as calls from the main contract on the same account.  However, this should not allow to act on behalf of the main account on other contracts.  The perfect example is an existing FT contract.  A limited subcontract must be prevented from calling `ft_transfer` on a `usdt.tether-token.near`, for example.

For new code that is aware of subcontracts, we propose a new host function `predecessor_context()`.  (Exact definition in the detailed specification section.)  If this is not the root context, the call comes from a subcontract and should not have access to NEP-141 fungible tokens.

Crucially, however, contracts deployed prior to the introduction of contract contexts did not check the predecessor's context.  Therefore, the proposal disallows calling root contracts from a limited permission subcontract. Restricting calls to non-root contexts is considered safe because they can only be deployed after the introduction of contexts.

In combination with `current_context()`, contracts can also check if the call came from a subcontract using the same global code.  This is useful for calls withing a sharded contract across different users.


#### Balance Isolation

We did not find conclusive requirements on whether a subcontract needs an isolated balance or not.  The only requirement is that a limited context can not access the main balance of the account.

As described in specification below, we decided to forbid all balance access to limited-access subcontract, while giving access to the main account balance to any subcontract with full access.


#### Isolation of Storage limits

Subcontracts require storage for their context meta data, as well as for the namespaced state modified by WASM code.  How exactly this is paid for is not essential for the core functionality of sharded contracts.  After considering different options, we propose to use a non-refundable storage model, where tokens to cover storage are permanently burnt.

This is in contracts to existing (main) accounts.  They initially did not burn anything. Instead, they must always hold a certain amount in NEAR balance to cover their storage cost.  However, this came with the problem of refund attacks on sponsored account creation.  Therefore, a zero-balance account (ZBA) limit of 770 bytes per account was introduced in #448.  This makes every account burn enough tokens to cover 770 bytes upon creation.  The refundable storage model is only applied to accounts that use more than that limit.

The theoretical benefit of the refundable storage model is that upon deletion of the account, the user can get a refund of the tokens that were locked for storage.  However, in practice, deleting accounts is rarely done and the absolute value per account is often too low to justify any effort to collect the refund.

The way subcontracts work, all storage uses the non-refundable model.  Unlike the ZBA limit, the exact amount is dynamic.  Anyone interacting with the subcontract can also fund it with more storage capacity, permanently increasing the allowance of a specific subcontract.  Usage and allowance is tracked for each subcontract individually.


### Practical Considerations

Aside from the isolation requirements described above, there are a couple additional things needed to make sharded contracts work smoothly.


#### Guaranteeing the Existence of the Receiver

We propose that any subcontract to subcontract call can opt-in to pay for the subcontract creation (with limited access) if the receiver account exists but the subcontract has not been created, yet.

Without this, imagine a user wants to transfer an amount of FT from a centralized exchange to their self-custody near account.  This user would have to manually enable the token on their account, after they created the account.  This is not intuitive and not how FT's work today. Not on NEAR Protocol, nor on other popular chains.

With the proposed opt-in lazy subcontract creation, an exchange can first try sending tokens the cheap way (no lazy creation)  If that fails they can repeat the same call but opt-in this time and pay the increased gas cost to cover the subcontract creation.


### Detailed Specification

With the high level motivation and requirements above, we can describe the exact code changes.


#### Context Permission Details

The `SetSubcontractPermissionAction` action is used to set and update the permissions.  It will insert or update the permission on the user's state trie for the specific subcontract.

Only the account owner can set permissions.  Specifically, `SetSubcontractPermissionAction` execution will fail if the `predecessor_id` is not equal to `current_id` or if it does not execute in the Root context.

A successful `SetSubcontractPermissionAction` execution on a subcontract that does not exist will create the subcontract implicitly and pay for exactly as many bytes of storages as necessary.

```rust
struct SetSubcontractPermissionAction {
    pub context: ContractContext,
    pub permission: SubcontractPermission,
}

enum ContractContext {
    /// The root context is the default context, used when running in the main
    /// namespace of an account.
    Root,
    /// Running under a sharded contract context, defined by a globally deployed
    /// code by account id.
    ShardedByAccountId { account_id: AccountId },
    /// Running under a sharded contract context, defined by a globally deployed
    /// code by code hash.
    ShardedByCodeHash { code_hash: CryptoHash },
}

enum SubcontractPermission {
    FullAccess,
    Limited,
}
```

The detailed rules for permissions are:

- A contract deployed with `FullAccess` permissions can do anything the main account can do.  This includes all actions, without additional limits.  Tokens attached to a function call or in a `TransferAction` are taken from the main account's balance.
- A contract deployed with `Limited` access can only produce outgoing receipts with `FunctionCallAction` and `SwitchContextAction`.
  - Any `FunctionCallAction` must be in a non-root context.
- A contract deployed with `Limited` access cannot attach deposits to a `FunctionCallAction`.
- Any attempt to create invalid outgoing receipts will abort the receipt execution with a `SubcontractNoPermission` error.
- `SetSubcontractPermissionAction` can only be called by the account owner.  (Must be in `Root` context)
- Storage limits are isolated regardless of the permissions.
- Storage access is isolated regardless of the permissions.

The gas costs for `SetSubcontractPermissionAction` are defined as follows.

```yaml
action_set_subcontract_permission
- send_sir:           30_000_000_000
- send_not_sir:       30_000_000_000
- execution:         200_000_000_000
```

Reasoning: The main work performed for the action is an update to the subcontract's meta data in the state trie.  The estimated compute work for updating a trie value from WASM is currently [200 GGas](https://github.com/near/nearcore/blob/7a86486f290f997030b04bebd4028e120c59a1d5/core/parameters/res/runtime_configs/parameters.snap#L115).  The suggestion is to use the same value for the execution cost of `SetSubcontractPermissionAction`.

The send cost is almost negligible in terms of computational work required.  However, there is bandwidth cost of 70 bytes (69 bytes for `ContractContext::ShardedByAccountId` and 1 byte for `SubcontractPermission`).  Other per-byte send costs are between [1.9 MGas](https://github.com/near/nearcore/blob/7a86486f290f997030b04bebd4028e120c59a1d5/core/parameters/res/runtime_configs/parameters.snap#L74) and [47.6 MGas](https://github.com/near/nearcore/blob/7a86486f290f997030b04bebd4028e120c59a1d5/core/parameters/res/runtime_configs/parameters.snap#L31).  Taking the upper end, the send gas cost for a `SetSubcontractPermissionAction` should be around 3.3 GGas.  To allow increases in `ContractContext` enum variant sizes, we propose to use around 10 times this minimum value.  That's why we propose a send cost of 30 GGas.


#### Contract Context Switching

Switching contract context is done with `SwitchContextAction`.  All actions within the same receipt but before the next `SwitchContextAction` will execute in the set context.

```rust
struct SwitchContextAction {
    caller: ContractContext,
    target: ContractContext,
    create_missing_subcontract: bool,
    added_storage_balance: Balance,
}
```

For example, the combined actions below make a call to the subcontract running `ft.near`'s global code inside `alice.near`'s account.


```rust
// receipt receiver = "alice.near"
[
    SwitchContextAction {
        caller: ContractContext::Root,
        target: ContractContext::ShardedByAccountId { account_id: "ft.near" },
        create_missing_subcontract: false,
        added_storage_balance: 0,
    }
    FunctionCallAction { ... }
] 
```

The called contract can use the `current_context()` host function to read the own contract context (`target`) and the `predecessor_context()` host function to read the calling contract's context (`caller`).  The only reason why `caller` exists on `SwitchContextAction` is to enable this host functions.  Outgoing receipt validation must ensure the caller is correct.

The rules for using `SwitchContextAction` are:

- Receipts created from a transaction must always set `caller = ContractContext::Root`.
- Receipts created from a sharded contract must always set `caller = ContractContext::ShardedBy*` with their respective code id.
- Any context can be entered without special permissions.
- Anyone can create any subcontract on any account by setting `create_missing_subcontract` to true.  (See [Implicit Subcontract Creation](#implicit-subcontract-creation))
- `SwitchContextAction` will fail if the subcontract does not exist and `create_missing_subcontract` is set to false.


The rules inside a sharded context are:

- Inside a `ContractContext::ShardedBy*` context with limited permissions, the only allowed actions are `FunctionCallAction`, `SwitchContextAction`.
- Inside a `ContractContext::ShardedBy*` context with limited permissions, `SwitchContextAction` cannot target a `Root` context.  (This is to prevent calling context-unaware contracts from a sharded context. Those contracts only check predecessor_id and generally assume the caller has full access on that account.)
- No limitations apply inside a `ContractContext::ShardedBy*` context with `FullAccess` permission.

The gas costs for `SwitchContextAction` are defined as follows.

```yaml
action_switch_context
- send_sir:           70_000_000_000
- send_not_sir:       70_000_000_000
- execution:         200_000_000_000
```

The costs following a similar reasoning to `SetSubcontractPermissionAction`'s costs.

For execution, again the cost is dominated by the reading and potentially updating of a trie value.  When `create_missing_subcontract` is `false` and `added_storage_balance` is zero, then there might not be an update caused by this action directly.  But the following function calls can update the storage usage, which will cause a write to the subcontract metadata.  Therefore, the action always charges for an update, which is currently estimated at [200 GGas](https://github.com/near/nearcore/blob/7a86486f290f997030b04bebd4028e120c59a1d5/core/parameters/res/runtime_configs/parameters.snap#L115).

The sender cost is again dominated by the bandwidth requirement.  The size of a `SwitchContextAction` is 2x `size_of(ContractContext)` + `size_of(bool)` + `size_of(u128)`.  `ContractContext`'s largest variant is `ContractContext::ShardedByAccountId` which is 69 bytes in borsh encoding.  In total that makes 2 x 69 + 1 + 16 = 155 bytes.  Keeping the same per-byte cost used in `SetSubcontractPermissionAction`, we get out a sender cost of 70 GGas.

In total, a sharded contract call costs 0.27 TGas extra compared to a non-sharded call.  The base cost for a function call today is about 1.2 TGas.  This makes a sharded call 22.5% more expensive to initiate, while the dynamic WASM execution costs stay the same.

Note that this does not include storage costs that callers can choose to add.  Those are paid in Near native tokens, not in gas.  But for example, to cover for 200 bytes of storage, an extra cost of 0.0002 Near has to be paid, which is 2 Tgas at the gas floor price.


#### Implicit Subcontract Creation

There is no explicit action to create a subcontract.  Instead, there are two ways of creating them implicitly.

Setting the permissions of a subcontract using `SetSubcontractPermissionAction` will also create the subcontract and burn NEAR token of the main account to cover for the storage requirements of the created subcontract.  This works by first creating the subcontract and then burning the required balance to increase the allowance to exactly the usage.  If the balance is not enough, the receipt fails with a `LackBalanceForState` error and reverts the subcontract creation.

The other option is to use `SwitchContextAction` with `create_missing_subcontract: true`.  In this case, the `added_storage_balance` amount needs to be estimated to a value high enough that it will cover the storage.  The entire cost for gas and storage allowance will be paid when the action is created on the caller side.

The initial permissions for accounts created with `SwitchContextAction` are `Limited`.  Only the account owner can change it using `SetSubcontractPermissionAction`.

The gas cost for `SwitchContextAction` with `create_missing_subcontract: true` will be higher than when it is set to false.  The more significant cost, however, comes from `added_storage_balance`.  Even if the subcontract already existed, the extra cost will not be refunded.


#### Trie Changes

We add two new trie columns.

```rust
enum TrieKey{
    //...

    /// Stores permissions and other meta data for subcontracts.
    /// Values are of type `Subcontract`.
    Subcontract {
        account_id: AccountId,
        context: ContractContext,
    },

    /// Like `ContractData` but for subcontracts.
    /// Stores a key-value record `Vec<u8>` within a subcontract deployed on a
    /// given `AccountId`, `ContractContext`, and a given key.
    SubcontractData {
        account_id: AccountId,
        context: ContractContext,
        key: Vec<u8>,
    },
}
```

The first stores the meta data per subcontract in a `Subcontract` struct.

```rust
enum Subcontract {
    V1(SubcontractV1),
}

struct SubcontractV1 {
    /// Defines what a subcontract can do on the account in which it has been deployed.
    pub permission: SubcontractPermission,
    /// Number of bytes used in the trie for storing this subcontract.
    pub storage_usage: StorageUsage,
    /// Amount of NEAR tokens that have been burnt for storage of this subcontract.
    pub storage_allowance: Balance,
}
```

The other holds key value pairs, just like `ContractData` does but in a different namespace.


#### Storage namespace

Entering a context changes how `storage_write()` and `storage_read()` construct a trie key.

Before:

```rust
    pub fn create_storage_key(&self, key: &[u8]) -> TrieKey {
        TrieKey::ContractData { account_id: self.account_id.clone(), key: key.to_vec() }
    }
```

After:

```rust
    pub fn create_storage_key(&self, key: &[u8]) -> TrieKey {
        match &self.contract_context {
            ContractContext::Root => {
                TrieKey::ContractData { account_id: self.account_id.clone(), key: key.to_vec() }
            }
            other_context => TrieKey::SubcontractData {
                account_id: self.account_id.clone(),
                context: other_context.clone(),
                key: key.to_vec(),
            },
        }
    }
```

#### Storage Limits

The storage limit is enforced individually for each subcontract, regardless of the permission level.  The subcontract storage does not change the main account storage usage nor the amount locked for storage staking.

To enforce the limit, both the current usage and the allowance are tracked in the new trie column `Subcontract` (see [Trie Changes](#trie-changes)).

The allowance can only be increased, never decreased or reset.  Adding is done through the `SwitchContextAction` with the `added_storage_balance` field.  The caller pays the balance, which is burnt on the receiver to permanently increase the `storage_allowance` of the subcontract.

The maximum allowed storage in bytes is calculated as:

```rust
let max_bytes = storage_allowance / nonrefundable_storage_amount_per_byte;
```

We define `nonrefundable_storage_amount_per_byte = 10e18`.  This is 10x less than `storage_amount_per_byte` and is the same number that was used for zero balance accounts ([See here](https://github.com/near/NEPs/blob/a43e4e461dfaa4d24962a043c15e66f5f459e887/neps/nep-0448.md?plain=1#L53-L58)).  It means 1 Near can purchase 1 MB of permanent storage.

The minimal bytes required to store a subcontract depends on the account id in the context.  

Going over the limit will abort the sharded function call.


#### Deleting an Account with Sharded Contracts

Deleting an account with at least one sharded contracts is not allowed.  This proposal adds no way to remove sharded contracts from an account.


#### Limit on contracts per account

We allow at most 100 contracts per account, to avoid the state of a single account to grow larger than what a single shard can maintain.  (We assume all contracts under the same account will always stay on the same shard.)

To track this, we add a field to the account structure in the state trie.

```diff
- pub struct AccountV2 {
+ pub struct AccountV3 {
      /// The total not locked tokens.
      amount: Balance,
      /// The amount locked due to staking.
      locked: Balance,
      /// Storage used by the given account, includes account id, this struct, access keys and other data.
      storage_usage: StorageUsage,
      /// Type of contract deployed to this account, if any.
      contract: AccountContract,
+     /// How many contracts the account has stored besides the root contract.
+     subcontracts_count: u32,
  }
```

#### New Host Functions

```rust
    /// Saves the current sharded contract context into the register.
    ///
    /// Returns a `u64` indicating the type of context.
    ///
    /// 0: ContractContext::Root
    /// 1: ContractContext::ShardedByAccountId, the register contains an `AccountId`
    /// 2: ContractContext::ShardedByCodeHash, the register contain a `CryptoHash`
    ///
    /// # Errors
    ///
    /// If the registers exceed the memory limit returns `MemoryAccessViolation`.
    ///
    /// # Cost
    ///
    /// `base + write_register_base + write_register_byte * num_bytes`
    pub fn current_sharded_context(&mut self, register_id: u64) -> Result<u64>;

    /// Saves the predecessor sharded contract context into the register.
    ///
    /// Returns a `u64` indicating the type of context.
    ///
    /// 0: ContractContext::Root
    /// 1: ContractContext::ShardedByAccountId, the register contains an `AccountId`
    /// 2: ContractContext::ShardedByCodeHash, the register contain a `CryptoHash`
    ///
    /// # Errors
    ///
    /// If the registers exceed the memory limit returns `MemoryAccessViolation`.
    ///
    /// # Cost
    ///
    /// `base + write_register_base + write_register_byte * num_bytes`
    pub fn predecessor_sharded_context(&mut self, register_id: u64) -> Result<u64>;

    /// Appends `SwitchContext` action to the batch of actions for the given
    /// promise pointed by `promise_idx`.
    ///
    /// `target_context_type` is a `u64` indicating the type of context that's
    /// represented by the data pointed to by `target_context_len` and
    /// `target_context_ptr`.
    ///
    /// 0: ContractContext::Root
    /// 1: ContractContext::ShardedByAccountId, the register contains an `AccountId`
    /// 2: ContractContext::ShardedByCodeHash, the register contain a `CryptoHash`
    ///
    /// Unless the type is `Root`, the last two fields point to the data. This
    /// can be in memory, or in a register.
    ///
    /// If the data is in memory, set `target_context_len` to data length
    /// measured in bytes and `target_context_ptr` to the raw pointer in guest
    /// memory space of the data.
    ///
    /// If the data is in a register, set `target_context_len = u64::MAX` and
    /// `target_context_ptr = register_id`.
    ///
    /// If `create_missing_subcontract` is set to true, the subcontract will be
    /// initialized on the target account with limited access permissions, if it
    /// doesn't already exist. This increases the gas cost of the action to
    /// cover the module creation, storage, and deletion cost.
    ///
    /// The amount specified in `added_storage_balance` gets added to the
    /// receiving subcontract's storage allowance.  It must be 0 if the target
    /// context is Root.
    /// 
    /// # Errors
    ///
    /// * If `promise_idx` does not correspond to an existing promise returns
    ///   `InvalidPromiseIndex`.
    /// * If the promise pointed by the `promise_idx` is an ephemeral promise
    ///   created by `promise_and` returns `CannotAppendActionToJointPromise`.
    /// * If `target_context_type` is not 0, 1, or 2 returns
    ///   `InvalidContractContext`.
    /// * If `target_context_type` is 1 and the data at `target_context_ptr` +
    ///   `target_context_len` does not parse as `AccountId` , returns
    ///   `InvalidAccountId`.
    /// * If `target_context_type` is 2 and the data at `target_context_ptr` +
    ///   `target_context_len` is not a valid `CryptoHash`, returns
    ///   `ContractCodeHashMalformed`.
    /// * If `target_context_type` is 0 (Root) and `added_storage_balance` is
    ///   not 0, returns `CannotAddStorageToRoot`.
    /// * If called as view function returns `ProhibitedInView`.
    ///
    /// # Cost
    ///
    /// `burnt_gas :=
    ///      base 
    ///      + send action base fee 
    ///      + cost of reading and parsing context from memory or register
    ///      + cost of reading `u128` from memory
    ///      + cost of reading `bool` from memory
    /// `used_gas := burnt_gas + exec action base fee
    pub fn promise_batch_action_switch_context(
        &mut self,
        promise_idx: u64,
        target_context_type: u64,
        target_context_len: u64,
        target_context_ptr: u64,
        create_missing_subcontract: bool,
        added_storage_balance: u128,
    ) -> Result<()>;


    /// Appends `SetSubcontractPermissionAction` to the batch of actions for the
    /// given promise pointed by `promise_idx`.
    ///
    /// `permission` can be set to 0 for full access, or 1 for limited access.
    /// 
    /// `context_type` is a `u64` indicating the type of context that's
    /// represented by the data pointed to by `context_len` and `context_ptr`.
    ///
    /// 0: ContractContext::Root
    /// 1: ContractContext::ShardedByAccountId, the register contains an `AccountId`
    /// 2: ContractContext::ShardedByCodeHash, the register contain a `CryptoHash`
    ///
    /// Unless the type is `Root`, the last two fields point to the data. This
    /// can be in memory, or in a register.
    ///
    /// If the data is in memory, set `context_len` to data length measured in
    /// bytes and `context_ptr` to the raw pointer in guest memory space of the
    /// data.
    ///
    /// If the data is in a register, set `context_len = u64::MAX` and
    /// `context_ptr = register_id`.
    ///
    /// # Errors
    ///
    /// * If `promise_idx` does not correspond to an existing promise returns
    ///   `InvalidPromiseIndex`.
    /// * If the promise pointed by the `promise_idx` is an ephemeral promise
    ///   created by `promise_and` returns `CannotAppendActionToJointPromise`.
    /// * If `context_type` is not 0, 1, or 2 returns `InvalidContractContext`.
    /// * If `context_type` is 1 and the data at `context_ptr` + `context_len`
    ///   does not parse as `AccountId`, returns `InvalidAccountId`.
    /// * If `context_type` is 2 and the data at `context_ptr` + `context_len`
    ///   is not a valid `CryptoHash`, returns `ContractCodeHashMalformed`.
    /// * If called as view function returns `ProhibitedInView`.
    ///
    /// # Cost
    ///
    /// `burnt_gas := base + send action base fee + cost of reading and parsing context from memory or register
    /// `used_gas := burnt_gas + exec action base fee
    pub fn promise_batch_action_set_subcontract_permission(
        &mut self,
        promise_idx: u64,
        permission: u64,
        context_type: u64,
        context_len: u64,
        context_ptr: u64,
    ) -> Result<()>;
```


#### Changes to Existing Host Functions

- `storage_usage()` in any subcontract will return the storage usage of just subcontract, without the main account.
- `storage_usage()` in the main account will include the storage usage of all subcontracts usage above their respective ZBA limit.
- `account_balance()` in a limited access subcontract will always return 0.
- `account_locked_balance()` in a limited access subcontract will always return 0.


## Usage Guide

Below are additional explanations on how sharded contracts can be built using the changes proposed in this NEP.


### Basic Usage

#### Create a Limited Access subcontract

Creating a limited access submodule can be done in on of two ways.  Both examples below will use the global contract code deployed by `ft.near` and give it limited permissions.

```rust
// receipt predecessor = "alice.near"
// receipt receiver = "alice.near"
[
    SetSubcontractPermissionAction {
        context: ContractContext::ShardedByAccountId { account_id: "ft.near" },
        permission: SubcontractPermission::Limited,
    }
] 
```

```rust
// receipt predecessor = *
// receipt receiver = "alice.near"
[
    SwitchContextAction {
        caller: ContractContext::Root,
        target: ContractContext::ShardedByAccountId { account_id: "ft.near" },
        create_missing_subcontract: true,
        // pick a number that's high enough to cover the initial storage cost
        added_storage_balance: 300,
    }
] 
```

#### Create a Full Access subcontract

Deploying a subcontract with full access must be done by the contract owner with `SetSubcontractPermissionAction`.

```rust
// receipt predecessor = "alice.near"
// receipt receiver = "alice.near"
[
    SetSubcontractPermissionAction {
        context: ContractContext::ShardedByAccountId { account_id: "ft.near" },
        permission: SubcontractPermission::Limited,
    }
] 
```

For completeness: Deploying as limited access contract first and upgrading permissions later is also possible.


#### Call a subcontract method

Calling a method on subcontract requires the combination of `SwitchContextAction` with a `FunctionCallAction`.

```rust
// receipt predecessor = *
// receipt receiver = "alice.near"
[
    SwitchContextAction {
        caller: ContractContext::Root,
        target: ContractContext::ShardedByAccountId { account_id: "ft.near" },
        create_missing_subcontract: false,
        added_storage_balance: 0,
    }
    FunctionCallAction { ... }
] 
```


### Access Control


#### Access Keys

All sharded contracts and the parent account share the same set of `AccessKey`s.

If a sharded contract needs to limit access further, it can do so in WASM code, using the new host functions to check if incoming calls are from a sharded contract.


#### Function Calls from Sharded Contracts

Sharded contracts can be used in two ways:

- Full access: Outgoing function calls can look just like they come from the main account, hence they can move assets held on other contracts.
- Limited: No "normal" function calls are allowed, only sharded function calls are possible.

Any receiver of sharded function calls must check the `predecessor_id` + `predecessor_context` combination for authorization.  This only affects code deployed as sharded contracts.

Already deployed code on chain today need no update if they do not use sharded contracts.

If a limited sharded contracts needs to call a non-sharded contract, it always has to go through a full access sharded contract.  The full access contract used to relay has to be prepared on the user account, too.  It should be a trustworthy contract with permissions checks in place that only allows specific outgoing calls.


#### Access control for balance

Full access sharded contracts can directly access the account balance without limits.
Deploying a sharded contract with this permission level should be seen equivalent to giving that code a full access key to the account.

Limited access sharded contracts have no direct access to balance.  They must go through a full access sharded contract.

Incoming balance on function calls (sharded and non-sharded) are always deposited on the account's single balance.  Limited access contracts can check how much balance has been sent but it cannot forward it to another account.


### Upgrading a sharded contract

Upgrading a contract normally requires two steps:

- Upgrading the contract code and
- Upgrading the actual contract state

For normal contracts, the upgraded contract code contains sufficient logic to upgrade the associated contract state.  Once the upgraded contract code is deployed, it can [potentially over multiple calls] upgrade the associated contract state.  Further, the owner can hold off on additional upgrades till the existing upgrade has finished.

In the sharded contract scenario, upgrading the contract code is straight forward if we use the `AccountId` mode of global contract but upgrading the contract state is no longer as straight forward.  The actual state is fully distributed on all the user accounts of the contract.  Further, the contract owner may not even have a list of all the user accounts that are using an instance of the sharded contract.  So the only entities that can actually upgrade the state are the users themselves and they would only upgrade the state the next time they choose to use the contract.

Therefore, there is no guarantee for when a user's contract state has been upgraded, which means that it is possible that the owner of the contract can issue another contract upgrade before all the users have finished the existing upgrade.

This means that in the worst case, the owner of the contract has to include, in each version of the contract code, an ability for the user to upgrade their state from all past versions to the current version.  More concretely,

- let's say that the contract has gone through version iterations `v0`, `v1`, ... `vN`.
- then the `vN`th version of the contract code has to contain logic for the user upgrade their state to `vN` from `v0`, from `v1`, ... all the way to `v[N-1]`.

We decided that this is acceptable, assuming that sharded contracts will not be upgraded very often and that providing all the upgrade paths will not be prohibitively expensive.

To avoid version conflicts of in-flight function calls, smart contract developers have to implement a solution that works for them.  One suggestions is to use a new method name if it has a breaking change. (e.g. `send_tokens_v0` and `send_tokens_v1`). Where this is not possible, for example in standardised function names, the version can be a parameter of the function `send_tokens` that allows using `send_tokens_v0` and `send_tokens_v1` internally.

```rust
struct MethodVersion {
    /// revision of the contract standard
    standard: u32,
    /// revision of the specific implementation
    contract: u32,
}

pub fn send_tokens(amount: Balance, receiver: AccountId, version: MethodVersion) {
    assert_eq!(version.standard, 0, "only standard v0 supported");
    match version.contract {
        0 => send_tokens_v0(amount, receiver),
        1 => send_tokens_v1(amount, receiver),
        other => panic!("Contract has not been updated for method version {other}"),
    }
}

```


## Reference Implementation

Protocol changes: https://github.com/near/nearcore/compare/master...jakmeier:nearcore:sharded-contracts?expand=1

Sharded FT contract: https://github.com/jakmeier/near-sdk-rs/tree/wip-sharded-ft/near-contract-standards/src/sharded_fungible_token


## Security Implications

- Contract rewards removed: Today, 30% of gas costs of any function call goes to the account holding the contract. This amount, paid in NEAR native tokens, would no longer be given to FT contracts since their central contract is no longer involved in transactions. Although the amount per call is small, the sum can be a significant income for contracts that they lose with a sharded contract as proposed in this NEP.

- Contract rewards added to user themselves: The 30% of gas costs lost by the contract owner is instead split between the sender and receiver accounts. This opens new faucet draining attacks. For example, if an application offers to sponsor FT transfers for free, a user can spam lossless ft transfers between accounts. Each call will slightly increase the NEAR token balance, on the account controlled by the user.

- Generally bigger attack surface:
  - Any function call that needs to modify the state stored on two different accounts has to be split in two asynchronous calls. For example, an FT transfers needs to be split in withdraw and deposit that happen in two sequential steps. This makes writing secure sharded contracts harder than non-sharded contracts.
  - Attackers can try to make certain receipts of a transaction fail, potentially creating inconsistent state. For example, in `sft_transfer_call`, once the deposit has been added to the receiver, there must be no condition to make the rest of the transaction fail, or otherwise the sender gets a refund and duplicates the funds.

- User may not understand the difference between a full access subcontract and a limited access subcontract.  Wallets signing such requests should clearly state that deploying a full access module is equivalent to adding a full access key to the account.


### The Deletion Problem

The proposal makes deleting accounts impossible as soon as a subcontract is deployed on it

Fundamentally, users should remain in full control of their account.  This includes the ability to delete their account.

Deleting an account also deletes the subcontract state.  This is a form of tampering with subcontract state that the proposal aims to prevent.

Taking away the ability to delete subcontracts is suboptimal.  Especially if anyone can create subcontracts on anybody's account.  Anyone can stop any other account to be deleted, by creating even just one subcontract on their account.

However, the next best alternative we could come up with requires a complicated mechanism around what happens during deletion.  The sharded contract owner must have a way to clean up the state, while the user must have a way to enforce deletion.

Considering how rare account deletions are today, the trade-off to not support account deletions seems overall justified.


## Alternatives

- Instead of explicit limited access / full-access permissions, we could say the sharded contract `ft.near` on `ft.near` implicitly has full access, while `ft.near` on any other account has only limited access.  This would mean anytime full access is required, we have to go through the central `ft.near@ft.near` account.
- Instead of `SwitchContext`, we could use `ShardedFunctionCall`.  This would be less flexible and require duplicating any action we want to allow targeting sharded contracts, e.g. `ShardedTransfer`, `ShardedDeployContract`, `ShardedAddAccessKey` and so on.
- Instead of adding separate `caller` and `target` fields on `SwitchContext`, it could only have the `target` field. The caller info still needs to be sent with the receipt, though, for the callee to check who is calling. We could add the caller info as an extra field on every action receipt. This would increase the size of every action receipt by `sizeof(ContractContext)` and force us to add a new `ActionReceipt` version if we change `ContractContext` in the future. Putting it inside the action seems like the better choice.
- Instead of limiting storage by non-refundable allowance, we could give separate balance to each sharded contract and treat them as separate storage entities.  This can be awkward for users, who now have to maintain many balances per account.  This makes the wallet view presented to users more complex than desired.  And it opens up the door to refund attacks.
- Another option to manage storage would be a separate ZBA limit per sharded contract.  This is far less flexible than the chosen solution.
- We could allow subcontract deletion in one of several ways.  All of the discussed solutions make it significantly harder to implement sharded contracts, since subcontracts can vanish at any moment.

## Future possibilities

### Synchronous execution and more subcontract types

The proposal has been written with the possibility of synchronous execution of function calls between contracts on the same account.

- The current specification already allows to build a receipt that makes calls in multiple contexts by using more than one `SwitchContextAction` in a receipt.
- If we add something like a synchronous promise API to the WASM runtime, this could dynamically add more actions to the currently executing receipt in the transaction runtime.  As long as the total attached gas is not exhausted, the transaction runtime could keep executing those dynamically added actions. (As opposed to putting them in a outgoing receipt, as it's done with the async promise API). This would allow to execute a function call within the same receipt, including callbacks.
- If synchronous execution is enabled, we should also allow deploying multiple contracts per account without making them global.  We can add an enum variant to `ContractContext`, perhaps called `ContractContext::AccountExtension`.  When switching to a context of that type, `DeployContractAction` would be allowed to create a subcontract that's not deployed globally.  Since all outgoing receipts will have the caller set to a non-sharded context, it will not interfere with the access control of sharded contracts.  The user would remain in full control of the code, which could be re-deployed or even deleted.
- Note that inside a `ContractContext::AccountExtension` context, we can still use `UseGlobalContractAction` to make use of cheap code sharing but without interfering with sharded contracts.  In this case, the context name can be chosen freely and does not need to be linked to the global code identifier.

### Extend interoperability with non-sharded contracts

We could add support for sharded contracts to call non-sharded contracts later.  Possible ways to keep this secure are:

- The non-sharded contract has to somehow flag that is accepts sharded calls.  For example, with an explicit host function like `enable_contract_feature(sharded_to_nonsharded)`, or even just by enabling it as soon as a contract has called `predecessor_contract_context`.
- We could make any sharded to non-sharded contract call fail if there is no host function call to `predecessor_contract_context`.
- We could make calls to `predecessor_id` fail in sharded to non-sharded contract calls and provide a `predecessor_id_and_context` host method to use instead.

All these options are a bit hacky and are not currently part of the MVP proposal.  But if the limitation on sharded to nonsharded contracts becomes an issue, these solutions can be added on top the proposed design without backwards compatibility issues.


## Consequences

### Positive

- Contracts on NEAR can scale beyond the transaction execution bandwidth of one shard.
- If this gets adopted by high-usage contracts, it will more evenly distribute the load across the network and avoid congestion on busy shards.

### Neutral

- Sharded contracts can interoperate with any existing contract but need to go through a full access subcontract to do so.

### Negative

- Malicious actors gain the ability to prevent the deletion of any Near account by using permissionless subcontract deployment on the account.
- Getting rid of the assumption that subcontracts are never delete will be tricky to do in a backwards-compatible way.
- Permission checks inside sharded contracts need to take the calling context into consideration, on top of existing authorization practices.

### Backwards Compatibility

- Sharded contracts can interoperate with any existing contract but need to go through a full access subcontract to do so.
- Smart contract code that runs in a contract today will work the same in a subcontract. (modulo permissions)

## Unresolved Issues (Optional)

- it is not possible for an account to remove the storage that a sharded contract created without the help of the sharded contract itself
- deleting an account is completely impossible once a subcontract is deployed on it
- upgrading contracts is left to sharded contract developers to resolve


## Changelog


### 1.0.0 - Initial Version


#### Benefits

> List of benefits filled by the Subject Matter Experts while reviewing this version:

- Benefit 1
- Benefit 2

#### Concerns

> Template for Subject Matter Experts review for this version:
> Status: New | Ongoing | Resolved

|   # | Concern | Resolution | Status |
| --: | :------ | :--------- | -----: |
|   1 |         |            |        |
|   2 |         |            |        |

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
