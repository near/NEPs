---
NEP: 0605
Title: Sharded Contracts
Authors: Akhi Singhania <akhi3030@gmail.com>
Status: Draft
DiscussionsTo: https://github.com/nearprotocol/neps/pull/0000
Type: Protocol
Version: 0.0.0
Created: 2025-04-07
LastUpdated: 2025-04-07
---

## Summary

Today, a single contract is limited to the transactions per second throughput (TPS) of a single a shard, ergo a contract already at the TPS limit of a single shard cannot benefit from increase in TPS made possible by increasing the number of shards.  This NEP builds on top of the global contracts NEPs to enable sharded contracts.  Sharded contracts will be able to seamlessly scale to use the entire TPS capacity of the network.

## Motivation

As a single contract is deployed on a single shard, the maximum TPS that it can have is the maximum TPS of the single shard.  Horizontally scaling (i.e. increasing the number of shards) a blockchain is easier than vertically scaling (i.e. increasing the TPS of a single shard).  Once, all the software bottlenecks are addressed, the only way to vertically scale a shard is by requiring the validators to use faster machines.  Faster machines are more expensive and thereby hurts decentralisation.

Without any additional primitives at the protocol level, a single contract will therefore remain bound by the TPS throughput of a single shard regardless of how many shards are added to the network.

This NEP proposes solving this problem by introducing some new protocol level primitives which allow a single contract to scale to use the throughput capacity of not just one but all shards of the network.

## Specification

### Background

We will use the fungible tokens (FT) contract as an example contract to explain the specification.  This section will briefly explain how this contract works on the network today.

The contract consists of state where all the user' account balances are stored in a single HashMap data structure.  When a user wishes to transfer some FT to another user, the following steps take place:

- The sender sends a transaction with a function call action to the contract to transfer the tokens from one account to another.
- This transaction is routed to the shard where the user's account lives where it is converted to a receipt.
- Then the receipt is routed to the shard where the FT contract lives.
- Once it arrives on the FT contract's shard, the receipt is executed, the function call is performed, and the transfer is performed.

The minimum latency of doing a single transaction is 2 blocks.  In the first block, the transaction is converted to a receipt and if needed the receipt is routed to another shard.  Then in the second block, the receipt executes on the FT contract.  Additionally, note that each FT transfer requires exactly one function call.

### Limitations

Since all the account balances are stored in a single contract, this one contract has to be invoked in order to make any transfers.  Therefore, the maximum TPS of this contract is the maximum TPS of the shard it is deployed on.  The only way to increase this capacity would be to increase the capacity of the shard.  Adding more shards does not help.

### Sharded FT contract

In the centralised FT contract above, all the state is stored in a single centralised location.  The opposite extreme of this approach would be to store all the state in as distributed a manner as possible i.e. the account balances of each user is stored locally on their accounts instead.

If the state were stored in such a distributed manner, performing a FT transfer would require the following steps.

- The sender would send a transaction to their account to transfer some tokens to the receiver.
- The transaction is converted to a receipt and the receipt is guaranteed to execute on the same shard as the account to execute it against is the same account that is used to convert the transaction into a receipt.
- When the receipt is executed, the sender's balance is deducted and a cross contract receipt is sent to the receiver's account to increase its balance.
- The receipt arrives at the receiver's shard and is executed, which increases the receiver's account balance.

Comparing this approach to the centralised approach, we note the following:

- Instead of 1 function call, this approach always requires 2 function calls.  One on the sender's account and one on the receiver's account.
- Unlike the centralised case where sometimes the minimum latency is 1 block, in this case, the minimum latency will always be 2 blocks.  Even if both the sender and the receiver accounts live on the same shard, a following cross contract receipt always executes the earliest in the next block.
- In the centralised situation, all function calls took place on a single shard, assuming a uniform distribution of accounts across the network, the 2 function calls will be uniformly distributed across all the shards of the network.  This implies that the maximum TPS of this application scenario will be the sum of the TPS of all the shards on the network.

In order to enable the above scenario, we need the following new primitives in the NEAR protocol:

- Global contract code: Each user account needs to deploy the sharded version of the FT contract on their account.  If the application has many users, doing this deployment can become quite expensive and it also feels unnecessary as each user is using exactly the same contract code.  Here, we propose to rely on the ongoing work of GlobalContracts.  More specifically, we will be using the `AccountId` version of this work.  This is because when the owner of the application wants to upgrade their contract code, they need all the users to upgrade as well otherwise their users will be fragmented between different versions of the contract.
- Storage namespace: The account balance state that is stored locally on the users' account needs to be protected.  Users cannot be allowed to modify this state directly because that will allow a malicious user the ability to corrupt the application state.  In the FT contract example, a malicious user could simply increase their balance and maliciously mint tokens.
- Any account can send messages to any other account on NEAR.  In order to ensure safe FT transfers, there are some access control issues we will need to address.
- Finally, there are some concerns about how a sharded contract will upgrade itself and the related state.

### Storage namespaces

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
