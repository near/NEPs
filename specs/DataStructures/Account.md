# Accounts

## Account ID

NEAR Protocol has an account names system. Account ID is similar to a username. Account IDs have to follow the rules.

### Account ID Rules

- minimum length is 2
- maximum length is 64
- **Account ID** consists of **Account ID parts** separated by `.`
- **Account ID part** consists of lowercase alphanumeric symbols separated by either `_` or `-`.
- **Account ID** that is 64 characters long and consists of lowercase hex characters is a specific **implicit account ID**.

Account names are similar to a domain names.
Top level account (TLA) like `near`, `com`, `eth` can only be created by `registrar` account (see next section for more details).
Only `near` can create `alice.near`. And only `alice.near` can create `app.alice.near` and so on.
Note, `near` can NOT create `app.alice.near` directly.

Additionally, there is an implicit account creation path. Account ids, that are 64 character long, can only be created with `AccessKey` that matches account id via `hex` derivation. Allowing to create new key pair - and the sender of funds to this account to actually create an account.

Regex for a full account ID, without checking for length:

```regex
^(([a-z\d]+[\-_])*[a-z\d]+\.)*([a-z\d]+[\-_])*[a-z\d]+$
```

### Top Level Accounts

| Name | Value |
| - | - |
| REGISTRAR_ACCOUNT_ID | `registrar` |
| MIN_ALLOWED_TOP_LEVEL_ACCOUNT_LENGTH | 32 |

Top level account names (TLAs) are very valuable as they provide root of trust and discoverability for companies, applications and users.
To allow for fair access to them, the top level account names that are shorter than `MIN_ALLOWED_TOP_LEVEL_ACCOUNT_LENGTH` characters going to be auctioned off.

Specifically, only `REGISTRAR_ACCOUNT_ID` account can create new top level accounts that are shorter than `MIN_ALLOWED_TOP_LEVEL_ACCOUNT_LENGTH` characters. `REGISTRAR_ACCOUNT_ID` implements standard Account Naming (link TODO) interface to allow create new accounts.

```python
def action_create_account(predecessor_id, account_id):
    """Called on CreateAccount action in receipt."""
    if len(account_id) < MIN_ALLOWED_TOP_LEVEL_ACCOUNT_LENGTH and predecessor_id != REGISTRAR_ACCOUNT_ID:
        raise CreateAccountOnlyByRegistrar(account_id, REGISTRAR_ACCOUNT_ID, predecessor_id)
    # Otherwise, create account with given `account_id`.
```

*Note: we are not going to deploy `registrar` auction at launch, instead allow to deploy it by Foundation after initial launch. The link to details of the auction will be added here in the next spec release post MainNet.*

### Examples

Valid accounts:

```c
ok
bowen
ek-2
ek.near
com
google.com
bowen.google.com
near
illia.cheap-accounts.near
max_99.near
100
near2019
over.9000
a.bro
// Valid, but can't be created, because "a" is too short
bro.a
```

Invalid accounts:

```c
not ok           // Whitespace characters are not allowed
a                // Too short
100-             // Suffix separator
bo__wen          // Two separators in a row
_illia           // Prefix separator
.near            // Prefix dot separator
near.            // Suffix dot separator
a..near          // Two dot separators in a row
$$$              // Non alphanumeric characters are not allowed
WAT              // Non lowercase characters are not allowed
me@google.com    // @ is not allowed (it was allowed in the past)
system           // cannot use the system account, see the section on System account below
// TOO LONG:
abcdefghijklmnopqrstuvwxyz.abcdefghijklmnopqrstuvwxyz.abcdefghijklmnopqrstuvwxyz
```

## System account

`system` is a special account that is only used to identify refund receipts. For refund receipts, we set the predecessor_id to be `system` to indicate that it is a refund receipt. Users cannot create or access the `system` account. In fact, this account does not exist as part of the state. 

## Implicit account IDs

Implicit accounts work similarly to Bitcoin/Ethereum accounts.
It allows you to reserve an account ID before it's created by generating a ED25519 key-pair locally.
This key-pair has a public key that maps to the account ID. The account ID is a lowercase hex representation of the public key.
ED25519 Public key is 32 bytes that maps to 64 characters account ID.

Example: public key in base58 `BGCCDDHfysuuVnaNVtEhhqeT4k9Muyem3Kpgq2U1m9HX` will map to an account ID `98793cd91a3f870fb126f66285808c7e094afcfc4eda8a970f6648cdf0dbd6de`.

The corresponding secret key allows you to sign transactions on behalf of this account once it's created on chain.

### Implicit account creation

An account with implicit account ID can only be created by sending a transaction/receipt with a single `Transfer` action to the implicit account ID receiver:

- The account will be created with the account ID.
- The account will have a new full access key with the ED25519-curve public key of `decode_hex(account_id)` and nonce `0`.
- The account balance will have a transfer balance deposited to it.

This account can not be created using `CreateAccount` action to avoid being able to hijack the account without having the corresponding private key.

Once an implicit account is created it acts as a regular account until it's deleted.

## Account

Data for an single account is collocated in one shard. The account data consists of the following:

- Balance
- Locked balance (for staking)
- Code of the contract
- Key-value storage of the contract. Stored in a ordered trie
- [Access Keys](AccessKey.md)
- [Postponed ActionReceipts](../RuntimeSpec/Receipts.md#postponed-actionreceipt)
- [Received DataReceipts](../RuntimeSpec/Receipts.md#received-datareceipt)

#### Balances

Total account balance consists of unlocked balance and locked balance.

Unlocked balance is tokens that the account can use for transaction fees, transfers staking and other operations.

Locked balance is the tokens that are currently in use for staking to be a validator or to become a validator.
Locked balance may become unlocked at the beginning of an epoch. See [Staking](../BlockchainLayer/EpochManager/Staking.md) for details.

#### Contracts

A contract (AKA smart contract) is a program in WebAssembly that belongs to a specific account.
When account is created, it doesn't have a contract.
A contract has to be explicitly deployed, either by the account owner, or during the account creation.
A contract can be executed by anyone who calls a method on your account. A contract has access to the storage on your account.

#### Storage

Every account has its own storage. It's a persistent key-value trie. Keys are ordered in lexicographical order.
The storage can only be modified by the contract on the account.
Current implementation on Runtime only allows your account's contract to read from the storage, but this might change in the future and other accounts's contracts will be able to read from your storage.

NOTE: Accounts must maintain a minimum amount of value at a rate of 1 NEAR per 100kb of total storage in order to remain responsive.
This includes the storage of the account itself, contract code, contract storage, and all access keys.
Any account with less than this minimum amount will not be able to maintain a responsive contract and will, instead, return an error related to this mismatch in storage vs. minimum account balance.
See [Storage Staking](https://docs.near.org/concepts/storage/storage-staking) in the docs.

#### Access Keys

An access key grants an access to a account. Each access key on the account is identified by a unique public key.
This public key is used to validate signature of transactions.
Each access key contains a unique nonce to differentiate or order transactions signed with this access key.

An access key has a permission associated with it. The permission can be one of two types:

- `FullAccess` permission. It grants full access to the account.
- `FunctionCall` permission. It grants access to only issued function call transactions.

See [Access Keys](AccessKey.md) for more details.
