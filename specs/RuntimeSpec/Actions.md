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

Each transaction consists a list of actions to be performed on the `receiver_id` side. Sometimes the `singer_id` equals to `receiver_id`. There is a set of action types when `signer_id` and `receiver_id` are required to be equal. Actions requires arguments and use data from the `Transaction` itself.

// TODO: how to introduce the concept of `sender_id`

## CreateAccountAction
_Requirements:_

- _unique `tx.receiver_id`_
- _`public_key` to be `AccessKeyPermission::FullAccess` for the `singer_id`_

`CreateAccountAction` doesn't take any additional arguments, it uses `receiver_id` from Transaction. `receiver_id` is an ID for an account to be created. Account ID should be [valid](Account.md#account-id) and **unique** throughout the system.

**Outcome**:
- creates an account with `id` = `receiver_id`
- sets Account `storage_usage` to `account_cost` (genesis config)
- sets Account `storage_paid_at` to the current block height

NOTE: for the all subsequent actions in the transaction the `signer_id` becomes `receiver_id` until [DeleteAccountAction](#DeleteAccountAction). It allows to execute actions on behalf of the just created account.

```rust
pub struct CreateAccountAction {}
```

## DeployContractAction

_Requirements:_

- _`tx.signer_id` to be equal to `receiver_id`_
- _`tx.public_key` to be `AccessKeyPermission::FullAccess` for the `singer_id`_

**Outcome**:
- sets a code for account

```rust
pub struct DeployContractAction {
    pub code: Vec<u8>, // a valid WebAssembly code
}
```

## FunctionCallAction

_Requirements:_

- _`tx.public_key` to be `AccessKeyPermission::FullAccess` or `AccessKeyPermission::FunctionCall`_

Calls a method of a particular contract. See [details](./FunctionCall.md).

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

## TransferAction

_Requirements:_

- _`tx.public_key` to be `AccessKeyPermission::FullAccess` for the `singer_id`_

**Outcome**:
- transfers amount specified in `deposit` from `tx.signer` to a `tx.receiver_id` account

```rust
pub struct TransferAction {
    /// Amount of tokens to transfer to a receiver_id
    pub deposit: Balance,
}
```

## StakeAction

_Requirements:_

- _`tx.signer_id` to be equal to `receiver_id`_
- _`tx.public_key` to be `AccessKeyPermission::FullAccess` for the `singer_id`_

```rust
pub struct StakeAction {
    // Amount of tokens to stake
    pub stake: Balance,
    // This public key is a public key of the validator node
    pub public_key: PublicKey,
}
```
**Outcome**:
```
// TODO: cover staking
```
## AddKeyAction

_Requirements:_

- _`tx.signer_id` to be equal to `receiver_id`_
- _`tx.public_key` to be `AccessKeyPermission::FullAccess` for the `singer_id`_

Associates an [AccessKey](AccessKey) with a `public_key` provided.

```rust
pub struct AddKeyAction {
    pub public_key: PublicKey,
    pub access_key: AccessKey,
}
```

## DeleteKeyAction

_Requirements:_

- _`tx.signer_id` to be equal to `receiver_id`_
- _`tx.public_key` to be `AccessKeyPermission::FullAccess` for the `singer_id`_

```rust
pub struct DeleteKeyAction {
    pub public_key: PublicKey,
}
```

## DeleteAccountAction

_Requirements:_

- _`tx.signer_id` to be equal to `receiver_id`_
- _`tx.public_key` to be `AccessKeyPermission::FullAccess` for the `singer_id`_
- _`tx.account shouldn't have any locked balance`_

```rust
pub struct DeleteAccountAction {
    /// The remaining account balance will be transferred to the AccountId below
    pub beneficiary_id: AccountId,
}
```
