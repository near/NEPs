---
NEP: 0605
Title: Sharded Contracts
Authors: Akhi Singhania <akhi3030@gmail.com>; Jakob Meier <jakob@nearone.org>
Status: Draft
DiscussionsTo: https://github.com/nearprotocol/neps/pull/0000
Type: Protocol
Version: 0.0.0
Created: 2025-04-07
LastUpdated: 2025-04-14
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
- This transaction is routed to the shard where the user's account lives where it is converted to a receipt.
- Then, if the FT contracts lives on another shard, the receipt is routed to that shard.
- Once it arrives on the FT contract's shard, the receipt is executed, the function call is performed, and the transfer is performed.

The minimum latency of doing a single transaction is 2 blocks.  In the first block, the transaction is converted to a receipt and if needed the receipt is routed to another shard.  Then in the second block, the receipt executes on the FT contract.  Additionally, note that each FT transfer requires exactly one function call.

### Limitations

Since all the account balances are stored in a single contract, this one contract has to be invoked in order to make any transfers.  Therefore, the maximum TPS of this contract is the maximum TPS of the shard it is deployed on.  The only way to increase this capacity would be to increase the capacity of the shard.  Adding more shards does not help.


## Specification

In the centralised FT contract above, all the state is stored in a single centralised location.  The opposite extreme of this approach would be to store all the state in as distributed a manner as possible i.e. the account balances of each user is stored locally on their accounts instead.  Below, we explain how this can be implemented.

### Pseudocode for a sharded FT contract

We start by showing what a sharded version of the above FT contract would look like if it were using our proposed changes.

```rust
// Pseudocode interface to various host functions
trait HostFunctions {
    // This host function already exists and returns the account id of the
    // current account.
    fn current_account_id() -> AccountId;

    // This host function already exists and returns the account id of the
    // signer (i.e. the message sender) account.
    fn signer_account_id() -> AccountId;

    // This is a simplification of the already existing storage read host
    // function used to read contract state from the trie.
    //
    // If this is called during an execution of the new
    // `ShardedFunctionCallAction`, then the data will be accessed from a
    // separate namespace.  Details of the namespace are discussed below in the
    // NEP.
    fn storage_read(key: &str) -> Balance;

    // This is a simplification of the already existing storage write host
    // function used to write contract state to the trie.
    //
    // If this is called during an execution of the new
    // `ShardedFunctionCallAction`, then the data will be written a separate
    // namespace.  Details of the namespace are discussed below in the NEP.
    fn storage_write(key: &str, amount: Balance);

    // A new host function that returns information about the sharded contract
    // code that is being used by the current account.
    //
    // If the contract code was called using a `FunctionCallAction`, then this
    // function panics.  If it was called using a new
    // `ShardedFunctionCallAction` then returns information about which global
    // contract code that is being used by the current account.
    fn current_sharded_contract_info() -> ShardedContractInfo;

    // A new host function that returns information about the sharded contract
    // code that is being used by the signer (i.e. the message sender) account.
    //
    // If the signer (i.e. the message sender) called the current account using
    // the new `ShardedFunctionCallAction` information about what type of global
    // contract code the signer account is using.  Otherwise, the function
    // panics.
    fn signer_sharded_contract_info() -> ShardedContractInfo;

    // A new host function that allows the current account to call another
    // account using the new `ShardedFunctionCallAction` action instead of the
    // `FunctionCallAction` action.
    //
    // This function will panic if the current account was not also called via
    // `ShardedFunctionCallAction`.
    fn call_sharded_contract(
        // The account id of the account to call
        account_id: AccountId,
        // Which sharded contract code on the destination account to call
        sharded_contract_account_id: AccountId,
        // In between a sender sending the message and the receiver executing
        // it, the contract code could have been upgraded.  The two fields below
        // allow the sender to specify which versions the receiver can be in
        // when called.  If the receiver's version is outside the specified
        // range, then the call is rejected.
        minimum_version: Option<u64>,
        maximum_version: Option<u64>,
        // These two arguments are a simplification of the existing args
        // for the normal cross contract call.
        function: &str,
        args: Balance,
    );
}

struct ShardedContractInfo {
    /// Account id of the account where the sharded contract code is deployed.
    account_id: AccountId,
    /// How many times the the above account has deployed a sharded contract
    // code on itself.
    version: u64,
}

// A smart contract function that can be used to initiate a FT transfer.
fn send_tokens(amount: Balance, receiver: AccountId) {
    // Since only the owner of this account is allowed to transfer funds out of
    // it, ensure that the caller of this function is the owner of this account.
    let my_account_id = HostFunctions::current_account_id();
    let msg_sender = HostFunctions::signer_account_id();
    assert_eq!(my_account_id, msg_sender);

    // Update the account balance
    let mut my_balance = HostFunctions::storage_read("balance");
    assert!(my_balance >= amount);
    my_balance -= amount;
    HostFunctions::storage_write("balance", my_balance);

    // Call the receiver's account to receive the tokens.
    let my_sharded_contract_info = HostFunctions::current_sharded_contract_info();
    HostFunctions::call_sharded_contract(
        receiver,
        my_sharded_contract_info.account_id,
        // The sharded contract code on the receiver should be at the same
        // precise version as the current account.
        Some(my_sharded_contract_info.version),
        Some(my_sharded_contract_info.version),
        "receive_tokens",
        amount,
    );

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
    // Two new host function call are introduced.  These allow a smart contract
    // to look up what type of contract code is deployed on the current account
    // and on the message sender's account.
    //
    // Then check that both the current account and the signer are using the
    // same sharded contract code.
    let my_sharded_contract_info = HostFunctions::current_sharded_contract_info();
    let signer_sharded_contract_info = HostFunctions::signer_sharded_contract_info();
    assert_eq!(
        my_sharded_contract_info.account_id,
        signer_sharded_contract_info.account_id
    );
    // It is possible that in between the signer sending the message and
    // the current account executing it, the sharded contract has been
    // upgraded.  This means that the version of the contract that sent
    // the message is different than the version that is executing it.
    // This might potentially introduce some subtle malicious issues
    // depending on the differences between the two versions. Hence, the
    // receiver rejects any messages that are not sent from the same
    // version as current.
    assert_eq!(
        my_sharded_contract_info.version,
        signer_sharded_contract_info.version
    );

    // Update the account balance
    let mut my_balance = HostFunctions::storage_read("balance");
    my_balance += amount;
    HostFunctions::storage_write("balance", my_balance);
}

```

