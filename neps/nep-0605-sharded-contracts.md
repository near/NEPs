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


## Specification

In the centralised FT contract above, all the state is stored in a single centralised location.  The opposite extreme of this approach would be to store all the state in as distributed a manner as possible i.e. the account balances of each user is stored locally on their accounts instead.  This distributes it across shards and allows for horizontal scaling.

Of course, we cannot just put the state in normal user storage without a way to mitigate them manipulating their FT balance.  We need a way to ensure only the real FT contract code can modify this state.

Below, we explain how this can be implemented.

### Pseudocode for a sharded FT contract

We start by showing what a sharded version of the above FT contract would look like if it were using our proposed changes.

```rust
// Pseudocode interface to various host functions
trait HostFunctions {
    /// Returns the account id of the parent account that created this sharded
    /// subaccount.  If this function is called by an account that is not a
    /// sharded subaccount, then it panics.
    fn parent_account_id() -> AccountId;

    // This host function already exists and returns the account id of the
    // predecessor (i.e. the message sender) account.
    fn predecessor_account_id() -> AccountId;

    // This is a simplification of the already existing storage read host
    // function used to read contract state from the trie.
    fn storage_read(key: &str) -> Balance;

    // This is a simplification of the already existing storage write host
    // function used to write contract state to the trie.
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
    // code that is being used by the predecessor (i.e. the message sender)
    // account.
    //
    // If the predecessor (i.e. the message sender) called the current account
    // using the new `ShardedFunctionCallAction` information about what type of
    // global contract code the predecessor account is using.
    //
    // Returns: `None` if the sender is not using a sharded contract code.
    fn predecessor_sharded_contract_info() -> Option<ShardedContractInfo>;

    // A new host function that allows the current account to call another
    // account using the new `ShardedFunctionCallAction` action instead of the
    // `FunctionCallAction` action.
    //
    // This function will panic if the current account was not also called via
    // `ShardedFunctionCallAction`.
    fn call_sharded_contract(
        // The account id of the account to call
        account_id: AccountId,
        sharded_contract_type: CallShardedContractReceiver,
        // These two arguments are a simplification of the existing args
        // for the normal cross contract call.
        function: &str,
        args: Balance,
    );
}

/// When calling a sharded contract code using `call_sharded_contract`, this
/// enum specifies which code to call.
enum CallShardedContractReceiver {
    /// When an immutable sharded contract code is being called, the following
    /// information is needed.
    Mutable {
        /// AccountId of the account where the sharded contract code is
        /// deployed.
        account_id: AccountId,
        /// In between a sender sending the message and the receiver executing
        /// it, the contract code could have been upgraded.  The two fields
        /// below allow the sender to specify which versions the receiver can be
        /// in when called.  If the receiver's version is outside the specified
        /// range, then the call is rejected.
        minimum_version: Option<u64>,
        maximum_version: Option<u64>,
    },
    /// If an immutable sharded contract code is being called, just the code
    /// hash is required and no versioning informaiton is needed either.
    Immutable { code_hash: CryptoHash },
}

enum ShardedContractInfo {
    /// This is similar to immutable global contracts.  Once deployed, the
    /// contract code cannot be updated.
    Immutable { code_hash: CryptoHash },
    /// This is similar to mutable global contracts.  The contract code can be
    /// upgraded after being deployed.
    Mutable {
        /// Account id of the account where the sharded contract code is deployed.
        account_id: AccountId,
        /// How many times the the above account has deployed a sharded contract
        // code on itself.
        version: u64,
    },
}

// A smart contract function that can be used to initiate a FT transfer.
fn send_tokens(amount: Balance, receiver: AccountId) {
    // Only the actual owner of the tokens should be allowed to call this
    // function.  To ensure this, the function checks if the caller of the
    // function is the same as the parent account that created it.
    let parent_account_id = HostFunctions::parent_account_id();
    let msg_sender = HostFunctions::predecessor_account_id();
    assert_eq!(parent_account_id, msg_sender);

    // Update the account balance
    let mut my_balance = HostFunctions::storage_read("balance");
    assert!(my_balance >= amount);
    my_balance -= amount;
    HostFunctions::storage_write("balance", my_balance);

    // Call the receiver's account to receive the tokens.
    let my_sharded_contract_info = HostFunctions::current_sharded_contract_info();
    match my_sharded_contract_info {
        ShardedContractInfo::Immutable { code_hash } => HostFunctions::call_sharded_contract(
            receiver,
            CallShardedContractReceiver::Immutable { code_hash },
            "receive_tokens",
            amount,
        ),

        ShardedContractInfo::Mutable { account_id, version } => {
            HostFunctions::call_sharded_contract(
                receiver,
                CallShardedContractReceiver::Mutable {
                    account_id,
                    // Require that the receiver is precisely at the same
                    // version as the sender.  Otherwise, it is posisble that
                    // due to version changes, some subtle bugs might be
                    // introduced.
                    minimum_version: Some(version),
                    maximum_version: Some(version),
                },
                "receive_tokens",
                amount,
            )
        }
    }

    // TODO: Should we emit an ft_transfer events here?  Or at the receiver?  Both?

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
    let my_sharded_contract_info = HostFunctions::current_sharded_contract_info();
    // the unwrap here allows ensures that this function is only called by a sharded contract code.
    let sender_sharded_contract_info = HostFunctions::predecessor_sharded_contract_info().unwrap();

    match (my_sharded_contract_info, sender_sharded_contract_info) {
        (
            ShardedContractInfo::Immutable { code_hash: my_code_hash },
            ShardedContractInfo::Immutable { code_hash: sender_code_hash },
        ) => assert_eq!(my_code_hash, sender_code_hash),
        (
            ShardedContractInfo::Mutable { account_id: my_account_id, version: my_version },
            ShardedContractInfo::Mutable { account_id: sender_account_id, version: sender_version },
        ) => {
            assert_eq!(my_account_id, sender_account_id);
            // It is possible that in between the signer sending the message and
            // the current account executing it, the sharded contract has been
            // upgraded.  This means that the version of the contract that sent
            // the message is different than the version that is executing it.
            // This might potentially introduce some subtle malicious issues
            // depending on the differences between the two versions. Hence, the
            // receiver rejects any messages that are not sent from the same
            // version as current.
            assert_eq!(my_version, sender_version);
        }
        _ => panic!(),
    }

    // Update the account balance
    let mut my_balance = HostFunctions::storage_read("balance");
    my_balance += amount;
    HostFunctions::storage_write("balance", my_balance);
}
```

