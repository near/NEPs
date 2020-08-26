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

Each transaction consists a list of actions to be performed on the `receiver_id` side. Sometimes `signer_id` equals to `receiver_id`. 
For the following actions, `signer_id` and `receiver_id` are required to be equal:
- `DeployContract`
- `Stake`
- `AddKey`
- `DeleteKey`
- `DeleteAccount`

Actions requires arguments and use data from the `Transaction` itself.

## CreateAccountAction

```rust
pub struct CreateAccountAction {}
```

_Requirements:_

- _unique `tx.receiver_id`_
- _`public_key` to be `AccessKeyPermission::FullAccess` for the `signer_id`_

`CreateAccountAction` doesn't take any additional arguments, it uses `receiver_id` from Transaction. `receiver_id` is an ID for an account to be created. Account ID should be [valid](Account.md#account-id) and **unique** throughout the system.

**Outcome**:
- creates an account with `id` = `receiver_id`
- sets Account `storage_usage` to `account_cost` (genesis config)
- sets Account `storage_paid_at` to the current block height

**Errors**:
- If the action tries to create a top level account whose length is no greater than 32 characters, and `predecessor_id` is not
`registrar_account_id`, the following error will be returned
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

NOTE: for the all subsequent actions in the transaction the `signer_id` becomes `receiver_id` until [DeleteAccountAction](#DeleteAccountAction). It allows to execute actions on behalf of the just created account.

## DeployContractAction

```rust
pub struct DeployContractAction {
    pub code: Vec<u8>, // a valid WebAssembly code
}
```

_Requirements:_

- _`tx.signer_id` to be equal to `receiver_id`_
- _`tx.public_key` to be `AccessKeyPermission::FullAccess` for the `signer_id`_

**Outcome**:
- sets the contract code for account

**Errors**

- If state or storage is corrupted, it may return `StorageError`. Otherwise this action should not lead to errors.

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

_Requirements:_

- _`tx.public_key` to be `AccessKeyPermission::FullAccess` or `AccessKeyPermission::FunctionCall`_

Calls a method of a particular contract. See [details](./FunctionCall.md).

## TransferAction

```rust
pub struct TransferAction {
    /// Amount of tokens to transfer to a receiver_id
    pub deposit: Balance,
}
```

_Requirements:_

- _`tx.public_key` to be `AccessKeyPermission::FullAccess` for the `singer_id`_

**Outcome**:
- transfers amount specified in `deposit` from `tx.signer` to a `tx.receiver_id` account

**Errors**:
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

_Requirements:_

- _`tx.signer_id` to be equal to `receiver_id`_
- _`tx.public_key` to be `AccessKeyPermission::FullAccess` for the `singer_id`_


**Outcome**:
- A validator proposal that contains the staking public key and the staking amount is generated and will be included
in the next block.

**Errors**:
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

_Requirements:_

```rust
pub struct AddKeyAction {
    pub public_key: PublicKey,
    pub access_key: AccessKey,
}
```

- _`tx.signer_id` to be equal to `receiver_id`_
- _`tx.public_key` to be `AccessKeyPermission::FullAccess` for the `signer_id`_

**Outcome**:
- Associates an [AccessKey](AccessKey) with a `public_key` provided.

**Errors**:
- If an account tries to add an access key that already exists, the following error will be returned
```rust
/// The public key is already used for an existing access key
AddKeyAlreadyExists { account_id: AccountId, public_key: PublicKey }
```
- If state or storage is corrupted, a `StorageError` will be returned.

## DeleteKeyAction

_Requirements:_

```rust
pub struct DeleteKeyAction {
    pub public_key: PublicKey,
}
```

- _`tx.signer_id` to be equal to `receiver_id`_
- _`tx.public_key` to be `AccessKeyPermission::FullAccess` for the `signer_id`_

**Outcome**:
- Deletes the [AccessKey](AccessKey) associated with `public_key`.

**Errors**:
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

_Requirements:_

- _`tx.signer_id` to be equal to `receiver_id`_
- _`tx.public_key` to be `AccessKeyPermission::FullAccess` for the `signer_id`_
- _`tx.account shouldn't have any locked balance`_

**Outcomes**:
- The account, as well as all the data stored under the account, is deleted and the tokens are transferred to `beneficiary_id`.

**Errors**:
- If state or storage is corrupted, a `StorageError` is returned.
