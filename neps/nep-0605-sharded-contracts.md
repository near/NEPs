---
NEP: 0605
Title: Sharded Contracts
Authors: Akhi Singhania <akhi3030@gmail.com>; Jakob Meier <jakob@nearone.org>
Status: Draft
DiscussionsTo: https://github.com/nearprotocol/neps/pull/0000
Type: Protocol
Version: 0.0.0
Created: 2025-04-07
LastUpdated: 2025-05-28
---

## Summary

Today, a single contract is limited to the transactions per second throughput (TPS) of a single a shard, ergo a contract already at the TPS limit of a single shard cannot benefit from increase in TPS made possible by increasing the number of shards.  This NEP builds on top of the global contracts NEPs to enable sharded contracts.  Sharded contracts will be able to seamlessly scale to use the entire TPS capacity of the network.

## Motivation

As a single contract is deployed on a single shard, the maximum TPS that it can have is the maximum TPS of the single shard.  Horizontally scaling (i.e. increasing the number of shards) a blockchain is easier than vertically scaling (i.e. increasing the TPS of a single shard).  Once, all the software bottlenecks are addressed, the only way to vertically scale a shard is by requiring the validators to use faster machines.  Faster machines are more expensive and thereby hurts decentralisation.

Without any additional primitives at the protocol level, a single contract will therefore remain bound by the TPS throughput of a single shard regardless of how many shards are added to the network.

This NEP proposes solving this problem by introducing some new protocol level primitives which allow a single contract to scale to use the throughput capacity of not just one but all shards of the network.

## Background