Additionally, we will need the following new receipt actions.

```rust
enum ShardedContractType {
    Immutable {
        // code hash of the contract code.
        code_hash: CryptoHash,
    },
    Mutable {
        // Account id of the account where the sharded contract code is deployed.
        account_id: AccountId,
    },
}

/// This action allows an account to start using a existing sharded contract
/// code. This contract code can only be called by using the new
/// `ShardedFunctionCallAction` action.
///
/// This action can be called multiple times on the same account to allow it to
/// use multiple sharded contract codes simultaneously.
///
/// This action is similar to creating a new account as it creates a sharded
/// subaccount.
struct UseShardedContractAction {
    /// information about which sharded contract to use
    sharded_contract: ShardedContractType,
}

/// This action allows an account to stop using a sharded contract code.
///
/// This action is similar to deleting an account as it deletes a sharded
/// subaccount.
struct RemoveShardedContractAction {
    sharded_contract: ShardedContractType,
    beneficiary_id: AccountId,
}

/// This is similar to the existing `FunctionCallAction`.  `FunctionCallAction`
/// allows calling contract codes that are deployed using the
/// `DeployContractAction` or the `UseGlobalContractAction` on an account.  This
/// action allows calling contract codes that are deployed using the
/// `UseShardedContractAction`.
struct ShardedFunctionCallAction {
    // An account can be using multiple sharded contract codes.  This identifies
    // which one should be called.
    receiver_sharded_contract: ShardedContractType,
    // An account can be using multiple sharded contract codes.  This identifies
    // which contract code on the predecessor is sending the action.
    predecessor_sharded_contract: ShardedContractType,
    // additionally arguments are identical to `FunctionCallAction`.
}

/// This is similar to DeployGlobalContractAction.
struct DeployShardedContractAction {
    deploy_mode: ShardedContractType,
    code: Arc<[u8]>,
}
```

With the above in place, following is the flow for how a sharded FT contract would be used.

