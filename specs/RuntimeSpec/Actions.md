# Actions

There are a several action types in Near:

```rust
pub enum Action {
    CreateAccount(CreateAccountAction),
    DeployContract(DeployContractAction),
    FunctionCall(FunctionCallAction),
    Transfer(TransferAction),
    Stake(StakeAction),
    AddKey(AddKeyAction),
    DeleteKey(DeleteKeyAction),
    DeleteAccount(DeleteAccountAction),
}
```

Each transaction consists a list of actions to be performed on the `receiver_id` side. Since transactions are first
converted to receipts when they are processed, we will mostly concern ourselves with actions in the context of receipt
processing.
 
For the following actions, `predecessor_id` and `receiver_id` are required to be equal:
- `DeployContract`
- `Stake`
- `AddKey`
- `DeleteKey`
- `DeleteAccount`

NOTE: if the first action in the action list is `CreateAccount`, `predecessor_id` becomes `receiver_id`
for the rest of the actions until `DeleteAccount`. This gives permission by another account to act on the newly created account.

## CreateAccountAction

```rust
pub struct CreateAccountAction {}
```

If `receiver_id` has length == 64, this account id is considered to be `hex(public_key)`, meaning creation of account only succeeds if followed up with `AddKey(public_key)` action.

**Outcome**:
- creates an account with `id` = `receiver_id`
- sets Account `storage_usage` to `account_cost` (genesis config)

### Errors

**Execution Error**:
- If the action tries to create a top level account whose length is no greater than 32 characters, and `predecessor_id` is not
`registrar_account_id`, which is defined by the protocol, the following error will be returned
```rust
/// A top-level account ID can only be created by registrar.
CreateAccountOnlyByRegistrar {
    account_id: AccountId,
    registrar_account_id: AccountId,
    predecessor_id: AccountId,
}
```

- If the action tries to create an account that is neither a top-level account or a subaccount of `predecessor_id`,
the following error will be returned
```rust
/// A newly created account must be under a namespace of the creator account
CreateAccountNotAllowed { account_id: AccountId, predecessor_id: AccountId },
```

## DeployContractAction

```rust
pub struct DeployContractAction {
    pub code: Vec<u8>
}
```

**Outcome**:
- sets the contract code for account

### Errors

**Validation Error**:
- if the length of `code` exceeds `max_contract_size`, which is a genesis parameter, the following error will be returned:
```rust
/// The size of the contract code exceeded the limit in a DeployContract action.
ContractSizeExceeded { size: u64, limit: u64 },
```

**Execution Error**:
- If state or storage is corrupted, it may return `StorageError`.

## FunctionCallAction

```rust
pub struct FunctionCallAction {
    /// Name of exported Wasm function
    pub method_name: String,
    /// Serialized arguments
    pub args: Vec<u8>,
    /// Prepaid gas (gas_limit) for a function call
    pub gas: Gas,
    /// Amount of tokens to transfer to a receiver_id
    pub deposit: Balance,
}
```

Calls a method of a particular contract. See [details](./FunctionCall.md).

## TransferAction

```rust
pub struct TransferAction {
    /// Amount of tokens to transfer to a receiver_id
    pub deposit: Balance,
}
```

**Outcome**:
- transfers amount specified in `deposit` from `predecessor_id` to a `receiver_id` account

### Errors

**Execution Error**:
- If the deposit amount plus the existing amount on the receiver account exceeds `u128::MAX`,
a `StorageInconsistentState("Account balance integer overflow")` error will be returned.

## StakeAction

```rust
pub struct StakeAction {
    // Amount of tokens to stake
    pub stake: Balance,
    // This public key is a public key of the validator node
    pub public_key: PublicKey,
}
```

**Outcome**:
- A validator proposal that contains the staking public key and the staking amount is generated and will be included
in the next block.

### Errors

**Validation Error**:
- If the `public_key` is not an ristretto compatible ed25519 key, the following error will be returned:
```rust
/// An attempt to stake with a public key that is not convertible to ristretto.
UnsuitableStakingKey { public_key: PublicKey },
```