We will use the fungible tokens (FT) contract as an example contract to explain the limitations that the smart contracts face today.  The full contract is available [here](https://github.com/near-examples/FT) and this section briefly explains how this contract works on the network today.

The contract consists of state where all the user' account balances are stored in a single HashMap data structure.  When a user wishes to transfer some FT to another user, the following steps take place:

- The sender sends a transaction with a function call action to the contract to transfer the tokens from one account to another.
- This transaction is routed to the user account's shard.  Standard account access keys serve as authentication of the sender.  The transaction is converted to a receipt, with the user account id as predecessor id.
- Then, if the FT contracts lives on another shard, the receipt is routed to that shard.
- Once it arrives on the FT contract's shard, the function call is performed.

  - The FT contract code looks at the predecessor id and trusts it for authentication.
  - The FT contract code checks that the sender has enough balance using the HashMap stored in contract state. 
  - Subtract the transfer amount from the HashMap entry for one user and increases it for the other user.
  - Emit a [Fungible Token Event](https://nomicon.io/Standards/Tokens/FungibleToken/Event) to the logs for off-chain observability.

In this centralized architecture, the contract code has full visibility to all balances and may perform atomic actions on multiple account balances.  Furthermore, all emitted events are produced at a single contract, which e.g. an explorer can observe to track all FT activity in one place.

The minimum latency of doing a single transaction is 2 blocks.  In the first block, the transaction is converted to a receipt and if needed the receipt is routed to another shard.  Then in the second block, the receipt executes on the FT contract.  Additionally, note that each FT transfer requires exactly one function call.

### Limitations

Since all the account balances are stored in a single contract, this one contract has to be invoked in order to make any transfers.  Therefore, the maximum TPS of this contract is the maximum TPS of the shard it is deployed on.  The only way to increase this capacity would be to increase the capacity of the shard.  Adding more shards does not help.


## High-level explanation

In the centralised FT contract above, all the state is stored in a single centralised location.  The opposite extreme of this approach would be to store all the state in as distributed a manner as possible i.e. the account balances of each user is stored locally on their accounts instead.  This distributes it across shards and allows for horizontal scaling.

Of course, we cannot just put the state in normal user storage without a way to mitigate them manipulating their FT balance.  We need a way to ensure only the real FT contract code can modify this state.

To enable this isolation, we introduce a new action `SwitchContextAction`.  Within a receipt, all actions that follow a context switch are executed in a different context that has a separate storage namespace.

Contexts can also have different permissions than the main account.  We introduce another new action called `SetContextPermissionsAction` to manage those permissions.

### Pseudocode for a sharded FT contract

We start by showing what a sharded version of the above FT contract would look like if it were using our proposed changes.

```rust
// Pseudocode interface to various host functions
trait HostFunctions {
    // This host function already exists and returns the account id of the
    // predecessor (i.e. the message sender) account.
    fn predecessor_account_id() -> AccountId;

    // This is a simplification of the already existing storage read host
    // function used to read contract state from the trie.
    fn storage_read(key: &str) -> Balance;

    // This is a simplification of the already existing storage write host
    // function used to write contract state to the trie.
    fn storage_write(key: &str, amount: Balance);

    // A new host function that returns information about the context in which
    // the contract is running.
    fn current_context() -> ContractContext;

    // A new host function that returns information about the sharded contract
    // code that is being used by the predecessor (i.e. the message sender)
    // account.
    fn predecessor_context() -> ContractContext;

    // A new host function that allows outgoing actions to execute in a sharded
    // context on the receiver.
    fn promise_batch_action_switch_context(
        context: ContractContext,
    );

    // A new host function to enable / disable contexts or generally manage the
    // permissions of a context.
    fn promise_batch_action_set_context_permissions(
        permissions: ContextPermissions,
    );
}

/// New enum to define the account context.
#[non_exhaustive]
enum ContractContext {
    /// The root context is the default context, used when running in the main
    /// namespace of an account.
    Root,
    /// Running under a sharded contract context, defined by a globally deployed code.
    Sharded {
        code_id: GlobalContractCodeIdentifier,
    },
}

/// Existing enum used for global contract deployments
enum GlobalContractCodeIdentifier {
    CodeHash(CryptoHash),
    AccountId(AccountId),
}

/// New enum to set permission level for a used sharded contract.
#[non_exhaustive]
enum ContextPermissions {
    /// Code in this sharded contract has a namespaced state but otherwise behaves
    /// exactly like the non-sharded contract on the same account.
    ///
    /// All actions are allowed, including NEAR transfers, deploying contract code,
    /// and normal function calls.  The predecessor_id for function calls is the
    /// account_id, without any way for the receiver to differentiate between a call
    /// from the full access sharded contract vs a non-sharded cross-contract call.
    FullAccess,
    /// Code inside the sharded contract has access to namespaced state up to the
    /// storage balance limit and it can call other sharded contracts.
    ///
    /// All other actions are not allowed: Normal function calls, sending NEAR,
    /// creating accounts, staking, yield-resume, changing access keys, ...
    Limited {
        /// This much balance is reserved for the limited module for storage and
        /// cannot be transferred out of the account in any way.
        /// Can be set to 0 to unreserve the balance.
        /// Reducing it below actual storage usage will fail.
        reserved_balance: Balance,
    },
    /// The user has blocked all usage of the context.
    ///
    /// The state inside the context might still be stored.
    /// Set a different permission to unblock again.
    Blocked,
}

// A smart contract function that can be used to initiate a FT transfer.
fn send_tokens(amount: Balance, receiver: AccountId) {
    // Avoid function call access keys from calling this method by requiring
    // one yocto near as attached balance.
    // This also stops limited sharded contracts from using this method.
    near_sdk::assert_one_yocto();

    // Only the actual owner of the tokens should be allowed to call this
    // function.
    let my_account_id = HostFunctions::current_account_id();
    let msg_sender = HostFunctions::predecessor_account_id();
    assert_eq!(my_account_id, msg_sender);


    // Update the account balance
    let mut my_balance = HostFunctions::storage_read("balance");
    assert!(my_balance >= amount);
    my_balance -= amount;
    HostFunctions::storage_write("balance", my_balance);

    // Call the receiver's account to receive the tokens.
    let sharded_context = HostFunctions::current_context();
    match sharded_context {
        ContractContext::Root => panic!("sharded contract should not run in root"),
        ContractContext::Sharded { .. } => {
            near_sdk::Promise::new(receiver)
                .switch_context(sharded_context)
                .function_call("receive_tokens", amount, 0, 5 * TGAS);
        }
    }

    // This pseudocode assumes that `receive_tokens()` always succeeds.  In a
    // more complete version, if `receive_tokens()` fails, then this function
    // should undo the balance decrement above to ensure that tokens are not
    // lost.
}

// A smart contract function used to receive FT from a transfer.
fn receive_tokens(amount: Balance) {
    // The receiver can only accept tokens from the sender if the sender is
    // using the same sharded contract code.  Otherwise, a malicious actor might
    // trick the receiver into minting tokens.
    //
    // To implement this check, the receiver has to make sure that the caller of
    // the function is an instance of the same sharded contract code.
    let my_context = HostFunctions::current_context();
    // the unwrap here allows ensures that this function is only called by a sharded contract code.
    let sender_context = HostFunctions::predecessor_context().unwrap();

    assert_eq!(
        my_context,
        sender_context,
        "Predecessor must be the same sharded contract"
    );

    // Update the account balance
    let mut my_balance = HostFunctions::storage_read("balance");
    my_balance += amount;
    HostFunctions::storage_write("balance", my_balance);

    // A complete implementation would also emit JSON events here.
}
```

With the above in place, following is the flow for how a sharded FT contract would be used.

1. The owner of `ft.near` uses `DeployGlobalContractAction` to deploy the code under the `ft.near` name.
2. Before `alice.near` can use the sharded FT contract `ft.near`, she has to enable it on her account.
    - (`receiver_id="alice.near"`)
    - `SetContextPermissionsAction{ context: Sharded("ft.near"), permission: Limited { reserved_balance: 0 } }`
3. When `alice.near` wants to transfer tokens to `bob.near`, Alice calls the `send_tokens()` function on the sharded FT contract on her account using
    - (`receiver_id="alice.near"`)
    - `SwitchContextAction(Sharded("ft.near"))`
    - `FunctionCallAction("send_tokens", balance=1, ...)`
4. `send_tokens()` ensures that caller is `alice.near` and has 1 yocto NEAR attached, as full access to `alice.near` is required to initiate transfers.
    - Note that this 1 yocto NEAR is sent from `alice.near` to `alice.near`, so it never changes account. The call to `bob.near` has no balance attached.
5. Next, the contract decrements the balance.  We will discuss access control issues to storage in the namespace section below.
6. Then, it sends a sharded cross contract call from `alice.near` to `bob.near`
    - (`receiver_id="bob.near"`)
    - `SwitchContextAction(Sharded("ft.near"))`
    - `FunctionCallAction("receive_tokens", ...)`
7. `receive_tokens()` executes on `bob.near` in the `GlobalContractCodeIdentifier::AccountId("ft.near")` context.
8. `receive_tokens()` ensures that the caller is an instance of the same sharded contract as itself otherwise it might be possible to mint tokens maliciously.
9. `receive_tokens()` updates the balance stored locally.

Comparing this approach to the centralised approach, we note the following:

- Instead of 1 function call, this approach always requires 2 function calls.  One on the sender's account and one on the receiver's account.
- Just like the centralised case, the minimum latency is 2 blocks.  Even if both the sender and the receiver accounts live on the same shard, a following cross contract receipt always executes the earliest in the next block.
- In the centralised situation, all function calls took place on a single shard, assuming a uniform distribution of accounts across the network, the 2 function calls will be uniformly distributed across all the shards of the network.  This implies that the maximum TPS of this application scenario will be the sum of the TPS of all the shards on the network.

Next, we discuss the requirements on context isolation for sharded contracts to work as intended.

### Requirements

#### Multiple contract modules per account

One of the main high level requirements for this work is that users should not have to manage multiple sets of keys which would degrade the user experience.  In the FT example, it should be possible for a user to hold multiple FTs without having to manage multiple sets of keys.  This necessitates that multiple sharded contracts can be used by a single account.  Using a context switching action allows to select a different contract code within the same account.

A follow on requirement of this is that contexts must have proper isolation to ensure that they cannot corrupt each other's state.  Thus, each context has its own namespaced storage, which cannot be written from outside the context.  Even deleting the namespaced storage is only allowed from code inside the same context.

The last piece for isolation of a sharded contract is who can deploy code inside the context.  We define that inside a sharded context identified by `ft.near`, only code globally deployed by `ft.near` can be used.


#### Access control on incoming calls

We identified that sharded contracts may want to have 2 types of access control on functions.

First are functions that can only be called by the account owner (e.g. `send_tokens()`).  This scenario is covered by the existing set of host functions and access keys.

Second are functions that can only be called by another instance of the same contract.  Here the runtime can provide information about the current context, as well as predecessor context.  And then, as seen in `receive_tokens()`, the contract can perform the appropriate checks.


#### Access control for outgoing function calls

For cross contract calls, the `predecessor_id` authenticates the caller and is used for authorization in the receiver's code.

Calls from a sharded contract will use the same `predecessor_id`.  But not all sharded contracts should have the ability to make cross contract calls in the account owner's name.

We solve this with a permission system that can use a sharded contract but give it limited access.  Sharded contracts that need it can also be deployed with full access, it's the user's choice.  But even then, callee's can always read `predecessor_context` to check if the cross contract call originates from a sharded contract's context.


#### Requirements on balance

We did not find conclusive requirements on whether a context within an account needs an isolated balance or not.  The only requirement is that a limited context can not access the main balance of the account.

As described in specification below, we decided to give no balance access at all to limited contexts.


#### Storage limits

An account must always hold a certain amount in NEAR balance to cover its storage cost.  Except, below 770 bytes, this limit is not applied to allow small zero-balance accounts. 

Accounts with zero balance are important for the creation of sponsored accounts.  It prevents the incentive to claim and delete as many accounts as possible from a sponsor, since deleting a zero-balance account gives no financial gain.  Ideally, we can also add sharded contracts to an account while keeping its balance at 0.

Sharded contracts require storage for their context meta data, as well as for the namespaced state modified by WASM code.  Since sharded contracts do no have a separate balance, the storage usage should be added to the total account storage usage. The ZBA limit of 770 bytes is likely too small for many use cases.

Another consideration is that the user should be able to set a limit on the state used by the sharded contract, given that state can only be deleted by the contract's code.  Without limits, a sharded contract could lock up all NEAR tokens held on the account with no way for the user to get it back.

Lastly, there should be a way to reserve storage space for a context.  Otherwise, users may accidentally move too many tokens out of their account, which could make deployed sharded contracts fail to allocate extra bytes they need.

To satisfy all these needs, we decided to set the storage limit per context when setting the permissions.


## Specification

With the high level requirements and the pseudocode presented, we can discuss the specification of the new primitives been proposed.

We will reuse many of the mechanisms that are already built to deploy and distribute global contract code.  In particular, when a smart contract developer has built a sharded contract, they will use the `DeployGlobalContractAction` to deploy the code on their contract.  Note that this means that an account can use a global contract code in the sharded contract mode which may not have been the original intention of the smart contract developer.  We do not see any security concerns with allowing this.

To use a globally deployed code in sharded-contract mode, users need to switch to the `ContractContext::Sharded` context and execute `UseGlobalContractAction` in the same receipt.


#### Contract context switching

Switching contract context is done with `SwitchContextAction`.  All actions within the same receipt but before the next `SwitchContextAction` will execute in the set context.

```rust
struct SwitchContextAction {
    caller: ContractContext,
    target: ContractContext,
}
```

To enable sharded contracts, we introduce `ContractContext::Sharded`, which can select a global contract by account id or code hash as the context identifier.  All contracts deployed outside a context implicitly use the `ContractContext::Root` context.

```rust
#[non_exhaustive]
enum ContractContext {
    Root,
    Sharded {
        code_id: GlobalContractCodeIdentifier,
    },
}
```

The called contract can use the `current_context()` host function to read the own contract context (`target`) and the `predecessor_context()` host function to read the calling contract's context (`caller`). 

The rules for using `SwitchContextAction` are:

- Receipts created from a transaction must always set `caller = ContractContext::Root`.
- Receipts created from a sharded contract must always set `caller = ContractContext::Sharded` with their respective code id.


The rules inside a sharded context are:

- Inside a `ContractContext::Sharded` context, the only allowed actions are `FunctionCallAction`, `SwitchContextAction`.
- Inside a `ContractContext::Sharded` context, `SwitchContextAction` can only target a `Root` context if it has full access permissions. (This is to prevent calling context-unaware contracts from a sharded context. Those contracts only check predecessor_id and generally assume the caller has full access on that account.)


#### Storage namespace

Entering a context changes how `storage_write()` and `storage_read()` construct a trie key.  A new trie key variant is added.

```rust
enum TrieKey {
    ...
    // new variant in TrieKey stores user values just like `TrieKey::ContractData`
    TrieKey::ShardedContractData { 
        account_id: AccountId,
        sharded_contract_id: GlobalContractCodeIdentifier,
        key: Vec<u8>,
    }
}

fn create_storage_key(&self, key: &[u8], contract_context: ContractContext) -> TrieKey {
    match contract_context {
        ContractContext::Root => TrieKey::ContractData {
            account_id: self.account_id.clone(),
            key: key.to_vec(),
        },
        ContractContext::Sharded(sharded_contract_id) => {
            TrieKey::ShardedContractData {
                account_id: self.account_id.clone(),
                sharded_contract_id,
                key: key.to_vec(),
            }
        },
    }
}
```

For serialization, we reuse the existing trie key representation of `GlobalContractCodeIdentifier`.

```rust
impl GlobalContractCodeIdentifier {
    pub fn len(&self) -> usize {
        1 + match self {
            Self::CodeHash(hash) => hash.as_bytes().len(),
            Self::AccountId(account_id) => {
                // Corresponds to String repr in borsh spec
                size_of::<u32>() + account_id.len()
            }
        }
    }

    pub fn append_into(&self, buf: &mut Vec<u8>) {
        buf.extend(borsh::to_vec(self).unwrap());
    }
}
```


#### Setting context permissions


The `SetContextPermissionsAction` action can change what an installed sharded contract can do on a user's account.


```rust
struct SetContextPermissionsAction {
    permissions: ContextPermissions,
}

#[non_exhaustive]
enum ContextPermissions {
    FullAccess,
    Limited {
        reserved_balance: Balance,
    },
    Blocked,
}
```

Calling this action will insert or update the permission on the user's state trie for the specific sharded contract.

```rust
// new variant in TrieKey stores values of type `ContextPermissions`
TrieKey::ContextPermissions { 
    identifier: GlobalContractCodeIdentifier,
}
```

The rules are:

- A contract deployed with `FullAccess` permissions can do anything the main account can do.  This include all actions, without additional limits.
- A contract deployed with `Limited` access cannot produce outgoing receipts with actions in the `ContractContext::Root` context (except for `SwitchContractAction` to enter a sharded context).
    - Together with the rules defined on sharded contexts, this means a sharded contract can only produce two kinds of actions. One, function calls to other sharded functions. Two, start using a global contract in a sharded context with matching global account identifier.
- A contract deployed with `Limited` access cannot attach deposits to a `FunctionCallAction`.
- Calling `SwitchContext` with a context with `Blocked` permissions always fails.
- Going in and out of `Blocked` permissions does not affect the existing contract state.


#### Storage Limits

The storage limit remains to be enforced on the account level, comparing the total bytes used of an account with the token balance at the end of each receipt.  Additional rules are introduced as follows.

- Full access sharded contracts have no additional limits.  They are treated just like the main contract code.
- For limited sharded contracts, the user sets an explicit limit in `SetContextPermissionsAction`.
- Each sharded contract, limited or not, has its own ZBA limit, below which the storage usage is not counted towards the account storage usage.

More details follow now.


#### ZBA Limits for Sharded Contracts

Each sharded contract, limited or not, has its own zero-balance limit that's added on top of the 770 bytes of the main account.  The gas cost of `UseGlobalContract` inside a sharded context is increased from its compute cost to pay for this limit in the same way the 770 bytes per account are paid for in the account creation.

The limit per sharded contract must be enough to store its permissions and a small number of contract state key-value pairs. (e.g. `"balance" -> u128`)

Unlike the zero-balancelimit on accounts, even when a sharded contract goes over the ZBA limit, it will only need to maintain balance for the part over the zero-balance limit.  (For accounts, once a contract is no longer in the ZBA limit, it has to hold Near for all bytes. This made migration easier when introducing ZBAs. Migration is not an issue here.)

*Discussion:*

The exact size for the zero-balance limit has not been fully decided, yet.  A rough estimate says we need at least 217 bytes.

- `TrieKey::ShardedContractData` requires 1 + 2 * (4 + 64) = 137 bytes  
- `ContextPermissions` requires 1 + 16 = 17 bytes
- Storing a `u128` on `balance` requires 16 bytes for the value, 7 bytes for the key, and 40 bytes for `storage_num_extra_bytes_record` = 63 bytes

We could also use 770 bytes, like the existing zero-balance limit on accounts.  However, most of that was meant for access keys, which are not relevant here.


#### Storage Limits for Full Access Sharded Contracts

The usage of the full access contract is not limited beyond the account storage limit.

From the state usage of a full access sharded contract, the runtime subtracts the zero-balance limit.  If the result is positive, it is added to the account's storage usage.


#### Storage Limits for Limited Sharded Contracts

For limited sharded contracts, the user sets an explicit limit in `SetContextPermissionsAction`.

```rust
SetContextPermissionsAction {
    context: ContractContext,
    permissions: ContextPermissions::Limited {
        reserved_balance: 1 * 10u128.pow(24),
    },
}
```

This limit, even if unused, is counted as locked storage on the account.

```diff
pub struct AccountV2 {
    /// The total not locked tokens.
    amount: Balance,
    /// The amount locked due to staking.
    locked: Balance,
    /// Storage used by the given account, includes account id, this struct, access keys and other data.
+    ///
+    /// This now also includes the sum of storage limits of all sharded contracts
    storage_usage: StorageUsage,
    /// Type of contract deployed to this account, if any.
    contract: AccountContract,
}
```

Going over the limit will abort the sharded function call.  Users can reduce the limit any time but they can not go lower than the actual usage.

Just like with full access contracts, bytes below the zero-balance limit are not counted towards the usage limit.


### Deleting an Account with Sharded Contracts

Deleting a contract with sharded contracts is not allowed.

This restriction can be lifted by future proposals, if the need for it arises.  The assumption is, however, that deleting accounts is rarely done today and remains like that for the foreseeable future.


### Limit on contracts per account

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


## Usage Guide

Below are additional explanations on how sharded contracts can be built using the changes proposed in this NEP.


### Access Control


#### Access Keys

All sharded contracts and the parent account share the same set of `AccessKey`s.

If a sharded contract needs to limit access further, it can do so in WASM code, using the new host functions to check if incoming calls are from a sharded contract.


#### Permissions on Function Calls


#### Function Calls from Sharded Contracts

Sharded contracts can be used in two ways:

- Full access: Outgoing function calls look just like they come from the main account, hence they can move assets held on other contracts.
- Limited: No "normal" function calls are allowed, only sharded function calls are possible.

Any receiver of sharded function calls must check the `predecessor_id` + `predecessor_context` combination for authorization.  This only affects code deployed as sharded contracts.

Already deployed code on chain today need no update if they do not use sharded contracts.

If a limited sharded contracts needs to call a non-sharded contract, it always has to go through a full access sharded contract.  The full access contract used to relay has to be prepared on the user account, too.  It should be a trustworthy contract with permissions checks in place that only allows specific outgoing calls.

#### Access control for balance

Full access sharded contracts can directly access the account balance without limits.
Deploying a sharded contract with this permission level should be seen equivalent to giving that code a full access key to the account.

Limited access sharded contracts have no direct access to balance. They must go through a full access sharded contract.

Incoming balance on function calls (sharded and non-sharded) are always deposited on the account's single balance. Limited access contracts can check how much balance has been sent but it cannot 


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

Sharded FT contract: https://github.com/jakmeier/near-sdk-rs/tree/wip-sharded-ft/near-contract-standards/src/sharded_fungible_token

Protocol changes: TODO

## Security Implications

- Contract rewards removed: Today, 30% of gas costs of any function call goes to the account holding the contract. This amount, paid in NEAR native tokens, would no longer be given to FT contracts. since their central contract is no longer involved in transactions. Although the amount per call is small, the sum can be a significant income for contracts that they lose with a sharded contract as proposed in this NEP.

- Contract rewards added to user themselves: The 30% of gas costs lost by the contract owner is instead split between the sender and receiver accounts. This opens new faucet draining attacks. For example, if an application offers to sponsor FT transfers for free, a user can spam lossless ft transfers between accounts. Each call will slightly increase the NEAR token balance, on the account controlled by the user.

- Generally bigger attack surface:
    - Any function call that needs to modify the state stored on two different accounts has to be split in two asynchronous calls. For example, an FT transfers needs to be split in withdraw and deposit that happen in two sequential steps. This makes writing secure sharded contracts harder than non-sharded contracts.
    - Attackers can try to make certain receipts of a transaction fail, potentially creating inconsistent state. For example, in `sft_transfer_call`, once the deposit has been added to the receiver, there must be no condition to make the rest of the transaction fail, or otherwise the sender gets a refund and duplicates the funds.

TODO: complement this list

## Alternatives

- Instead of explicit limited access / full-access permissions, we could say the sharded contract `ft.near` on `ft.near` implicitly has full access, while `ft.near` on any other account has only limited access.  This would mean anytime full access is required, we have to go through the central `ft.near@ft.near` account.
- Instead of a ZBA limit per sharded contract, we could add a general way to burn tokens or gas for non-refundable storage on an account.  This would be its own NEP and limit what sharded contracts can do until that other NEP is also designed, approved and implemented.
- Instead of `SwitchContext`, we could use `ShardedFunctionCall`.  This would be less flexible and require duplicating any action we want to allow targeting sharded contracts, e.g. `ShardedTransfer`, `ShardedDeployContract`, `ShardedAddAccessKey` and so on.
- Instead of adding separate `caller` and `target` fields on `SwitchContext`, it could only have the `target` field. The caller info still needs to be sent with the receipt, though, for the callee to check who is calling. We could add the caller info as an extra field on every action receipt. This would increase the size of every action receipt by `sizeof(ContractContext)` and force us to add a new `ActionReceipt` version if we change `ContractContext` in the future. Putting it inside the action seems like the better choice.
- Instead of limiting storage with permissions, we could give separate balance to each sharded contract and treat them as separate storage entities.  This can be awkward for users, who now have to maintain many balances per account.  This makes the wallet view presented to users more complex than desired.


## Future possibilities

The proposal has been written with the possibility of synchronous execution of function calls between contracts on the same account.

- The current specification already allows to build a receipt that makes calls in multiple contexts by using more than one `SwitchContextAction` in a receipt.
- If we add something like a synchronous promise API to the WASM runtime, this could dynamically add more actions to the currently executing receipt in the transaction runtime.  As long as the total attached gas is not exhausted, the transaction runtime could keep executing those dynamically added actions. (As opposed to putting them in a outgoing receipt, as it's done with the async promise API). This would allow to execute a function call within the same receipt, including callbacks.
- If synchronous execution is enabled, we should also allow deploying multiple contracts per account without making them global.  We can add an enum variant to `ContractContext`, perhaps called `ContractContext::AccountExtension`.  When switching to a context of that type, `DeployContractAction` would be allowed to create a subcontract that's not deployed globally.  Since all outgoing receipts will have the caller set to a non-sharded context, it will not interfere with the access control of sharded contracts.  The user would remain in full control of the code, which could be re-deployed or even deleted.
- Note that inside a `ContractContext::AccountExtension` context, we can still use `UseGlobalContractAction` to make use of cheap code sharing but without interfering with sharded contracts.  In this case, the context name can be chosen freely and does not need to be linked to the global code identifier.


## Consequences

TODO

### Positive

- p1

### Neutral

- n1

### Negative

- n1

### Backwards Compatibility

None

## Unresolved Issues (Optional)

- it is not possible for an account to remove the storage that a sharded contract created without the help of the sharded contract itself.
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
