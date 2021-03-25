# Non-Fungible Token Enumeration ([NEP-???](???))

Version `1.0.0`

## Summary

For a given NFT contract, this provides standard interfaces for:

* Determining total number of tokens in existence
* Listing all tokens owned by an account

## Motivation

If an NFT contract is deeply integrated with an app, that app can list all tokens owned by a specific account and determine how many tokens are in existence by using off-chain [indexing](https://github.com/near/nearcore/tree/master/chain/indexer). This incurs the complexity of building and maintaining off-chain services but saves [storage] costs for the contract.

This is not the correct trade-off for all projects. For NFT projects which can tolerate the extra on-chain costs and which want to simplify the integration process for apps, the Enumeration extension provides a standard way to fetch this information without an off-chain layer.

Prior art:

- [ERC-721]'s enumeration extension
- [NEAR's Storage Management Standard][Storage Management]

## Interface

The contract must implement the following view methods:

```ts
// Get list of all tokens owned by a given account
//
// Arguments:
// * `account_id`: a valid NEAR account
//
// Returns a list of all token IDs owned by this account
// TODO: pagination?
function nft_tokens_for_owner(account_id: string): string[] {}

// Returns the total supply of non-fungible tokens as a string representing the
// value as an unsigned 128-bit integer to avoid JSON number limit of 2^53.
function nft_total_supply(): string {}
```

In order to store and serve this information, the contract will need to store extra data for each token. The contract should use something like the [Storage Management] standard to pass these costs onto users to keep the contract functional as state grows. TODO: more to say about this?

  [ERC-721]: https://eips.ethereum.org/EIPS/eip-721
  [storage]: https://docs.near.org/docs/concepts/storage-staking
  [Storage Management]: ../StorageManagement.md
