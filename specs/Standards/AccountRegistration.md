# Account Registration

Version `1.0.0`

## Introduction

NEAR uses [storage staking] which means that a contract account must have sufficient balance to cover all storage added over time. For contracts which add storage when new users join, this standard provides a uniform way to pass storage costs onto users. It allows accounts and contracts to:

1. Check if an account is already registered.
2. Determine the amount of NEAR tokens needed to pay for an account's storage when the account registers.
3. Pay for one's own or someone else's account registration storage fee.
4. Unregister an account and recover the registration storage fee, either destructively with `force` or gracefully. Graceful unregistration may require contract-specific prerequisites.

For contracts that need to increase per-user storage over time, see the [Storage Management] standard.

  [storage staking]: https://docs.near.org/docs/concepts/storage-staking
  [Storage Management]: StorageManagement.md

Prior art:

- A previous fungible token standard ([NEP-21](https://github.com/near/NEPs/pull/21)) highlighting how [storage was paid](https://github.com/near/near-sdk-rs/blob/1d3535bd131b68f97a216e643ad1cba19e16dddf/examples/fungible-token/src/lib.rs#L92-L113) for when increasing the allowance of an escrow system.

## Example scenarios

Imagine a [fungible token](Tokens/FungibleTokenCore.md) contract deployed at `ft`. Let's say the registration fee required to interact with this contract is 2350000000000000000000 yoctoⓃ ([yocto](https://www.metricconversion.us/prefixes.htm) = 10<sup>-24</sup>; [2350000000000000000000 / 10^24](https://www.wolframalpha.com/input/?i=2350000000000000000000+%2F+10%5E24) = 0.00235 Ⓝ).

Let's follow two users, Alice with account `alice` and Bob with account `bob`, as they interact with `ft` through the following scenarios:

1. Alice registers herself
2. Alice registers Bob
3. Alice tries to register Bob again
3. Alice force-closes her account
4. Bob gracefully closes his account

### 1. Account pays own registration fee

**High-level explanation**

1. Alice checks if she is registered with the `ft` contract.
2. Alice determines the needed registration fee to register with the `ft` contract.
3. Alice issues a transaction to deposit Ⓝ for her account.

**Technical calls**

1. Alice queries a view-only method to determine if she already has storage on this contract with `ft::storage_balance_of({"account_id": "alice"})`. Using [NEAR CLI](https://docs.near.org/docs/tools/near-cli) to make this view call, the command would be:

       near view ft ar_is_registered '{"account_id": "alice"}'

   The response:

       View call: ft.ar_is_registered({"account_id": "alice"})
       { total: '0', available: '0' }

2. Alice uses [NEAR CLI](https://docs.near.org/docs/tools/near-cli) to make a view call.

       near view ft ar_registration_fee

   The response:

       '2350000000000000000000'

3. Alice deposits the proper amount in a transaction by calling `ft::ar_register` with the attached deposit of '0.00235'. Using NEAR CLI:

       near call ft ar_register '' \
         --accountId alice --amount 0.00235

   The result:

       true


### 2. Account pays for another account's storage

Alice wishes to eventually send `ft` tokens to Bob who is not registered. She decides to pay for Bob's storage.

**High-level explanation**

Alice issues a transaction to deposit Ⓝ for Bob's account.

**Technical calls**

Alice calls `ft::ar_register({"account_id": "bob"})` with the attached deposit of '0.00235'. Using NEAR CLI the command would be:

    near call ft ar_register '{"account_id": "bob"}' \
      --accountId alice --amount 0.00235

The result:

    true

### 3. Unnecessary attempt to register already-registered account

Alice accidentally makes the same call again.

    near call ft ar_register '{"account_id": "bob"}' \
      --accountId alice --amount 0.00235

The result:

    false

Additionally, Alice will be refunded the 0.00235Ⓝ she attached.

This makes it easy for other contracts to always attempt to register users while performing batch transactions without worrying about errors or lost deposits.

### 4. Account force-closes registration

Alice decides she doesn't care about her `ft` tokens and wants to forcibly recover her registration fee. If the contract permits this operation, her remaining `ft` tokens will either be burned or transferred to another account, which she may or may not have the ability to specify prior to force-closing.

**High-level explanation**

Alice issues a transaction to unregister her account and recover the Ⓝ from her registration fee. She must attach 1 yoctoⓃ, expressed in Ⓝ as `.000000000000000000000001`.

**Technical calls**

Alice calls `ft::ar_unregister({"force": true})` with a 1 yoctoⓃ deposit. Using NEAR CLI the command would be:

    near call ft ar_unregister '{ "force": true }' \
      --accountId alice --amount .000000000000000000000001

The result:

    true

### 5. Account gracefully closes registration

Bob wants to close his account, but has a non-zero balance of `ft` tokens.

**High-level explanation**

1. Bob tries to gracefully close his account, calling `ar_unregister()` without specifying `force=true`. This results in an intelligible error that tells him why his account can't yet be unregistered gracefully: he has a remaining balance of N tokens.
2. Bob sends all of his `ft` tokens to his friend, Carol with account `carol`
3. Bob retries to gracefully close his account. It works.

**Technical calls**

1. Bob calls `ft::ar_unregister()` with a 1 yoctoⓃ deposit. Using NEAR CLI the command would be:

       near call ft ar_unregister '' \
         --accountId bob --amount .000000000000000000000001

   It fails with a message like "Cannot gracefully close account with positive remaining balance; bob has balance N"

2. Bob transfers his tokens to Carol using `ft_transfer` from the [Fungible Token Core](Tokens/FungibleTokenCore.md) standard.

3. Bob tries the call from Step 1 again. It works.


## Reference-level explanation

**NOTES**:

- All amounts, balances and allowance are limited by `U128` (max value 2<sup>128</sup> - 1).
- This storage standard uses JSON for serialization of arguments and results.
- Amounts in arguments and results are serialized as Base-10 strings, e.g. `"100"`. This is done to avoid JSON limitation of max integer value of 2<sup>53</sup>.
- To prevent the deployed contract from being modified or deleted, it should not have any access keys on its account.

**Interface**:

```ts
/***************************************/
/* CHANGE METHODS on Account Registrar */
/***************************************/
// Registers an account for using smart-contract. Must attach amount of NEAR given by `ar_registration_fee`.
// Parameters:
// * `account_id` - an account to register. Anyone can register any other
//   account.
// If the account is already registered then the function early returns and
// refunds the attached NEAR.
// MUST not panic if caller is already registered.
// Returns `false` iff account was already registered.
// Panics:
// * If not enough deposit was attached to pay for account storage
function ar_register(account_id: string) -> bool;

// Unregister the caller and return the registration NEAR deposit back.
// * If the caller is not registered, the function should return `false` early
//   return without throwing exception.
// * If `force=true` the function SHOULD ignore account data, such as non-zero
//   balances in a fungible token contract (that is, the contract should burn such
//   outstanding balances) and close the account.
// * Otherwise, MUST panic if caller has existing account data, such as positive
//   registered balance on a fungible token contract
// MUST require exactly 1 yoctoNEAR attached balance to prevent restricted
// function-call access-key call (UX wallet security)
// Returns `false` iff account was not registered.
#[payable]
function ar_unregister(force: bool|null) -> bool;

/****************/
/* VIEW METHODS */
/****************/
// Returns the amount of NEAR which must be attached for `ar_register`. It's a
// string representation of an unsigned 128-bit integer.
function ar_registration_fee(): string;

// Checks if the `account_id` is registered.
function ar_is_registered(account_id: string) -> bool;
```

## Drawbacks

- The idea may confuse contract developers at first until they understand how a system with storage staking works.
- Some folks in the community would rather see the account registration only done for the sender. That is, that no one else should be able to register another user. This stance wasn't adopted in this standard, but others may have similar concerns in the future.