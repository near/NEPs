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
    /// subordinate account.  If this function is called by an account that is
    /// not a sharded subordinate account, then it panics.
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
    // `ShardedFunctionCallAction` then returns information about which sharded
    // contract code that is being used by the current account.
    fn current_sharded_contract_info() -> ShardedContractInfo;

    // A new host function that returns information about the sharded contract
    // code that is being used by the predecessor (i.e. the message sender)
    // account.
    //
    // If the predecessor (i.e. the message sender) called the current account
    // using the new `ShardedFunctionCallAction` information about what type of
    // sharded contract code the predecessor account is using.
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
        /// it, the contract code could have been upgraded.  The field can be
        /// used to ensure that the receiver is using the desired version of
        /// the code.
        expected_code_hash: Option<CryptoHash>,
    },
    /// If an immutable sharded contract code is being called, just the code
    /// hash is required and no versioning information is needed either.
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
        /// Hash of the sharded contract code.
        code_hash: CryptoHash,
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

        ShardedContractInfo::Mutable { account_id, code_hash } => {
            HostFunctions::call_sharded_contract(
                receiver,
                CallShardedContractReceiver::Mutable {
                    account_id,
                    // Ensure that the receiver is using the same version of
                    // the contract code as the sender to ensure that there
                    // are no subtle bugs introduced between upgrades.
                    expected_code_hash: Some(code_hash),
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
            ShardedContractInfo::Mutable { account_id: my_account_id, code_hash: my_code_hash },
            ShardedContractInfo::Mutable { account_id: sender_account_id, code_hash: sender_code_hash },
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
            assert_eq!(my_code_hash, sender_code_hash);
        }
        _ => panic!(),
    }

    // Update the account balance
    let mut my_balance = HostFunctions::storage_read("balance");
    my_balance += amount;
    HostFunctions::storage_write("balance", my_balance);
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

One of the main high level requirements for this work is that users should not have to manage multiple sets of keys which would degrade the user experience.  In the FT example, it should be possible for a user to hold multiple FTs without having to manage multiple sets of keys.  This necessitates that multiple sharded contracts can be used by a single account.

A follow on requirement of this is that if multiple contract codes are being used on a single account, then they need proper isolation to ensure that they cannot corrupt each other's state and it should be possible for the account owner to specify resource constraints on what the sharded contract codes can do.

### Detailed specification

With the high level requirements and the pseudocode presented, we can discuss the specification of the new primitives been proposed.

We will reuse many of the mechanisms that are already built to deploy and distribute global contract code.  In particular, when a smart contract developer has built a sharded contract, they will use the `DeployGlobalContractAction` to deploy the code on their contract.  Note that this means that an account can use a global contract code in the sharded contract mode which may not have been the original intention of the smart contract developer.  We do not see any security concerns with allowing this.

#### `UseShardedContractAction`

Now that the smart contract developer has deployed their sharded contract on the network, users can start using it.  Assuming that users already have an account, they will use the `UseShardedContractAction` to use the sharded contract code on their account.  This action is similar to `UseGlobalContractAction` action but differs in the following ways.

```rust
enum ShardedContractType {
    /// The sharded contract cannot be upgraded
    Immutable {
        // code hash of the contract code.
        code_hash: CryptoHash,
    },
    /// The sharded contract can be upgraded
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
/// subordinate account.
struct UseShardedContractAction {
    /// information about which sharded contract to use
    sharded_contract: ShardedContractType,
}
```

The action allows an account to use a global contract code that is already available on their shard in the sharded contract mode.

This action is also similar to the `CreateAccountAction` action.  Further, this action can be called multiple times to use multiple different sharded contract codes on the same account.  To support this action, we propose that each time this action is issued, a new subordinate account is created.  Details of subordinate accounts are discussed below.

#### `ShardedFunctionCallAction`

Once an account is using a sharded contract code, the sharded contract code can be called using this action.  This action is similar to the `FunctionCallAction` action.  It contains additional information about what type of sharded contract to call on the account.  Note that as seen in the FT example above, this action will also be used when a sharded contract code calls another one.

```rust
/// This is similar to the existing `FunctionCallAction`.  `FunctionCallAction`
/// allows calling contract codes that are deployed using the
/// `DeployContractAction` or the `UseGlobalContractAction` on an account.  This
/// action allows calling contract codes that are deployed using the
/// `UseShardedContractAction`.
struct ShardedFunctionCallAction {
    // An account can be using multiple sharded contract codes.  This identifies
    // which one should be called.
    receiver_sharded_contract: CallShardedContractReceiver,
    // An account can be using multiple sharded contract codes.  This identifies
    // which contract code on the predecessor is sending the action.  If this is
    // `None`, then the caller is not using sharded contract code.
    predecessor_sharded_contract: Option<ShardedContractType>,
    // additionally arguments are identical to `FunctionCallAction`.
}
```

#### `RemoveShardedContractAction`

This action allows a user to stop using sharded contract code that it previously started using.  This is similar to the `DeleteAccountAction` as it will delete the subordinate account.  More details of what precisely will be deleted will be discussed in the subordinate accounts section below.

```rust

/// This action allows an account to stop using a sharded contract code.
///
/// This action is similar to deleting an account as it deletes a sharded
/// subordinate account.
struct RemoveShardedContractAction {
    // Which sharded contract code to delete
    sharded_contract: ShardedContractType,
    // which account should get the remaining NEAR tokens
    beneficiary_id: AccountId,
}

```

### Subordinate accounts

As briefly mentioned above, when there are multiple sharded contract codes being used on a single account, there are two high level requirements that need to be met:

- There should be sufficient isolation between the state that the contract codes are using to ensure that there is no accidental or malicious corruption of state
- Because the sharded contract code can contain bugs, the account should be allowed to set resource constraints on what the sharded contract code is allowed to do

To meet these goals, we propose subordinate accounts.  Subordinate accounts are like normal accounts but have additional constraints.  Below is a chart for these constraints and then we explain them in more details.


Trie column | Content | Duplicated perSubordinate |  
-- | -- | -- | --
col::Account |   |   |  
  | NEAR balance | No | No balance access by default
  | NEAR locked for staking | No | No staking access by default
  | NEAR locked for storage | No | No storage allowance above ZBA by default
  | contract hash | No | Contract hash is stored in col::ShardedContract
col::ContractCode | Full contract code | No | only global contract allowed
col::ContractData | Smart contract state | Yes | isolate state
col::AccessKey | Access keys | No | use same access keys as parent
col::ShardedContract | Contract code and permissions | Yes | New column added for contract permissions

#### Constraints

In the MVP version of subordinate accounts, they will have the following constraints.

Subordinate accounts cannot hold any NEAR tokens.  This will further imply that the maximum amount of state that they can use is limited to [770B](https://github.com/near/NEPs/blob/master/neps/nep-0448.md#specification).  The reason for this constraint is that if subordinate accounts can hold tokens, then they could send these tokens to other accounts in cross contract function calls which the parent account might want to restrict.  A bigger concern is that if the sharded contract was allowed to create arbitrarily large amounts of `ContractData`, then removing them might be difficult.  Today when an account is deleted, all of its `ContractData` is also deleted.  To ensure that deleting an account does not take too long, if an account has more than 10KiB of data, then it cannot be deleted.  To avoid these complications, in the MVP, we propose that subordinate accounts cannot hold tokens which ensures that they cannot accidentally / maliciously send tokens to other accounts and create arbitrarily large `ContractData`.

Subordinate accounts are allowed to access only a restricted set of host functions.

XXX: write down the exact list below.

In particular, subordinate accounts are not allowed to create `FunctionCallAction` actions.  This is because, without further modifications to the protocol, the receiver of such actions would not be able to tell which contract code was calling it and it would allow a subordinate account to impersonate the parent account.

#### Specification

When `UseShardedContractAction` is called, a new subordinate account is created.  To support this, the `Account` struct is updated to the following:

```rust
pub enum Account {
    V1(AccountV1),
    V2(AccountV2),
    V3(AccountV3),
}

enum ShardedContract {
    Immutable(CryptoHash),
    Mutable{
        account_id: AccountId,
        code_hash: CryptoHash,
    },
}

struct SubordinateAccount {
    /// This is guaranteed to not be higher than 770Bytes
    storage_usage: StorageUsage,
    contract: ShardedContract,
}

enum AccountV3 {
    // Supports existing local and global types
    Standard(AccountV2),
    Subordinate(SubordinateAccount),
}
```

Note that subordinate accounts do not have the ability to store tokens.  This means that they cannot send or receive tokens.  Further, the amount of state they can create is limited to 770 as per the zero balance accounts feature.

Next, both `storage_write()` and `storage_read()` host functions use the `create_storage_key()` function to access storage.  To provide sufficient isolation for the state that subordinate accounts are creating, the following changes are proposed.

```rust
enum TrieKey {
    ...
    ShardedImmutableContractData {
        account_id: AccountId,
        code_hash: CryptoHash,
        key: Vec<u8>,
    },
    ShardedMutableContractData {
        account_id: AccountId,
        code_account_id: AccountId,
        key: Vec<u8>,
    },
}

pub fn create_storage_key(&self, key: &[u8], account_type: &AccountV3) -> TrieKey {
    match account_type {
        AccountV3::Standard(_) => {
            TrieKey::ContractData { account_id: self.account_id.clone(), key: key.to_vec() }
        }
        AccountV3::Subordinate(subordinate_account) => match subordinate_account.contract {
            ShardedContract::Immutable(code_hash) => TrieKey::ShardedImmutableContractData {
                account_id: self.account_id.clone(),
                code_hash,
                key: key.to_vec(),
            },
            ShardedContract::Mutable(code_account_id) => TrieKey::ShardedMutableContractData {
                account_id: self.account_id.clone(),
                code_account_id,
                key: key.to_vec(),
            },
        },
    }
}
```

New variants are added to the `TrieKey` to help store the contract data from the subordinate accounts and `create_storage_key` is updated to create the appropriate trie key.  These changes ensure that each subordinate account has its own storage namespace that cannot be accessed or corrupted by others.

Finally, as shown in the chart above, all subordinate accounts and the parent account share the same set of `AccessKey`s.

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
