# Accounts

## Account ID

[account_id]: #account_id

NEAR Protocol has an account names system. Account ID is similar to a username. Account IDs have to follow the rules.

### Account ID Rules

- minimum length is 2
- maximum length is 64
- **Account ID** consists of **Account ID parts** separated by `.`
- **Account ID part** consists of lowercase alphanumeric symbols separated by either `_` or `-`.

Account names are similar to a domain names.
Anyone can create a top level account (TLA) without separators, e.g. `near`.
Only `near` can create `alice.near`. And only `alice.near` can create `app.alice.near` and so on.
Note, `near` can NOT create `app.alice.near` directly.

Regex for a full account ID, without checking for length:

```regex
^(([a-z\d]+[\-_])*[a-z\d]+\.)*([a-z\d]+[\-_])*[a-z\d]+$
```

There is a rent for the account ID length in case it's less than 11 characters long. See [Economics] for the details.

### Examples

Valid accounts:

```
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

```
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
// TOO LONG:
abcdefghijklmnopqrstuvwxyz.abcdefghijklmnopqrstuvwxyz.abcdefghijklmnopqrstuvwxyz
```

## Account

[account]: #account

Data for an single account is collocated in one shard. The account data consists of the following:

- Balance
- Locked balance (for staking)
- Code of the contract
- Key-value storage of the contract. Stored in a ordered trie
- [Access Keys](AccessKey.md)
- [Postponed ActionReceipts](../Runtime/Receipts.md#postponed-actionreceipt)
- [Received DataReceipts](../Runtime/Receipts.md#received-datareceipt)

#### Balances

Total account balance consists of unlocked balance and locked balance.

Unlocked balance is tokens that the account can use for transaction fees, transfers staking and other operations.

Locked balance is the tokens that are currently in use for staking to be a validator or to become a validator.
Locked balance may become unlocked at the beginning of an epoch. See [Staking] for details.

#### Contracts

A contract (AKA smart contract) is a program in WebAssembly that belongs to a specific account.
When account is created, it doesn't have a contract.
A contract has to be explicitly deployed, either by the account owner, or during the account creation.
A contract can be executed by anyone who calls a method on your account. A contract has access to the storage on your account.

#### Storage

Every account has its own storage. It's a persistent key-value trie. Keys are ordered in lexicographical order.
The storage can only be modified by the contract on the account.
Current implementation on Runtime only allows your account's contract to read from the storage, but this might change in the future and other accounts's contracts will be able to read from your storage.

NOTE: Accounts are charged recurrent rent for the total storage. This includes storage of the account itself, contract code, contract storage and all access keys.

#### Access Keys

An access key grants an access to a account. Each access key on the account is identified by a unique public key.
This public key is used to validate signature of transactions.
Each access key contains a unique nonce to differentiate or order transactions signed with this access key.

An access keys have a permission associated with it. The permission can be one of two types:

- Full permission. It grants full access to the account.
- Function call permission. It grants access to only issue function call transactions.

See [Access Keys] for more details.
