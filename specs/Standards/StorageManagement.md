# Storage Management

## [NEP-145](https://github.com/near/NEPs/blob/master/neps/nep-0145.md)

Version `1.0.0`

NEAR uses [storage staking] which means that a contract account must have sufficient balance to cover all storage added over time. This standard provides a uniform way to pass storage costs onto users. It allows accounts and contracts to:

1. Check an account's storage balance.
2. Determine the minimum storage needed to add account information such that the account can interact as expected with a contract.
3. Add storage balance for an account; either one's own or another.
4. Withdraw some storage deposit by removing associated account data from the contract and then making a call to remove unused deposit.
5. Unregister an account to recover full storage balance.

  [storage staking]: https://docs.near.org/concepts/storage/storage-staking

Prior art:

- A previous fungible token standard ([NEP-21](https://github.com/near/NEPs/pull/21)) highlighting how [storage was paid](https://github.com/near/near-sdk-rs/blob/1d3535bd131b68f97a216e643ad1cba19e16dddf/examples/fungible-token/src/lib.rs#L92-L113) for when increasing the allowance of an escrow system.

## Example scenarios

To show the flexibility and power of this standard, let's walk through two example contracts.

1. A simple Fungible Token contract which uses Storage Management in "registration only" mode, where the contract only adds storage on a user's first interaction.
   1. Account registers self
   2. Account registers another
   3. Unnecessary attempt to re-register
   4. Force-closure of account
   5. Graceful closure of account
2. A social media contract, where users can add more data to the contract over time.
   1. Account registers self with more than minimum required
   2. Unnecessary attempt to re-register using `registration_only` param
   3. Attempting to take action which exceeds paid-for storage; increasing storage deposit
   4. Removing storage and reclaiming excess deposit

### Example 1: Fungible Token Contract

Imagine a [fungible token](Tokens/FungibleToken/Core.md) contract deployed at `ft`. Let's say this contract saves all user balances to a Map data structure internally, and adding a key for a new user requires 0.00235Ⓝ. This contract therefore uses the Storage Management standard to pass this cost onto users, so that a new user must effectively pay a registration fee to interact with this contract of 0.00235Ⓝ, or 2350000000000000000000 yoctoⓃ ([yocto](https://www.metricconversion.us/prefixes.htm) = 10<sup>-24</sup>).

For this contract, `storage_balance_bounds` will be:

```json
{
  "min": "2350000000000000000000",
  "max": "2350000000000000000000"
}
```

This means a user must deposit 0.00235Ⓝ to interact with this contract, and that attempts to deposit more than this will have no effect (attached deposits will be immediately refunded).

Let's follow two users, Alice with account `alice` and Bob with account `bob`, as they interact with `ft` through the following scenarios:

1. Alice registers herself
2. Alice registers Bob
3. Alice tries to register Bob again
4. Alice force-closes her account
5. Bob gracefully closes his account

#### 1. Account pays own registration fee

**High-level explanation**

1. Alice checks if she is registered with the `ft` contract.
2. Alice determines the needed registration fee to register with the `ft` contract.
3. Alice issues a transaction to deposit Ⓝ for her account.

**Technical calls**

1. Alice queries a view-only method to determine if she already has storage on this contract with `ft::storage_balance_of({"account_id": "alice"})`. Using [NEAR CLI](https://docs.near.org/tools/near-cli) to make this view call, the command would be:

       near view ft storage_balance_of '{"account_id": "alice"}'

   The response:

       null

2. Alice uses [NEAR CLI](https://docs.near.org/docs/tools/near-cli) to make a view call.

       near view ft storage_balance_bounds

   As mentioned above, this will show that both `min` and `max` are both 2350000000000000000000 yoctoⓃ.

3. Alice converts this yoctoⓃ amount to 0.00235 Ⓝ, then calls `ft::storage_deposit` with this attached deposit. Using NEAR CLI:

       near call ft storage_deposit '' \
         --accountId alice --amount 0.00235

   The result:

       {
         total: "2350000000000000000000",
         available: "0"
       }


#### 2. Account pays for another account's storage

Alice wishes to eventually send `ft` tokens to Bob who is not registered. She decides to pay for Bob's storage.

**High-level explanation**

Alice issues a transaction to deposit Ⓝ for Bob's account.

**Technical calls**

Alice calls `ft::storage_deposit({"account_id": "bob"})` with the attached deposit of '0.00235'. Using NEAR CLI the command would be:

    near call ft storage_deposit '{"account_id": "bob"}' \
      --accountId alice --amount 0.00235

The result:

    {
      total: "2350000000000000000000",
      available: "0"
    }

#### 3. Unnecessary attempt to register already-registered account

Alice accidentally makes the same call again, and even misses a leading zero in her deposit amount.

    near call ft storage_deposit '{"account_id": "bob"}' \
      --accountId alice --amount 0.0235

The result:

    {
      total: "2350000000000000000000",
      available: "0"
    }

Additionally, Alice will be refunded the 0.0235Ⓝ she attached, because the `storage_deposit_bounds.max` specifies that Bob's account cannot have a total balance larger than 0.00235Ⓝ.

#### 4. Account force-closes registration

Alice decides she doesn't care about her `ft` tokens and wants to forcibly recover her registration fee. If the contract permits this operation, her remaining `ft` tokens will either be burned or transferred to another account, which she may or may not have the ability to specify prior to force-closing.

**High-level explanation**

Alice issues a transaction to unregister her account and recover the Ⓝ from her registration fee. She must attach 1 yoctoⓃ, expressed in Ⓝ as `.000000000000000000000001`.

**Technical calls**

Alice calls `ft::storage_unregister({"force": true})` with a 1 yoctoⓃ deposit. Using NEAR CLI the command would be:

    near call ft storage_unregister '{ "force": true }' \
      --accountId alice --depositYocto 1

The result:

    true

#### 5. Account gracefully closes registration

Bob wants to close his account, but has a non-zero balance of `ft` tokens.

**High-level explanation**

1. Bob tries to gracefully close his account, calling `storage_unregister()` without specifying `force=true`. This results in an intelligible error that tells him why his account can't yet be unregistered gracefully.
2. Bob sends all of his `ft` tokens to a friend.
3. Bob retries to gracefully close his account. It works.

**Technical calls**

1. Bob calls `ft::storage_unregister()` with a 1 yoctoⓃ deposit. Using NEAR CLI the command would be:

       near call ft storage_unregister '' \
         --accountId bob --depositYocto 1

   It fails with a message like "Cannot gracefully close account with positive remaining balance; bob has balance N"

2. Bob transfers his tokens to a friend using `ft_transfer` from the [Fungible Token Core](Tokens/FungibleToken/Core.md) standard.

3. Bob tries the call from Step 1 again. It works.

### Example 2: Social Media Contract

Imagine a social media smart contract which passes storage costs onto users for posts and follower data. Let's say this contract is deployed at account `social`. Like the Fungible Token contract example above, the `storage_balance_bounds.min` is 0.00235, because this contract will likewise add a newly-registered user to an internal Map. However, this contract sets no `storage_balance_bounds.max`, since users can add more data to the contract over time and must cover the cost for this storage.

So for this contract, `storage_balance_bounds` will return:

```json
{
  "min": "2350000000000000000000",
  "max": null
}
```

Let's follow a user, Alice with account `alice`, as she interacts with `social` through the following scenarios:

1. Registration
2. Unnecessary attempt to re-register using `registration_only` param
3. Attempting to take action which exceeds paid-for storage; increasing storage deposit
4. Removing storage and reclaiming excess deposit

#### 1. Account registers with `social`

**High-level explanation**

Alice issues a transaction to deposit Ⓝ for her account. While the `storage_balance_bounds.min` for this contract is 0.00235Ⓝ, the frontend she uses suggests adding 0.1Ⓝ, so that she can immediately start adding data to the app, rather than *only* registering.

**Technical calls**

Using NEAR CLI:

    near call social storage_deposit '' \
      --accountId alice --amount 0.1

The result:

    {
      total: '100000000000000000000000',
      available: '97650000000000000000000'
    }

Here we see that she has deposited 0.1Ⓝ and that 0.00235 of it has been used to register her account, and is therefore locked by the contract. The rest is available to facilitate interaction with the contract, but could also be withdrawn by Alice by using `storage_withdraw`.

#### 2. Unnecessary attempt to re-register using `registration_only` param

**High-level explanation**

Alice can't remember if she already registered and re-sends the call, using the `registration_only` param to ensure she doesn't attach another 0.1Ⓝ.

**Technical calls**

Using NEAR CLI:

    near call social storage_deposit '{"registration_only": true}' \
      --accountId alice --amount 0.1

The result:

    {
      total: '100000000000000000000000',
      available: '97650000000000000000000'
    }

Additionally, Alice will be refunded the extra 0.1Ⓝ that she just attached. This makes it easy for other contracts to always attempt to register users while performing batch transactions without worrying about errors or lost deposits.

Note that if Alice had not included `registration_only`, she would have ended up with a `total` of  0.2Ⓝ.

#### 3. Account increases storage deposit

Assumption: `social` has a `post` function which allows creating a new post with free-form text. Alice has used almost all of her available storage balance. She attempts to call `post` with a large amount of text, and the transaction aborts because she needs to pay for more storage first.

Note that applications will probably want to avoid this situation in the first place by prompting users to top up storage deposits sufficiently before available balance runs out.

**High-level explanation**

1. Alice issues a transaction, let's say `social.post`, and it fails with an intelligible error message to tell her that she has an insufficient storage balance to cover the cost of the operation
2. Alice issues a transaction to increase her storage balance
3. Alice retries the initial transaction and it succeeds

**Technical calls**

1. This is outside the scope of this spec, but let's say Alice calls `near call social post '{ "text": "very long message" }'`, and that this fails with a message saying something like "Insufficient storage deposit for transaction. Please call `storage_deposit` and attach at least 0.1 NEAR, then try again."

2. Alice deposits the proper amount in a transaction by calling `social::storage_deposit` with the attached deposit of '0.1'. Using NEAR CLI:

       near call social storage_deposit '' \
         --accountId alice --amount 0.1

   The result:

       {
         total: '200000000000000000000000',
         available: '100100000000000000000000'
       }

3. Alice tries the initial `near call social post` call again. It works.

#### 4. Removing storage and reclaiming excess deposit

Assumption: Alice has more deposited than she is using.

**High-level explanation**

1. Alice views her storage balance and sees that she has extra.
2. Alice withdraws her excess deposit.

**Technical calls**

1. Alice queries `social::storage_balance_of({ "account_id": "alice" })`. With NEAR CLI:

       near view social storage_balance_of '{"account_id": "alice"}'

   Response:

       {
         total: '200000000000000000000000',
         available: '100100000000000000000000'
       }

2. Alice calls `storage_withdraw` with a 1 yoctoⓃ deposit. NEAR CLI command:

       near call social storage_withdraw \
         '{"amount": "100100000000000000000000"}' \
         --accountId alice --depositYocto 1

   Result:

       {
         total: '200000000000000000000000',
         available: '0'
       }

## Reference-level explanation

**NOTES**:

- All amounts, balances and allowance are limited by `U128` (max value 2<sup>128</sup> - 1).
- This storage standard uses JSON for serialization of arguments and results.
- Amounts in arguments and results are serialized as Base-10 strings, e.g. `"100"`. This is done to avoid JSON limitation of max integer value of 2<sup>53</sup>.
- To prevent the deployed contract from being modified or deleted, it should not have any access keys on its account.

**Interface**:

```ts
// The structure that will be returned for the methods:
// * `storage_deposit`
// * `storage_withdraw`
// * `storage_balance_of`
// The `total` and `available` values are string representations of unsigned
// 128-bit integers showing the balance of a specific account in yoctoⓃ.
type StorageBalance = {
   total: string;
   available: string;
}

// The below structure will be returned for the method `storage_balance_bounds`.
// Both `min` and `max` are string representations of unsigned 128-bit integers.
//
// `min` is the amount of tokens required to start using this contract at all
// (eg to register with the contract). If a new contract user attaches `min`
// NEAR to a `storage_deposit` call, subsequent calls to `storage_balance_of`
// for this user must show their `total` equal to `min` and `available=0` .
//
// A contract may implement `max` equal to `min` if it only charges for initial
// registration, and does not adjust per-user storage over time. A contract
// which implements `max` must refund deposits that would increase a user's
// storage balance beyond this amount.
type StorageBalanceBounds = {
    min: string;
    max: string|null;
}

/************************************/
/* CHANGE METHODS on fungible token */
/************************************/
// Payable method that receives an attached deposit of Ⓝ for a given account.
//
// If `account_id` is omitted, the deposit MUST go toward predecessor account.
// If provided, deposit MUST go toward this account. If invalid, contract MUST
// panic.
//
// If `registration_only=true`, contract MUST refund above the minimum balance
// if the account wasn't registered and refund full deposit if already
// registered.
//
// The `storage_balance_of.total` + `attached_deposit` in excess of
// `storage_balance_bounds.max` must be refunded to predecessor account.
//
// Returns the StorageBalance structure showing updated balances.
function storage_deposit(
    account_id: string|null,
    registration_only: boolean|null
): StorageBalance {}

// Withdraw specified amount of available Ⓝ for predecessor account.
//
// This method is safe to call. It MUST NOT remove data.
//
// `amount` is sent as a string representing an unsigned 128-bit integer. If
// omitted, contract MUST refund full `available` balance. If `amount` exceeds
// predecessor account's available balance, contract MUST panic.
//
// If predecessor account not registered, contract MUST panic.
//
// MUST require exactly 1 yoctoNEAR attached balance to prevent restricted
// function-call access-key call (UX wallet security)
//
// Returns the StorageBalance structure showing updated balances.
function storage_withdraw(amount: string|null): StorageBalance {}

// Unregisters the predecessor account and returns the storage NEAR deposit.
//
// If the predecessor account is not registered, the function MUST return
// `false` without panic.
//
// If `force=true` the function SHOULD ignore existing account data, such as
// non-zero balances on an FT contract (that is, it should burn such balances),
// and close the account. Contract MAY panic if it doesn't support forced
// unregistration, or if it can't force unregister for the particular situation
// (example: too much data to delete at once).
//
// If `force=false` or `force` is omitted, the contract MUST panic if caller
// has existing account data, such as a positive registered balance (eg token
// holdings).
//
// MUST require exactly 1 yoctoNEAR attached balance to prevent restricted
// function-call access-key call (UX wallet security)
//
// Returns `true` iff the account was successfully unregistered.
// Returns `false` iff account was not registered before.
function storage_unregister(force: boolean|null): boolean {}

/****************/
/* VIEW METHODS */
/****************/
// Returns minimum and maximum allowed balance amounts to interact with this
// contract. See StorageBalanceBounds.
function storage_balance_bounds(): StorageBalanceBounds {}

// Returns the StorageBalance structure of the valid `account_id`
// provided. Must panic if `account_id` is invalid.
//
// If `account_id` is not registered, must return `null`.
function storage_balance_of(account_id: string): StorageBalance|null {}
```

## Drawbacks

- The idea may confuse contract developers at first until they understand how a system with storage staking works.
- Some folks in the community would rather see the storage deposit only done for the sender. That is, that no one else should be able to add storage for another user. This stance wasn't adopted in this standard, but others may have similar concerns in the future.

## Future possibilities

- Ideally, contracts will update available balance for all accounts every time the NEAR blockchain's configured storage-cost-per-byte is reduced. That they *must* do so is not enforced by this current standard.
