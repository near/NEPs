# Fungible Token Minting

Version `1.0.0`

## Summary
[summary]: #summary

An interface for a fungible token minting, which is usually a part of a token lifecycle,

## Motivation

Token minting can be triggered by other smart contracts. Hence we need a standard interface for minting.

In a minting life cycle, token will be firstly minted and then transferred. Following scenarios are possible:
* user can mint tokens for himself (faucet)
* issuer will firstly mint tokens and then transfer
* smart contract will mint tokens for a user

Moreover, there are tools which filter transactions to report user tokens in a dashboard (eg the NEAR Wallet).
These tools will usually check the first transaction. In case of NEAR Wallet it check for the `ft_transfer`, `ft_transfer_call` function calls. If a user will receive a token through minting, the it won't be reported (see  Minted Tokens via Contract not showing in Wallet [#468](https://github.com/near/near-contract-helper/issues/468) issue). So, we need a standard interface in order to have a tool support.

## Standard Interface

```ts
// Fungible Token minting.
// Smart contract can do additional check or validation about who can call this
// function or under what circumstances.
// Requirements:
// * Caller of the method must attach a deposit of 1 yoctoⓃ for security purposes
//
// Arguments:
// * `receiver_id`: the valid NEAR account receiving the fungible tokens.
// * `amount`: the number of tokens to transfer as a string number. Function MUST panic
//   if the amount is not a positive 128 bit number.
// * `memo` (optional): for use cases that may benefit from indexing or
//    providing information for the minting logic.
//
// payable
function ft_mint(
    receiver_id: string,
    amount: string,
    memo: string|null
): void {}
```
