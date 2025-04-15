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
pub enum AccountContractType {
    None,
    Local(CryptoHash),
    Global(CryptoHash),
    /// The contract code is deployed on a single global account.
    /// `times_upgraded` is a monotonically increasing counter that shows how
    /// many times the contract has been upgraded.
    GlobalByAccount {
        /// Account id of the global account where the contract code is deployed.
        account_id: AccountId,
        /// A monotonically increasing counter that counts how many times the
        /// global contract code has been upgraded.
        times_upgraded: u64,
    },
}

fn send_tokens(amount: Balance, receiver: AccountId) {
    // Only the owner of this account is allowed to transfer funds out of it.
    let my_account_id: AccountId = env::current_account_id();
    let msg_sender: AccountId = env::signer_account_id();
    assert_eq!(my_account_id, msg_sender);

    // Update the account balance
    let mut my_balance: Balance = storage_read(key = "balance");
    assert!(my_balance >= amount);
    my_balance -= amount;
    storage_write(key = "balance", value = my_balance);

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
    let my_account_contract: AccountContractType = env::current_account_contract();
    let signer_account_contract: AccountContractType = env::signer_account_contract();
    match (my_account_contract, signer_account_contract) {
        (
            AccountContractType::GlobalByAccount {
                account_id: my_account_id,
                times_upgraded: my_times_upgraded,
            },
            AccountContractType::GlobalByAccount {
                account_id: signer_account_id,
                times_upgraded: signer_times_upgraded,
            },
        ) => {
            assert_eq!(my_account_id, signer_account_id);
            // It is possible that in between the signer sending the message and
            // the current account executing it, the global contract has been
            // upgraded.  This means that the version of the contract that sent
            // the message is different than the version that is executing it.
            // This might potentially introduce some subtle malicious issues
            // depending on the differences between the two versions. Hence, the
            // receiver rejects any messages that are not sent from the same
            // version as current.
            assert_eq!(my_times_upgraded, signer_times_upgraded);
        }
        _ => panic!(),
    }

    // Update the account balance
    let mut my_balance: Balance = storage_read(key = "balance");
    my_balance += amount;
    storage_write(key = "balance", value = my_balance);
}

```

Each user that wants to use the sharded FT contract has to deploy the above global contract on their account.  The contract stores and manages the users' token balance locally.

Let's say that `alice.near` wants to send some FT tokens to `bob.near`.  The following steps will take place:

- Alice sends a transaction to their account to call `send_tokens()`.  The transaction is converted into a receipt and if there is enough capacity, then the receipt is executed in the same block.
- Executing `send_tokens()` does not require any new host functions.  The function ensures that the signer of the message is also the owner of the account as only the owner of the account should be allowed to transfer tokens; it updates the `balance`; and sends a message to call `receive_tokens` on `bob.near` to receive the tokens.
- Executing `receive_tokens()` requires two new host functions.  These host functions allow the smart contract to inspect what kind of contract code is deploy on the current account and on the account that called it.  This allows the smart contract to ensure that the caller and the current account are both using the same global contract code,  which convinces the receiver that the sender has indeed decremented its `balance` appropriately and that there is no malicious minting of tokens.  Finally, the receiver increments its `balance` appropriately.

Comparing this approach to the centralised approach, we note the following:

- Instead of 1 function call, this approach always requires 2 function calls.  One on the sender's account and one on the receiver's account.
- Just like the centralised case, the minimum latency is 2 blocks.  Even if both the sender and the receiver accounts live on the same shard, a following cross contract receipt always executes the earliest in the next block.
- In the centralised situation, all function calls took place on a single shard, assuming a uniform distribution of accounts across the network, the 2 function calls will be uniformly distributed across all the shards of the network.  This implies that the maximum TPS of this application scenario will be the sum of the TPS of all the shards on the network.

Note that this work builds on top of the ongoing work of enabling [Global contract code](https://github.com/near/NEPs/pull/591).

Below we discuss the additional primitives that are needed to support this work.

### Host function calls to inspect contract code types

As seen in the `receive_tokens()` function above, in certain cases, the smart contract needs to be able to verify that it is communicating with another instance of itself.  

Implementing the host function to inspect the contract code type of the local account should be fairly straightforward as this information is going to be stored locally on the account.

In order to be able to inspect the contract code type of the signer account, we `Receipt` data structure has to be enhanced in roughly the following manner.

```rust
pub enum Receipt {
    V0(ReceiptV0),
    V1(ReceiptV1),
    V2(ReceiptV2),
}

