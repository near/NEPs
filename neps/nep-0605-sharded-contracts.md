---
NEP: 0605
Title: Sharded Contracts
Authors: Akhi Singhania <akhi3030@gmail.com>
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

## Specification

### Background

We will use the fungible tokens (FT) contract as an example contract to explain the specification.  The full contract is available [here](https://github.com/near-examples/FT) and this section briefly explains how this contract works on the network today.

The contract consists of state where all the user' account balances are stored in a single HashMap data structure.  When a user wishes to transfer some FT to another user, the following steps take place:

- The sender sends a transaction with a function call action to the contract to transfer the tokens from one account to another.
- This transaction is routed to the shard where the user's account lives where it is converted to a receipt.
- Then the receipt is routed to the shard where the FT contract lives.
- Once it arrives on the FT contract's shard, the receipt is executed, the function call is performed, and the transfer is performed.

The minimum latency of doing a single transaction is 2 blocks.  In the first block, the transaction is converted to a receipt and if needed the receipt is routed to another shard.  Then in the second block, the receipt executes on the FT contract.  Additionally, note that each FT transfer requires exactly one function call.

#### Limitations

Since all the account balances are stored in a single contract, this one contract has to be invoked in order to make any transfers.  Therefore, the maximum TPS of this contract is the maximum TPS of the shard it is deployed on.  The only way to increase this capacity would be to increase the capacity of the shard.  Adding more shards does not help.

### Sharded FT contract

In the centralised FT contract above, all the state is stored in a single centralised location.  The opposite extreme of this approach would be to store all the state in as distributed a manner as possible i.e. the account balances of each user is stored locally on their accounts instead.  Below, we explain how this can be implemented.

First we show the pseudocode of how a sharded FT contract might look like.

```rust
/// This enum is similar to the one declared in nearcore.  It shows what type of
/// contract code is deployed on an account.
pub enum AccountContract {
    None,
    Local(CryptoHash),
    Global(CryptoHash),
    /// The contract code is deployed on a single global account.
    /// `times_upgraded` is a monotonically increasing counter that shows how
    /// many times the contract has been upgraded.
    GlobalByAccount {
        /// Account id of the global account where the contract code is deployed.
        account_id: AccountId,
        /// Number of times the contract code has been upgraded.
        times_upgraded: u64,
    },
}

fn get_balance_key() -> String {
    let my_account_contract: AccountContract = env::current_account_contract();
    let global_account_id: AccountId = match my_account_contract {
        AccountContract::GlobalByAccount { account_id, .. } => account_id,
        _ => panic!(),
    };
    format!("{}-{}", global_account_id, "balance")
}

// Can this function be guaranteed to be called before any other?  See
// `protecting storage access` below for more details.
fn near_init() {
    let balance_key = get_balance_key();
    storage_write(key = balance_key, value = 0);
}

fn send_tokens(amount: Balance, receiver: AccountId) {
    // Only the owner of this account is allowed to transfer funds out of it.
    let my_account_id: AccountId = env::current_account_id();
    let msg_sender: AccountId = env::signer_account_id();
    assert_eq!(my_account_id, msg_sender);

    // Update the account balance
    let balance_key = get_balance_key();
    let mut my_balance: Balance = storage_read(key = balance_key);
    assert!(my_balance >= amount);
    my_balance -= amount;
    storage_write(key = balance_key, value = my_balance);

    // Call the receiver's account to receive the tokens.
    cross_contract_call(destination = receiver, function = "receiver_tokens", args = [amount]);

    // This pseudocode assumes that `receive_tokens()` always succeeds.  In a
    // more complete version, if `receive_tokens()` fails, then this function
    // should undo the balance decrement above to ensure that tokens are not
    // lost.
}

fn receive_tokens(amount: Balance) {
    // The receiver can only accept tokens from the sender if the sender is
    // using the same global contract code.  Otherwise, a malicious actor might
    // trick the receiver into minting tokens.
    //
    // Two new host function call are introduced.  These allow a smart contract
    // to look up what type of contract code is deployed on the current account
    // and on the message sender's account.
    //
    // Then check that both the current account and the signer are using the
    // same global contract.
    let my_account_contract: AccountContract = env::current_account_contract();
    let signer_account_contract: AccountContract = env::signer_account_contract();
    match (my_account_contract, signer_account_contract) {
        (
            AccountContract::GlobalByAccount {
                account_id: my_account_id,
                times_upgraded: my_times_upgraded,
            },
            AccountContract::GlobalByAccount {
                account_id: signer_account_id,
                times_upgraded: signer_times_upgraded,
            },
        ) => {
            assert_eq!(my_account_id, signer_account_id);
            // It is possible that in between the signer sending the message and
            // the current account executing it, the global contract has been
            // upgrading.  Which means that the version of the contract that
            // sent the message is different than the version that is executing
            // it.  This might potentially introduce some subtle malicious
            // issues depending on the differences between the two versions.
            // Hence, the receiver rejects any messages that are not sent from
            // the same version as current.
            assert_eq!(my_times_upgraded, signer_times_upgraded);
        }
        _ => panic!(),
    }

    // Update the account balance
    let balance_key = get_balance_key();
    let mut my_balance: Balance = storage_read(key = balance_key);
    my_balance += amount;
    storage_write(key = balance_key, value = my_balance);
}
```

Each user that wants to use the sharded FT contract has to deploy the above global contract on their account.  The contract stores and manages the users' token balance locally.

Let's say that `alice.near` wants to send some FT tokens to `bob.near`.  The following steps will take place:

- Alice sends a transaction to their account to call `send_tokens()`.  The transaction is converted into a receipt and if there is enough capacity, then the receipt is executed in the same block.
- Executing `send_tokens()` does not require any new host functions.  The function ensures that the signer of the message is also the owner of the account as only the owner of the account should be allowed to transfer tokens; it updates the `balance`; and sends a message to call `receive_tokens` on `bob.near` to receive the tokens.
- Executing `receive_tokens()` requires two new host functions.  These host functions allow the smart contract to inspect what kind of contract code is deploy on the current account and on the account that called it.  This allows the smart contract to ensure that the caller and the current account are both using the same global contract code.  This convinces the receiver of the tokens that the sender has indeed decremented its `balance` appropriately and that there will be no malicious minting of tokens.  Finally, the receiver can increment its `balance` appropriately.

Comparing this approach to the centralised approach, we note the following:

- Instead of 1 function call, this approach always requires 2 function calls.  One on the sender's account and one on the receiver's account.
- Just like the centralised case, the minimum latency is 2 blocks.  Even if both the sender and the receiver accounts live on the same shard, a following cross contract receipt always executes the earliest in the next block.
- In the centralised situation, all function calls took place on a single shard, assuming a uniform distribution of accounts across the network, the 2 function calls will be uniformly distributed across all the shards of the network.  This implies that the maximum TPS of this application scenario will be the sum of the TPS of all the shards on the network.

In order to enable the above scenario, we need the following new primitives in the NEAR protocol:

- Global contract code: This is [ongoing work](https://github.com/near/NEPs/pull/591).
- As seen in the `receive_tokens()` function above, we need to introduce new host functions that allow a smart contract to inspect the type of contract code that is deployed on the current account and on the signer's account.

An important consideration above is how can the sharded FT contract protect itself against malicious actors minting or stealing tokens.  The way this is happening is the following:

- In the `send_tokens()` function, the contract ensures that only the owner is able to send tokens.
- In the `receive_tokens()` function, the contract ensures that the caller has deployed the same version of the global contract.
- Protecting storage accesses.  This is discussed in more detail in the section below.

### Protecting storage accesses

A user can try to manipulate the balance that is stored on their account to maliciously mint tokens.  At a high level, we propose two ways of preventing this:

#### Init function

If the contract code defines a special function called `near_init()`, then this function is guaranteed to be the first function called after deployment and before any other function is called.

As seen in the pseudocode above, the contract can use this function to initialise the `balance` to `0` regardless of whatever the state might have been initialised to before.  So a user cannot have maliciously initialised the `balance` before deploying the global contract to maliciously mint tokens.

#### Storage namespaces

The second way to protect storage accesses.

The precise problem that we need to solve is the following:

- When a sharded contract code is deployed on an account, it wants to be able to create some state on that account.
- Only the sharded contract code should be able to make modifications to this state.
- It should not be possible for the account to make modifications to this state.  Even after the account removes the sharded contract code.
- Open question: can the account remove the state without being allowed to make modifications to the state?  In theory, we can allow this but then the owner of the sharded contract has to be aware of the impact of such changes.

Turns out that the NEAR protocol is already solving a version of this problem.  State from all accounts is stored together in the same `Trie` data structure.  So in theory, if one account could figure out under what key another account has stored some value, it could issue a `storage_write` for that key and make unauthorised modifications to it.  To prevent this type of attack, when accounts issue a `storage_write`, the protocol prepends the `AccountId` of the account that is currently executing to the key.  This creates a unique namespace for each account that is inaccessible to all other accounts.

We propose a similar approach for sharded contracts as well.  Instead of using the `AccountId` namespace, when an account starts using a sharded contract code, the protocol can create a new `ShardedContractInstanceId` for it.  This id can then be prepended to all storage accesses and just like above, this creates an isolated namespace for that specific sharded contract that the account cannot access.

If an account stops using a sharded contract code (e.g. by deploying another contract code on itself), then the associated `ShardedContractInstanceId` can be removed.

### Access control

Sticking with the FT contract example, there are two types of access control checks the contract has to perform.

1. When a sender wants to initiate a transfer.
2. And when a receiver called by the sender account to accept some funds.

The first case is fairly straight forward to address.  Only the owner of the account should be allowed to initiate a transfer.  As such, when the initiate transfer function is called, the smart contract can perform a check to ensure that the caller of the function is the owner of the account.  If this is not the case, then the call can be rejected.

The second case is trickier to address.  In order to ensure that no tokens are maliciously minted, when a receiver is executing the call to receive tokens, it needs a guarantee that the sender of the message is indeed another instance of the sharded contract and that it has indeed decremented its local balance appropriately.  The minimum amount of information that the receiver needs to check to get this guarantee is that the receiver needs to know that the sender of the cross contract call was an instance of the sharded contract.

Currently, the receiver of a message can check the `AccountId` of the sender of the message.  In this case that is not sufficient as the receiver does not know if the sender is indeed using an instance of the sharded contract or not.  Therefore, we propose that when an instance of a sharded contract sends a cross contract receipt to another contract, on top of including the `AccountId` of the actual account, we also include the `AccountId` of the sharded contract code.  Then the receiver of the cross contract receipt can check this bit of information and convince itself that this is a legitimate token transfer.

### Upgrading a sharded contract

Upgrading a contract normally requires two steps:

- Upgrading the contract code and
- Upgrading the actual contract state

For normal contracts, the upgraded contract code contains sufficient logic to upgrade the associated contract state.  Once the upgraded contract code is deployed, it can [potentially over multiple calls] upgrade the associated contract state.  Further, the owner can hold off on additional upgrades till the existing upgrade has finished.

In the sharded contract scenario, upgrading the contract code is straight forward if we use the `AccountId` mode of global contract but upgrading the contract state is no longer as straight forward.  The actual state is fully distributed on all the user accounts of the contract.  Further, the contract owner may not even have a list of all the user accounts that are using an instance of the sharded contract.  So the only entities that can actually upgrade the state are the users themselves and they would only upgrade the state the next time they choose to use the contract.

Therefore, there is no guarantee for when a user's contract state has been upgraded.  And more problematically, it is possible that the owner of the contract has to issue another contract upgrade before all the users have finished the existing upgrade.

This means that in the worst case, the owner of the contract has to include, in each version of the contract code, an ability for the user to upgrade their state from all past versions to the current version.  More concretely,

- let's say that the contract has gone through version iterations `v0`, `v1`, ... `vN`.
- then the `vN`th version of the contract code has to contain logic for the user upgrade their state to `vN` from `v0`, from `v1`, ... all the way to `v[N-1]`.

We could decide that this is not really a problem if we assume that sharded contracts will not be upgraded very often and that providing all the upgrade paths will not be prohibitively expensive.

## Reference Implementation

TODO

## Security Implications

TODO

## Alternatives

TODO

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
