# Non-Fungible Token Enumeration ([NEP-181](https://github.com/near/NEPs/discussions/181))

Version `1.0.0`

## Summary

Standard interfaces for counting & fetching tokens, for an entire NFT contract or for a given owner.

## Motivation

Apps such as marketplaces and wallets need a way to show all tokens owned by a given account and to show statistics about all tokens for a given contract. This extension provides a standard way to do so.

While some NFT contracts may forego this extension to save [storage] costs, this requires apps to have custom off-chain indexing layers. This makes it harder for apps to integrate with such NFTs. Apps which integrate only with NFTs that use the Enumeration extension do not even need a server-side component at all, since they can retrieve all information they need directly from the blockchain.

Prior art:

- [ERC-721]'s enumeration extension

## Interface

The contract must implement the following view methods:

```ts
// Returns the total supply of non-fungible tokens as a string representing an
// unsigned 128-bit integer to avoid JSON number limit of 2^53; and "0" if there are no tokens.
function nft_total_supply(): string {}

// Get a list of all tokens
//
// Arguments:
// * `from_index`: a string representing an unsigned 128-bit integer,
//    representing the starting index of tokens to return
// * `limit`: the maximum number of tokens to return
//
// Returns an array of Token objects, as described in Core standard, and an empty array if there are no tokens
function nft_tokens(
  from_index: string|null, // default: "0"
  limit: number|null, // default: unlimited (could fail due to gas limit)
): Token[] {}

// Get number of tokens owned by a given account
//
// Arguments:
// * `account_id`: a valid NEAR account
//
// Returns the number of non-fungible tokens owned by given `account_id` as
// a string representing the value as an unsigned 128-bit integer to avoid JSON
// number limit of 2^53; and "0" if there are no tokens.
function nft_supply_for_owner(
  account_id: string,
): string {}

// Get list of all tokens owned by a given account
//
// Arguments:
// * `account_id`: a valid NEAR account
// * `from_index`: a string representing an unsigned 128-bit integer,
//    representing the starting index of tokens to return
// * `limit`: the maximum number of tokens to return
//
// Returns a paginated list of all tokens owned by this account, and an empty array if there are no tokens
function nft_tokens_for_owner(
  account_id: string,
  from_index: string|null, // default: 0
  limit: number|null, // default: unlimited (could fail due to gas limit)
): Token[] {}
```

## Notes

At the time of this writing, the specialized collections in the `near-sdk` Rust crate are iterable, but not all of them have implemented an `iter_from` solution. There may be efficiency gains for large collections and contract developers are encouraged to test their data structures with a large amount of entries. 

  [ERC-721]: https://eips.ethereum.org/EIPS/eip-721
  [storage]: https://docs.near.org/docs/concepts/storage-staking