**Execution Error**:
- If an account has not staked but it tries to unstake, the following error will be returned:
```rust
/// Account is not yet staked, but tries to unstake
TriesToUnstake { account_id: AccountId },
```

- If an account tries to stake more than the amount of tokens it has, the following error will be returned:
```rust
/// The account doesn't have enough balance to increase the stake.
TriesToStake {
    account_id: AccountId,
    stake: Balance,
    locked: Balance,
    balance: Balance,
}
```

- If the staked amount is below the minimum stake threshold, the following error will be returned:
```rust
InsufficientStake {
    account_id: AccountId,
    stake: Balance,
    minimum_stake: Balance,
}
```
The minimum stake is determined by `last_epoch_seat_price / minimum_stake_divisor` where `last_epoch_seat_price` is the
seat price determined at the end of last epoch and `minimum_stake_divisor` is a genesis config parameter and its current
value is 10.

## AddKeyAction

```rust
pub struct AddKeyAction {
    pub public_key: PublicKey,
    pub access_key: AccessKey,
}
```

**Outcome**:
- Adds a new [AccessKey](AccessKey) to the receiver's account and associates it with a `public_key` provided.

### Errors:

**Validation Error**:

If the access key is of type `FunctionCallPermission`, the following errors can happen
- If `receiver_id` in `access_key` is not a valid account id, the following error will be returned 
```rust
/// Invalid account ID.
InvalidAccountId { account_id: AccountId },
```

- If the length of some method name exceed `max_length_method_name`, which is a genesis parameter (current value is 256),
the following error will be returned 
```rust
/// The length of some method name exceeded the limit in a Add Key action.
AddKeyMethodNameLengthExceeded { length: u64, limit: u64 },
```

- If the sum of length of method names (with 1 extra character for every method name) exceeds `max_number_bytes_method_names`, which is a genesis parameter (current value is 2000),
the following error will be returned
```rust
/// The total number of bytes of the method names exceeded the limit in a Add Key action.
AddKeyMethodNamesNumberOfBytesExceeded { total_number_of_bytes: u64, limit: u64 }
```

**Execution Error**:
- If an account tries to add an access key with a given public key, but an existing access key with this public key already exists, the following error will be returned
```rust
/// The public key is already used for an existing access key
AddKeyAlreadyExists { account_id: AccountId, public_key: PublicKey }
```
- If state or storage is corrupted, a `StorageError` will be returned.

## DeleteKeyAction

```rust
pub struct DeleteKeyAction {
    pub public_key: PublicKey,
}
```

**Outcome**:
- Deletes the [AccessKey](AccessKey) associated with `public_key`.

### Errors

**Execution Error**:

- When an account tries to delete an access key that doesn't exist, the following error is returned
```rust
/// Account tries to remove an access key that doesn't exist
DeleteKeyDoesNotExist { account_id: AccountId, public_key: PublicKey }
```
- `StorageError` is returned if state or storage is corrupted.

## DeleteAccountAction

```rust
pub struct DeleteAccountAction {
    /// The remaining account balance will be transferred to the AccountId below
    pub beneficiary_id: AccountId,
}
```

**Outcomes**:
- The account, as well as all the data stored under the account, is deleted and the tokens are transferred to `beneficiary_id`.

### Errors

**Validation Error**
- If `beneficiary_id` is not a valid account id, the following error will be returned
```rust
/// Invalid account ID.
InvalidAccountId { account_id: AccountId },
```

- If this action is not the last action in the action list of a receipt, the following error will be returned
```rust
/// The delete action must be a final action in transaction
DeleteActionMustBeFinal
```

- If the account still has locked balance due to staking, the following error will be returned
```rust
/// Account is staking and can not be deleted
DeleteAccountStaking { account_id: AccountId }
```

**Execution Error**:
- If state or storage is corrupted, a `StorageError` is returned.