pub struct ReceiptV2 {
    /// An issuer account_id of a particular receipt.
    /// `predecessor_id` could be either `Transaction` `signer_id` or intermediate contract's `account_id`.
    pub predecessor_id: AccountId,
    /// `receiver_id` is a receipt destination.
    pub receiver_id: AccountId,
    /// An unique id for the receipt
    pub receipt_id: CryptoHash,
    /// A receipt type
    pub receipt: ReceiptEnum,
    /// Priority of a receipt
    pub priority: u64,
    /// What type of contract code is deployed on the predecessor
    pub predecessor_account_contract_type: AccountContractType,
}
```

Whenever a contract calls another contract, that causes a new receipt to be created.  This receipt needs to contain information about the caller's contract code type.

The other relevant bit of data that needs to be updated is the `AccountContractType::GlobalByAccount::times_upgraded` field, which denotes how many times the global contract has been upgraded.  This information cannot be updated when a global contract is actually upgraded as that would require storing a list of all the accounts that are using a global contract and further it could be prohibitively expensive to update that information proactively.  Instead, this field probably needs to be updated when an account that is using a global contract is actually accessed.

TODO: maybe the global contract NEP needs to be updated to help track `times_upgraded` field.

TODO: discuss the gas implications of making the receipts bigger.

### Protecting contract storage

The sharded contract is storing its state locally on the users' account.  This can allow a malicious user to tamper with the storage in undesirable ways.  In the FT example able, a user could do the following:

- Before deploying the FT contract on itself, the user could already create the `balance` key in its storage and set its value to be arbitrarily large to maliciously mint tokens.
- Deploy a subaccount or use other methods to be able to maliciously modify the storage and change the `balance` in malicious ways.

To prevent such attacks, we propose that when a contract code is deployed on an account, its storage is walled off by using namespaces which prevents other contract codes access to it.  Note that this strategy is being used to create per account namespaces to ensure that one account cannot access another account's storage.  In particular, when a contract code tries to do a `storage_write()` or `storage_read()` for a key `foo`, the `AccountId` of the account the contract code is running on is prepended to the key.  This creates a separate namespace for each account on the network that cannot be accessed by other accounts.

Our proposal is similar.  Each contract code that is deployed on an account gets its own namespace.  The namespace can be constructed by updating the `RuntimeExt::create_storage_key` function that is currently used to add the prefix to something like below.

```rust
    pub fn create_storage_key(
        &self,
        contract_code_type: &AccountContractType,
        key: &[u8],
    ) -> TrieKey {
        let account_id = self.account_id.clone();
        match contract_code_type {
            AccountContractType::None => unreachable!(),
            // The current use case
            AccountContractType::Local(_) => {
                TrieKey::ContractData { account_id, key: key.to_vec() }
            }
            AccountContractType::Global(hash) => {
                TrieKey::ContractDataGlobalContract { account_id, hash, key: key.to_vec() }
            }
            AccountContractType::GlobalByAccount(global_account_id) => {
                TrieKey::ContractDataGlobalByAccount {
                    global_account_id,
                    account_id,
                    key: key.to_vec(),
                }
            }
        }
    }
```

As seen above, each type of code deployment gets its own unique prefix that is added to the key which creates a separate namespace for them that is not accessible to other code deployments.

TODO: discuss how to get access to `AccountContractType` when calling `create_storage_key()`.

### Enabling multiple contract codes on a single account

A big issue with the proposal above is that currently a account can only have a single contract deployed on it.  In the FT example, this would imply that a single account can only hold a single type of token and if a user wants to hold multiple different tokens, then the user will have to create multiple accounts which would not be a good user experience as they would have to manage multiple private keys, etc.  Ideally, a single account can still host multiple FT contracts.

TODO: how to solve this problem.  Can we use subaccounts?  If not, then when sending a message to another account, we need to be able to specify the contract code on the destination account as well.

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

- Use `set_initialise` instead of storage namespaces
- A single instance of the sharded contract per shard

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
