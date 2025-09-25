# Multi Token Enumeration

:::caution
This is part of the proposed spec [NEP-245](https://github.com/near/NEPs/blob/master/neps/nep-0245.md) and is subject to change.
:::

Version `1.0.0`

## Summary

Standard interfaces for counting & fetching tokens, for an entire Multi Token contract or for a given owner.

## Motivation

Apps such as marketplaces and wallets need a way to show all tokens owned by a given account and to show statistics about all tokens for a given contract. This extension provides a standard way to do so.

While some Multi Token contracts may forego this extension to save [storage] costs, this requires apps to have custom off-chain indexing layers. This makes it harder for apps to integrate with such Multi Token contracts. Apps which integrate only with Multi Token Standards that use the Enumeration extension do not even need a server-side component at all, since they can retrieve all information they need directly from the blockchain.

Prior art:

- [ERC-721]'s enumeration extension
- [Non Fungible Token Standard's](../NonFungibleToken/Enumeration.md) enumeration extension

## Interface

The contract must implement the following view methods:

// Metadata field is optional if metadata extension is implemented. Includes the base token metadata id and the token_metadata object, that represents the token specific metadata.

```ts
// Get a list of all tokens
//
// Arguments:
// * `from_index`: a string representing an unsigned 128-bit integer,
//    representing the starting index of tokens to return
// * `limit`: the maximum number of tokens to return
//
// Returns an array of `Token` objects, as described in the Core standard,
// and an empty array if there are no tokens
function mt_tokens(
  from_index: string|null, // default: "0"
  limit: number|null, // default: unlimited (could fail due to gas limit)
): Token[] {}

// Get list of all tokens owned by a given account
//
// Arguments:
// * `account_id`: a valid NEAR account
// * `from_index`: a string representing an unsigned 128-bit integer,
//    representing the starting index of tokens to return
// * `limit`: the maximum number of tokens to return
//
// Returns a paginated list of all tokens owned by this account, and an empty array if there are no tokens
function mt_tokens_for_owner(
  account_id: string,
  from_index: string|null, // default: 0
  limit: number|null, // default: unlimited (could fail due to gas limit)
): Token[] {}
```

The contract must implement the following view methods if using metadata extension:

```ts
// Get list of all base metadata for the contract
//
// Arguments:
// * `from_index`: a string representing an unsigned 128-bit integer,
//    representing the starting index of tokens to return
// * `limit`: the maximum number of tokens to return
//
// Returns an array of `MTBaseTokenMetadata` objects, as described in the Metadata standard, and an empty array if there are no tokens
function mt_tokens_base_metadata_all(
  from_index: string | null,
  limit: number | null
  ): MTBaseTokenMetadata[]
```


## Notes

At the time of this writing, the specialized collections in the `near-sdk` Rust crate are iterable, but not all of them have implemented an `iter_from` solution. There may be efficiency gains for large collections and contract developers are encouraged to test their data structures with a large amount of entries. 

  [ERC-721]: https://eips.ethereum.org/EIPS/eip-721
  [storage]: https://docs.near.org/concepts/storage/storage-staking
