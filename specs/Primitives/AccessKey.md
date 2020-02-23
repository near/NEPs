# Access Keys

Access key provides an access for a particular account. Each access key belongs to some account and
is identified by a unique (within the account) public key. Access keys are stored as `account_id,public_key` in a trie state. Account can have from [zero](#account-without-access-keys) to multiple access keys.

```rust
pub struct AccessKey {
    /// The nonce for this access key.
    /// NOTE: In some cases the access key needs to be recreated. If the new access key reuses the
    /// same public key, the nonce of the new access key should be equal to the nonce of the old
    /// access key. It's required to avoid replaying old transactions again.
    pub nonce: Nonce,
    /// Defines permissions for this access key.
    pub permission: AccessKeyPermission,
}
```

There are 2 types of `AccessKeyPermission` in Near currently: `FullAccess` and `FunctionCall`. `FunctionCall` grants a permission to issue any action on account like [DeployContract](Transaction#DeployContract), [Transfer](Transaction#Transfer) tokens to other account, call functions [FunctionCall](Transaction#FunctionCall), [Stake](Transaction#Stake) and even delete account [DeleteAccountAction](Transaction#DeleteAccountAction). `FullAccess` also allow to manage access keys. `AccessKeyPermission::FunctionCall` limits to do only contract calls.

```rust
pub enum AccessKeyPermission {
    FunctionCall(FunctionCallPermission),
    FullAccess,
}
```

## AccessKeyPermission::FunctionCall

Grants limited permission to make [FunctionCall](Transaction#FunctionCall) to a specified `receiver_id` and methods of a particular contract with a limit of allowed balance to spend.

```rust
pub struct FunctionCallPermission {
    /// Allowance is a balance limit to use by this access key to pay for function call gas and
    /// transaction fees. When this access key is used, both account balance and the allowance is
    /// decreased by the same value.
    /// `None` means unlimited allowance.
    /// NOTE: To change or increase the allowance, the old access key needs to be deleted and a new
    /// access key should be created.
    pub allowance: Option<Balance>,

    /// The access key only allows transactions with the given receiver's account id.
    pub receiver_id: AccountId,

    /// A list of method names that can be used. The access key only allows transactions with the
    /// function call of one of the given method names.
    /// Empty list means any method name can be used.
    pub method_names: Vec<String>,
}
```

## Account without access keys

If account has no access keys attached it means that it has no owner who can run transactions from its behalf. However, if such accounts has code it can be invoked by other accounts and contracts.