Additionally, we will need the following new receipt actions.

```rust
/// This action allows an account to start using a existing sharded contract code.
/// This contract code can only be called by using the new 
/// `ShardedFunctionCallAction` action.
///
/// This action can be called multiple times on the same account to allow it to
/// use multiple sharded contract codes simultaneously.
struct UseShardedContractAction {
    // Account id of the account where the sharded contract code is deployed.
    account_id: AccountId,
}

/// This action allows an account to stop using an sharded contract code that is
struct RemoveShardedContractAction {
    // Account id of the account where the sharded contract code is deployed.
    account_id: AccountId,
}

/// This is similar to the existing `FunctionCallAction`.  `FunctionCallAction`
/// allows calling contract codes that are deployed using the
/// `DeployContractAction` or the `UseGlobalContractAction` on an account.  This
/// action allows calling contract codes that are deployed using the
/// `UseShardedContractAction`.
struct ShardedFunctionCallAction {
    // An account can have multiple sharded contract codes deployed on it.  This
    // identifies which one should be called.
    receiver_sharded_contract_code_account_id: AccountId,
    // An account can have multiple sharded contract codes deployed on it.  This
    // identifies which contract code on the signer is sending the action.
    signer_sharded_contract_code_account_id: AccountId,
    // additionally arguments are identical to `FunctionCallAction`.
    ...
}
```


With the above in place, following is the flow for how a sharded FT contract would be used.

1. Each user that wants to use a sharded FT contract, will first deploy it on their account using the `UseShardedContractAction` action.
2. When `alice.near` wants to transfer tokens to `bob.near`, Alice calls the `send_tokens()` function on the sharded FT contract on her account using the `ShardedFunctionCallAction` action.
3. `send_tokens()` ensures that caller is Alice as only the owner of the account should be allowed to initiate transfers.
4. Next, the contract decrements the balance.  We will discuss access control issues to storage in the namespace section below.
5. Then, it sends a cross contract call to `bob.near` using the `ShardedFunctionCallAction` action.
6. `receive_tokens()` executes on `bob.near`.
7. `receive_tokens()` ensures that the caller is an instance of the same sharded contract as itself otherwise it might be possible to mint tokens maliciously.
8. `receive_tokens()` updates the balance stored locally.

Comparing this approach to the centralised approach, we note the following:

- Instead of 1 function call, this approach always requires 2 function calls.  One on the sender's account and one on the receiver's account.
- Just like the centralised case, the minimum latency is 2 blocks.  Even if both the sender and the receiver accounts live on the same shard, a following cross contract receipt always executes the earliest in the next block.
- In the centralised situation, all function calls took place on a single shard, assuming a uniform distribution of accounts across the network, the 2 function calls will be uniformly distributed across all the shards of the network.  This implies that the maximum TPS of this application scenario will be the sum of the TPS of all the shards on the network.

### Requirements

We can now explain what the high level requirements are that the above proposal is trying to meet.  This provides the sufficient context to understand why the proposal is designed the way it is.

#### Multiple contract codes

It should be possible to use multiple sharded contract codes on a single account.  This is important because otherwise users will have to create new accounts for each type of FT they want to hold which means that the users will have to manage multiple keys, etc. degrading user experience.

We considered the existing subaccount feature as well here.  That idea does not work because subaccounts only provide access control over account creation.  The keys for each subaccount still need to be managed individually.

#### Access control to sharded contract functions

We identified that sharded contracts may want to have 2 types of access control on functions.

First are functions that can only be called by the account owner (e.g. `send_tokens()`).  This scenario is covered by the existing set of host functions.

Second are functions that can only be called by another instance of the same contract.  Here the `ShardedFunctionCallAction` action provides information about the signer and the runtime can provide information about the current account.  And then as seen in `receive_tokens()`, the contract can then perform the appropriate checks.

