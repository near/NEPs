# Account Registration

Version `1.0.0`

## Summary

TODO

## Motivation

To simplify the interface we and make sure we send funds only to accounts which agree to receive token of a given type we introduce account registration concept. NEP-21 transfer (and approval) functions require payment to cover the potential storage fees. 

With _account registration_, an account must firstly to opt-in to a token, and only then it can receive tokens. This gives many benefits:

* protects account for receiving unwanted tokens (spamming, compliance)
* signals that a smart-contract can handle tokens

NOTE: Each method which calls a #payment method must be marked with #payment. This complicates the tools design - they will need to ask user to attach payment for every such transaction.  However we decided to keep the payment requirement for security reasons related to wallet and transaction signing. Please look at NEP-141 (Fungible Token Core Standard) for details.

An account, once registered, can opt-out - with that, a storage deposit will be returned, and the account will stop accepting token transfers.

## Guide-level explanation

TODO

### Example scenarios

TODO


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

// Unregisters the caller for accepting token transfers and return the storage
// NEAR deposit back.
// * If the caller is not registered, the function should early return without
//   throwing exception.
// * If `force=true` the function SHOULD ignore account balances (burn them)
//   and close the account.
// * Otherwise,  MUST panic if caller has a positive registered balance (eg
//   token holdings)
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

TODO

## Future possibilities

TODO