1. Each user that wants to use a sharded FT contract, will first start using it on their account using the `UseShardedContractAction` action.
2. When `alice.near` wants to transfer tokens to `bob.near`, Alice calls the `send_tokens()` function on the sharded FT contract on her account using the `ShardedFunctionCallAction` action.
3. `send_tokens()` ensures that caller is Alice as only the owner of the account should be allowed to initiate transfers.
4. Next, the contract decrements the balance.
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

#### Access control to sharded contract functions

We identified that sharded contracts may want to have 2 types of access control on functions.

First are functions that can only be called by the account owner (e.g. `send_tokens()`).

Second are functions that can only be called by another instance of the same contract.  Here the `ShardedFunctionCallAction` action provides information about the predecessor and the runtime can provide information about the current account.  And then as seen in `receive_tokens()`, the contract can perform the appropriate checks.

### Detailed specification

With the high level requirements and the pseudocode presented, we can discuss the specification of the new primitives been proposed.

#### `DeployShardedContractAction`

This is where things begin.  A smart contract developer who has built a smart contract will deploy their sharded contract to the network using this action.  This action is similar to the `DeployGlobalContractAction`.  The main difference is that processing this action generates a `GlobalContractDistributionReceipt` where `sharded_or_global` is set to support the appropriate sharded contract code deployment type.

Details of the receipt are below.  Note that at most one sharded contract can be deployed on an account.

```rust
enum ShardedContractIdentifier {
    /// This is similar to immutable global contracts.  Once deployed, the
    /// contract code cannot be updated.
    Immutable { code_hash: CryptoHash },
    /// This is similar to mutable global contracts.  The contract code can be
    /// upgraded after being deployed.
    Mutable {
        /// Account id of the account where the sharded contract code is deployed.
        account_id: AccountId,
        /// How many times the the above account has deployed a sharded contract
        // code on itself.
        version: u64,
    },
}

enum GlobalContractDistributionReceipt {
    V2(GlobalContractDistributionReceiptV2),
}

enum ShardedOrGlobalContract {
    // Same before
    Global { id: GlobalContractIdentifier },
    // new variant to support sharded contract deployments
    Sharded(ShardedContractIdentifier),
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
    ShardedContractCode(ShardedContractCodeIdentifier),
}
```

to store the sharded contract code on the shard.

#### `UseShardedContractAction`

Now that the smart contract developer has deployed their sharded contract on the network, users can start using it.  Assuming that users already have an account, they will use the `UseShardedContractAction` to use the sharded contract code on their account.

This action is similar to the `CreateAccountAction` action.  Further, this action can be called multiple times to use multiple different sharded contract codes on the same account.  To support this action, we propose that each time this action is issues, a new account is created that is subordinate to the account that created it.

By creating a new account, we get the necessary isolation that is important to ensure that no malicious or accidental tampering can happen.  In particular, we prevent the following potential attacks and possibly more:

1. If an account has a contract code `C` deployed on it and it is using a sharded contract code `S`, it might be possible for them to access each other's state and corrupt it.
2. Similarly, if an account is using multiple sharded contract codes `S1` and `S2`, then it is possible that they could access and corrupt each other's state.
3. Sharded contract codes have unfettered access to the NEAR tokens on the account.  They could transfer it away or they could keep increasing the size of the state increasing the amount of NEAR tokens that are locked up.

By creating a separate subordinate account for each sharded contract that an account wants to use, we ensure that the account is able to specify limits on how much resources the sharded contract can use.  We also ensure that the sharded contract is well isolated from the account and from other sharded contracts which might corrupt its state.

XXX: Discuss the design further.  Some open questions

- How is the account created?
- what is the name for the account?

#### `ShardedFunctionCallAction`

Once users are using a sharded contract code, they can call it using this action.  This action is similar to `FuctionCallAction`.  It contains additional information about what type of sharded contract to call on the receiver side.  Note that as seen in the example above, this action will also be used when a sharded contract code calls another one.

#### `RemoveShardedContractAction`

This action allows a user to stop using sharded contract code that it previously started using.  This is similar to the `DeleteAccountAction`.  Note that this does not remove the storage that the sharded contract code may have created on the user account.  It just deletes the subordinate account that was created to support the sharded contract.

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

- p1

### Neutral

- n1

### Negative

- n1

### Backwards Compatibility

None

## Unresolved Issues (Optional)

- it is not possible for an account to remove the storage that a sharded contract created without the help of the sharded contract itself.


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
