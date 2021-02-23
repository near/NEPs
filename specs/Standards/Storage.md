# Account Storage ([NEP-145](https://github.com/near/NEPs/discussions/145))

Version `1.0.0`

## Summary

This standard handles state storage when accounts add and remove data stored in the state of a contract. It allows accounts to:

1. Check an account's storage "balance."
2. Determine the minimum storage needed to add account information such that the account can interact as expected in a contract.
3. Add storage for an account; either their own or another account.
4. Withdraw some or all of a storage deposit by removing associated account data from the contract and then making a call to remove unused deposit.

## Motivation

NEAR uses [storage staking](https://docs.near.org/docs/concepts/storage-staking) as the mechanism to pay for storage on the blockchain. When storage is removed, the staked Ⓝ is released. Developers must take this into consideration when crafting smart contracts that store data on-chain. If no restrictions are enforced in a permissionless system, any account may add key/value pairs that bloat another account's storage. Since an account containing a smart contract must keep enough Ⓝ to pay for the storage, developers must ensure the state storage is "paid for" as the storage increases, and can refund such storage deposits later if data is removed. This standard provides a generic approach to handle these concerns.

Prior art:

- A previous fungible token standard ([NEP-21](https://github.com/near/NEPs/pull/21)) highlighting how [storage was paid](https://github.com/near/near-sdk-rs/blob/1d3535bd131b68f97a216e643ad1cba19e16dddf/examples/fungible-token/src/lib.rs#L92-L113) for when increasing the allowance of an escrow system.

## Guide-level explanation

We should be able to do the following:

- Have an account sign a transaction, attaching a deposit of Ⓝ that will cover *their own* storage for a smart contract.
- Have an account sign a transaction, attaching a deposit of Ⓝ that will cover the storage for another account to use a smart contract.
- Allow an account to request refunds in Ⓝ for excess storage deposits on a given contract.
- Use a view function call to determine how much Ⓝ should be attached as a deposit in order for an account to "pay their share" in storage. In some uses cases, this may be thought of as the cost for account registration.

The necessary concepts and terminology is covered in the [documentation for storage staking](https://docs.near.org/docs/concepts/storage-staking).

### Example scenarios

#### Account pays for own storage

Alice registers her account on a fungible token contract.

**Assumptions**

- Alice's account is `alice`.
- The fungible token contract is `mochi`.
- The fungible token contract stores account information that requires 2350000000000000000000 yoctoⓃ of storage.

**High-level explanation**

1. Alice checks to make sure she does not have storage on the `mochi` contract.
2. Alice determines how much storage is needed to register an account with the `mochi` contract.
3. Alice issues a transaction to deposit Ⓝ for her account.

**Technical calls**

1. Alice queries a view-only method to determine if she already has storage on this contract with `mochi::storage_balance_of({"account_id": "alice"})`. Using [NEAR CLI](https://docs.near.org/docs/tools/near-cli) to make this view call, the command would be:

       near view mochi storage_balance_of '{"account_id": "alice"}'

   The response:

       View call: mochi.storage_balance_of({"account_id": "alice"})
       { total: '0', available: '0' }

2. Alice uses [NEAR CLI](https://docs.near.org/docs/tools/near-cli) to make a view call.

       near view mochi storage_minimum_balance

   The response:

       '2350000000000000000000'

   [2350000000000000000000 / 10^24](https://www.wolframalpha.com/input/?i=2350000000000000000000+%2F+10%5E24) (yocto) = 0.00235 Ⓝ

3. Alice deposits the proper amount in a transaction by calling `mochi::storage_deposit` with the attached deposit of '0.00235'. Using NEAR CLI:

       near call mochi storage_deposit '' \
         --accountId alice --amount 0.00235

   The result:

       {
         total: '2350000000000000000000',
         available: '2350000000000000000000'
       }


#### Account pays for another account's storage

Alice wishes to eventually send `MOCHI` tokens to Bob who is not registered. She decides to pay for Bob's storage.

**Assumptions**

- Alice's account is `alice`.
- Bob's account is `bob`.
- As in the prior example, the storage cost per user is 2350000000000000000000 yoctoⓃ or 0.00235 Ⓝ, and this is known to Alice.

**High-level explanation**

1. Alice issues a transaction to deposit Ⓝ for Bob's account.

**Technical calls**

1. Alice calls `mochi::storage_deposit({"account_id": "bob"})` with the attached deposit of '0.00235'. Using NEAR CLI the command would be:

       near call mochi storage_deposit '{"account_id": "bob"}' \
         --accountId alice --amount 0.00235

    The result:

       {
         total: '2350000000000000000000',
         available: '2350000000000000000000'
       }

#### Accounts withdraw excess storage deposit

Alice and Bob decide to withdraw some unused storage deposit from the `mochi` contract.

**Assumptions**

- Alice's account is `alice`.
- Bob's account is `bob`.
- Both Alice's and Bob's accounts have more deposited than they are using.

**High-level explanation**

1. Knowing that she registered Bob's account and believing that this entitles her to receive a refund for that deposit, Alice views her & Bob's storage balances and sees each have extra.
2. Alice issues a transaction to withdraw her own excess deposit.
3. Alice attempts to withdraw Bob's excess deposit, but cannot.
4. Bob issues a transaction to withdraw his own excess deposit.

**Technical calls**

1. Alice queries `mochi::storage_balance_of({ "account_id": "alice" })` and `mochi::storage_balance_of({ "account_id": "alice" })`.

   Checking her own account with NEAR CLI:

       near view mochi storage_balance_of '{"account_id": "alice"}'

   Response:

       View call: mochi.storage_balance_of({"account_id": "alice"})
       {
         total: '7050000000000000000000',
         available: '2350000000000000000000'
       }

   Checking Bob's account:

       near view mochi storage_balance_of '{"account_id": "bob"}'

   Response:

       View call: mochi.storage_balance_of({"account_id": "bob"})
       {
         total: '4700000000000000000000',
         available: '2350000000000000000000'
       }

2. Alice calls `mochi::storage_withdraw({"amount": "2350000000000000000000"})` for her own account. NEAR CLI command:

       near call mochi storage_withdraw \
         '{"amount": "2350000000000000000000"}' \
         --accountId alice

3. Alice realizes that `storage_withdraw` does not allow specifying the account to withdraw from. She has withdrawn all she can from her own account. When she re-checks `mochi::storage_balance_of({"account_id": "alice"})`, it indicates she has zero available balance. This is because storage withdrawal is only for the predecessor account that has signed the transaction. Alice cannot withdraw for Bob.

4. Bob issues the same transaction as Alice did in step 2.

       near call mochi storage_withdraw \
         '{"amount": "2350000000000000000000"}' \
         --accountId bob

## Reference-level explanation

**NOTES**:

- All amounts, balances and allowance are limited by `U128` (max value 2<sup>128</sup> - 1).
- This storage standard uses JSON for serialization of arguments and results.
- Amounts in arguments and results are serialized as Base-10 strings, e.g. `"100"`. This is done to avoid JSON limitation of max integer value of 2<sup>53</sup>.
- To prevent the deployed contract from being modified or deleted, it should not have any access keys on its account.

**Interface**:

```ts
// The below defines the structure that will be returned for the methods:
// * `storage_deposit`
// * `storage_withdraw`
// * `storage_balance_of`
// The `total` and `available` values are string representations of unsigned
// 128-bit integers.
type AccountStorageBalance = {
   total: string;
   available: string;
}

/************************************/
/* CHANGE METHODS on fungible token */
/************************************/
// Payable method that receives an attached deposit of Ⓝ for a given account.
// Requirements:
// * `account_id`, if provided, must be a valid account name.
// * The account sending the transaction must have enough Ⓝ to cover the
//   deposit.
// If `account_id` is omitted, the sender's account will receive the attached
// deposit for storage.
// Returns the AccountStorageBalance structure
function storage_deposit(
    account_id: string|null
): AccountStorageBalance {}

// Withdraws a specified amount of Ⓝ for a given account that was previously
// reserved for storage.
// Requirements:
// * `amount` must be less than or equal to the available storage balance for
//   the sending account. Is sent as a string but represents an unsigned
//   128-bit integer.
// * The calling account must already be registered with the contract
// Returns the AccountStorageBalance structure
function storage_withdraw(
    amount: string
): AccountStorageBalance {}

/****************/
/* VIEW METHODS */
/****************/
// Returns the minimum storage needed for an account to interact as expected
// with the smart contract. It's a string representation of an unsigned 128-bit
// integer.
function storage_minimum_balance(): string

// Returns the AccountStorageBalance structure of the valid `account_id`
// provided.
function storage_balance_of(
    account_id: string
): AccountStorageBalance {}
```

## Drawbacks

- The idea may confuse contract developers at first until they understand how a system with storage staking works.
- Some folks in the community would rather see the storage deposit only done for the sender. That is, that no one else should be able to add storage for another user. This stance wasn't adopted in this standard, but others may have similar concerns in the future.

## Future possibilities

- Instead of having developers use constants for the storage price per byte, perhaps this can be derived and instructions can be modified in this standard regarding how to calculate the value returned for `storage_minimum_balance`.
- Ideally, contracts will update available balance for all accounts every time the NEAR blockchain's configured storage-cost-per-byte is reduced. That they *must* do so is not enforced by this current standard.