#### Storage namespaces

In the pseudocode, we see the contract is storing its state locally on the accounts.  Without additional primitives, malicious users could tamper with this state.  In the FT example above, a malicious user could have initialised the FT balance on its state to a high value before deploying the sharded contract on the account which would allow it to malicious mint tokens.

Further, if we have multiple contract codes running on the same account, they could accidentally overwrite or modify another contract code state.  E.g. if two different sharded FT contracts are deployed on a single account and they both want to make changes to the `balance` key.

Hence, we need a way to enable storage namespaces which guarantees that whatever state a sharded contract code is storing on an account, it cannot be modified by another contract code on that account.

### Detailed specification

With the high level requirements and the pseudocode presented, we can discuss the specification of the new primitives been proposed.

#### `DeployShardedContractAction`

This action is similar to the `DeployGlobalContractAction`.  Note that an account can have only a single sharded contract code deployed on it.  Processing this action will generate a `GlobalContractDistributionReceipt`.  We propose the following modifications to this receipt.

```rust
enum GlobalContractDistributionReceipt {
    V2(GlobalContractDistributionReceiptV2),
}

enum ShardedOrGlobalContract {
    Global {
        id: GlobalContractIdentifier,
    },
    Sharded {
        // The account id on which the sharded contract code is deployed.
        id: AccountId,
        // number of times a sharded contract code has been deployed on this account.
        version: u64,
    },
}

struct GlobalContractDistributionReceiptV2 {
    sharded_or_global: ShardedOrGlobalContract,
    target_shard: ShardId,
    already_delivered_shards: Vec<ShardId>,
    code: Arc<[u8]>,
}
```

When processing the `GlobalContractDistributionReceiptV2`, if it has the `ShardedOrGlobalContract::Global` variant, the existing functionality is kept.  

If it has the `ShardedOrGlobalContract::Sharded` variant, a new `TrieKey` variant is used:

```rust
enum TrieKey {
    ...
    ShardedContractCode { identifier: AccountId, version: u64 },
}
```

to sore the sharded contract code on the shard.

#### `UseShardedContractAction`

This action is similar to the `UseGlobalContractAction`.  This action can be called multiple times to use multiple different sharded contract codes on the same account.  To support this action, the `AccountContract` struct is updated as following:

```rust
struct ShardedEntry {
    account_identifier: AccountId,
    version: u64,
}

enum AccountContract {
    ...
    Sharded(BTreeSet<ShardedEntry>)
}
```

#### `RemoveShardedContractAction`

This action allows a user to stop using sharded contract code that it previously started using.  Note that this does not remove the storage that the sharded contract code may have created on the user account.  It just updates the `AccountContract` struct to remove the requested entry.

#### `ShardedFunctionCallAction`

This action is similar to the `FunctionCallAction`.  This action is used to call a sharded contract code instead of a local or global contract.  As an account can be using multiple sharded contract codes, we also specify which sharded contract code to call.

#### Storage namespace

Today when a local or global contract code calls accesses the storage, the following function is used to create the trie key used:

```rust
fn create_storage_key(&self, key: &[u8]) -> TrieKey {
    TrieKey::ContractData { account_id: self.account_id.clone(), key: key.to_vec() }
}
```

By prepending the account id of the current account to the key, each account gets a separate namespace which ensures that no other account can access their data.

We propose extending this namespace to support per sharded contract namespaces.

```rust
enum ContractType {
    LocalOrGlobal,
    // The account id refers to the account id
    // where the sharded contract code is deployed.
    Sharded(AccountId),
}

fn create_storage_key(&self, key: &[u8], contract_type: ContractType) -> TrieKey {
    match contract_type {
        ContractType::LocalOrGlobal => TrieKey::ContractData {
            account_id: self.account_id.clone(),
            key: key.to_vec(),
        },
        ContractType::Sharded(account_id) => TrieKey::ShardedContractData {
            sharded_acount_id: account_id,
            account_id: self.account_id.clone(),
            key: key.to_vec(),
        },
    }
}
```

A new trie key variant is introduced to store state created by sharded contract codes and the account id of the sharded contract code is additionally prepended to create a per sharded contract namespace.

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

We could decide that this is not really a problem if we assume that sharded contracts will not be upgraded very often and that providing all the upgrade paths will not be prohibitively expensive.

## Reference Implementation

TODO

## Security Implications

TODO

## Alternatives


## Future possibilities

TODO

## Consequences

TODO

### Positive

* p1

### Neutral

* n1

### Negative

* n1

### Backwards Compatibility

None

## Unresolved Issues (Optional)

- it is not possible for an account to remove the storage that a sharded contract created without the help of the sharded contract itself.


## Changelog


### 1.0.0 - Initial Version


#### Benefits

> List of benefits filled by the Subject Matter Experts while reviewing this version:

* Benefit 1
* Benefit 2

#### Concerns

> Template for Subject Matter Experts review for this version:
> Status: New | Ongoing | Resolved

|   # | Concern | Resolution | Status |
| --: | :------ | :--------- | -----: |
|   1 |         |            |        |
|   2 |         |            |        |

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
