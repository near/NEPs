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
        sharded_contract_id: GlobalContractCodeIdentifier,
        // These two arguments are a simplification of the existing args
        // for the normal cross contract call.
        function: &str,
        args: Balance,
    );
}

type ShardedContractInfo = GlobalContractCodeIdentifier;

enum GlobalContractCodeIdentifier {
    CodeHash(CryptoHash),
    AccountId(AccountId),
}



// A smart contract function that can be used to initiate a FT transfer.
fn send_tokens(amount: Balance, receiver: AccountId) {
    // Avoid function call access keys from calling this method by requiring
    // one yocto near as attached balance.
    // This also stops limited sharded contracts from using this method.
    near_sdk::assert_one_yocto();

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

    assert_eq!(
        my_sharded_contract_info,
        sender_sharded_contract_info,
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

1. Each user that wants to use a sharded FT contract `ft.near`, will first deploy it on their account using the `SetShardedContractPermissionsAction` action, with `permissions: ShardedContractPermission::Limited { reserved_balance: 0 }`.
2. When `alice.near` wants to transfer tokens to `bob.near`, Alice calls the `send_tokens()` function on the sharded FT contract on her account using the `ShardedFunctionCallAction` action, setting `receiver_sharded_contract_id: "ft.near"`.
3. `send_tokens()` ensures that caller is `alice.near` and has 1 yocto NEAR attached, as full access to `alice.near` is required to initiate transfers.
4. Next, the contract decrements the balance.  We will discuss access control issues to storage in the namespace section below.
5. Then, it sends a shared cross contract call to `bob.near` using the `ShardedFunctionCallAction` action.
6. `receive_tokens()` executes on `bob.near`.
7. `receive_tokens()` ensures that the caller is an instance of the same sharded contract as itself otherwise it might be possible to mint tokens maliciously.
8. `receive_tokens()` updates the balance stored locally.

Comparing this approach to the centralised approach, we note the following:

- Instead of 1 function call, this approach always requires 2 function calls.  One on the sender's account and one on the receiver's account.
- Just like the centralised case, the minimum latency is 2 blocks.  Even if both the sender and the receiver accounts live on the same shard, a following cross contract receipt always executes the earliest in the next block.
- In the centralised situation, all function calls took place on a single shard, assuming a uniform distribution of accounts across the network, the 2 function calls will be uniformly distributed across all the shards of the network.  This implies that the maximum TPS of this application scenario will be the sum of the TPS of all the shards on the network.

### Requirements

#### Multiple contract codes

One of the main high level requirements for this work is that users should not have to manage multiple sets of keys which would degrade the user experience.  In the FT example, it should be possible for a user to hold multiple FTs without having to manage multiple sets of keys.  This necessitates that multiple sharded contracts can be used by a single account.

A follow on requirement of this is that if multiple contract codes are being used on a single account, then they need proper isolation to ensure that they cannot corrupt each other's state and it should be possible for the account owner to specify resource constraints on what the sharded contract codes can do.


#### Access control on incoming calls

We identified that sharded contracts may want to have 2 types of access control on functions.

First are functions that can only be called by the account owner (e.g. `send_tokens()`).  This scenario is covered by the existing set of host functions and access keys.

Second are functions that can only be called by another instance of the same contract.  Here the `ShardedFunctionCallAction` action provides information about the predecessor and the runtime can provide information about the current account.  And then as seen in `receive_tokens()`, the contract can then perform the appropriate checks.

#### Access control for outgoing function calls

For function calls on contracts, the `predecessor_id` is generally used to identify the caller.  Authorization code today assumes the caller has either a full access or function call access key on the predecessor, or the call originates from the code deployed on the account.

To prevent limited access keys to move assets, such as FTs, an extra authorization step often checks that a function call has non-zero NEAR balance attached, which only a full access key or a contract call can do.

The design of sharded contracts has to enable receivers to know whether they were called by a sharded contract on the predecessor, or by the owner of that account. This is especially tricky with existing code that is unaware of the existence of sharded contracts, hence they only look at the predecessor_id.

#### Storage limits

An account must always hold a certain amount in NEAR balance to cover its storage cost.  Except, below 770 bytes, this limit is not applied to allow small zero-balance accounts. 

Accounts with zero balance are important for the creation of sponsored accounts.  It prevents the incentive to claim and delete as many accounts as possible from a sponsor, since deleting a zero-balance account gives no financial gain.  Ideally, we can also add sharded contracts to an account while keeping its balance at 0.

Sharded contracts require storage for their meta data, as well as for the namespaced state modified by WASM code.  Since sharded contracts do no have a separate balance, the storage usage should be added to the total account storage usage. The ZBA limit of 770 bytes is likely too small for many use cases.

Another consideration is that the user should be able to set a limit on the state used by the sharded contract, given that state can only be deleted by the contract's code. Without limits, a sharded contract could lock up all NEAR tokens held on the account with no way for the user to get it back.

Lastly, contract develops should also have a way to ensure their contract can access enough state.  If users can remove all currently unreserved balance, a contract would fail to increase its storage even by just a byte.


### Detailed specification

With the high level requirements and the pseudocode presented, we can discuss the specification of the new primitives been proposed.

We will reuse many of the mechanisms that are already built to deploy and distribute global contract code.  In particular, when a smart contract developer has built a sharded contract, they will use the `DeployGlobalContractAction` to deploy the code on their contract.  Note that this means that an account can use a global contract code in the sharded contract mode which may not have been the original intention of the smart contract developer.  We do not see any security concerns with allowing this.

#### `SetShardedContractPermissionsAction`

Now that the smart contract developer has deployed their sharded contract on the network, users can start using it.  Assuming that users already have an account, they will use the `SetShardedContractPermissionsAction` to use the sharded contract code on their account.

This action, similar to the `UseGlobalContractAction`, takes a global contract code and enabled it for the account.  However, it does so for a sharded contract, rather than the main contract on the account.

```rust
/// This action allows an account to start using a existing sharded contract code.
///
/// This action can be called multiple times on the same account to allow it to
/// use multiple sharded contract codes simultaneously.
///
/// Calling it with the same sharded contract id again allows updating
/// permissions, including blocking all access by setting permissions to
/// `ShardedContractPermission::None`.  This does not delete any state but it
/// will make all incoming sharded function calls fail.
struct SetShardedContractPermissionsAction {
    // Account id of the account where the sharded contract code is deployed.
    sharded_contract_id: GlobalContractCodeIdentifier,
    permissions: ShardedContractPermission,
}

enum ShardedContractPermission {
    /// The use is no longer using the sharded contract.
    /// Functions equivalent to no using the sharded contract at all.
    None,
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
    /// Code in this sharded contract has a namespaced state but otherwise behaves
    /// exactly like the non-sharded contract on the same account.
    ///
    /// All actions are allowed, including NEAR transfers, deploying contract code,
    /// and normal function calls.  The predecessor_id for function calls is the
    /// account_id, without any way for the receiver to differentiate between a call
    ///from the full access sharded contract vs a non-sharded cross-contract call.
    FullAccess,
}
```

The action allows an account to use a global contract code that is already available on their shard in the sharded contract mode.

Calling this action will insert or update the permission on the user's state trie for the specific sharded contract.

```rust
// new variant in TrieKey stores values of type `ShardedContractPermission`
TrieKey::ShardedContractPermissions { 
    identifier: GlobalContractCodeIdentifier,
}
```


#### `ShardedFunctionCallAction`

Once an account is using a sharded contract code, the sharded contract code can be called using this action.  This action is similar to the `FunctionCallAction` action.  It contains additional information about what type of sharded contract to call on the account.  Note that as seen in the FT example above, this action will also be used when a sharded contract code calls another one.

```rust
/// This is similar to the existing `FunctionCallAction`.  `FunctionCallAction`
/// allows calling contract codes that are deployed using the
/// `DeployContractAction` or the `UseGlobalContractAction` on an account.  This
/// action allows calling contract codes that are deployed using the
/// `SetShardedContractPermissionsAction`.
struct ShardedFunctionCallAction {
    // An account can be using multiple sharded contract codes.  This identifies
    // which one should be called.
    receiver_sharded_contract: CallShardedContractReceiver,
    // additionally arguments are identical to `FunctionCallAction`.
}
```

#### Storage namespace

Today when a local or global contract code call accesses the storage, the following function is used to create the trie key used:

Next, both `storage_write()` and `storage_read()` host functions use the `create_storage_key()` function to access storage.  To provide sufficient isolation for the state that subordinate accounts are creating, the following changes are proposed.

New variants are added to the `TrieKey` to help store the contract data from the subordinate accounts and `create_storage_key` is updated to create the appropriate trie key.  These changes ensure that each subordinate account has its own storage namespace that cannot be accessed or corrupted by others.

```rust
enum TrieKey {
    ...
    // new variant in TrieKey stores user values just like `TrieKey::ContractData`
    TrieKey::ShardedContractData { 
        account_id: AccountId,
        sharded_contract_id: GlobalContractCodeIdentifier,,
        key: Vec<u8>,
    }
}

fn create_storage_key(&self, key: &[u8], contract_type: ContractType) -> TrieKey {
    match contract_type {
        ContractType::MainContract => TrieKey::ContractData {
            account_id: self.account_id.clone(),
            key: key.to_vec(),
        },
        ContractType::Sharded(sharded_contract_id) => {
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

#### Storage Limits

- For limited sharded contracts, the user sets an explicit limit in `SetShardedContractPermissionsAction`.
- Full access sharded contracts have no limits.  They are treated just like the main contract code.
- Each sharded contract, limited or not, has its own ZBA limit that's added on top of the 770 bytes of the main account.

#### ZBA Limits for Sharded Contracts

Each sharded contract, limited or not, has its own ZBA limit that's added on top of the 770 bytes of the main account.  The gas cost of `SetShardedContractPermissionsAction` is increased from its compute cost to pay for this limit in the same way the 770 bytes per account are paid for in the account creation.

The limit per sharded contract is enough to store its permissions and a small number of contract state key-value pairs. Tentative proposal: 300 bytes per sharded contract.

TODO: Exact math on limit

Early estimate:

- `TrieKey::ShardedContractData` requires 1 + 2 * (4 + 64) = 137 bytes  
- `ShardedContractPermission` requires 1 + 16 = 17 bytes
- Storing a `u128` on `balance` requires 16 bytes for the value, 7 bytes for the key, and 40 bytes for `storage_num_extra_bytes_record` = 63 bytes

Hence, the required state of a sharded FT would be 217 bytes.

Using the ft_transfer_call method on an account might require more state per outstanding transfer.  So the initial proposal is 300 bytes.

Unlike the ZBA limit on accounts, even when a sharded contract goes over the ZBA limit, it will only need to maintain balance for the part over the ZBA limit.  (For accounts, once a contract is no longer in the ZBA limit, it has to hold Near for all bytes, since. This made migration easier when introducing ZBAs. Migration is not an issue here.)


#### Storage Limits for Full Access Sharded Contracts

State usage of a full access sharded contract is added directly to the main accounts limits.

However, the ZBA limit per sharded contract (300 bytes) is free and not counted to the total limit.

#### Storage Limits for Limited Sharded Contracts

For limited sharded contracts, the user sets an explicit limit in `SetShardedContractPermissionsAction`.

```rust
SetShardedContractPermissionsAction {
    sharded_contract_id: "alice.near".into(),
    permissions: ShardedContractPermission::Limited {
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



### Access Control


#### Access Keys

All sharded contracts and the parent account share the same set of `AccessKey`s.

If a sharded contract needs to limit access further, it can do so in WASM code, using the new host functions to check if incoming calls are from a sharded contract.


#### Permissions on Function Calls


#### Function Calls from Sharded Contracts

Sharded contracts can be used in two ways:

- Full access: Outgoing function calls look just like they come from the main account, hence they can move assets held on other contracts.
- Limited: No "normal" function calls are allowed, only sharded function calls are possible.

Any receiver of sharded function calls must check the `predecessor_id` + `predecessor_sharded_contract_info` combination for authorization.  This only affects code deployed as sharded contracts.

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

### Deleting an Account with Sharded Contracts

TODO: What happens when deleting an account with state in sharded contracts?


## Reference Implementation

TODO

## Security Implications

TODO

## Alternatives

- Instead of explicit limited access / full-access permissions, we could say the sharded contract `ft.near` on `ft.near` implicitly has full access, while `ft.near` on any other account has only limited access.  This would mean anytime full access is required, we have to go through the central `ft.near@ft.near` account.
- Instead of a ZBA limit per sharded contract, we could add a general way to burn tokens or gas for non-refundable storage on an account.  This would be its own NEP and limit what sharded contracts can do until that other NEP is also designed, approved and implemented.


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
