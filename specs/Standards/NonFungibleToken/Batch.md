# Non-Fungible Token Batch

Version `1.0.0`

## Summary

Standard interfaces for batching NFT contract actions.

## Motivation

Apps such as marketplaces regularly perform repetitive user triggered actions that increase bandwidth and network load.
This extension addresses that.

For example, it's common in NFT marketplaces to transfer tokens to many users from a single account. Where many accounts
are involved, marketplaces are responsible for coordinating successful transfer of each asset handle cases of failure.
This makes scaling such apps harder and infeasible to serve high traffic demands.


## Interface

The contract must implement the following view methods:

```ts
// Mint a number of tokens for `owner_id` with optional royalty and split ownership shares.
//
// Arguments
// * `owner_id`: "account.near"
// * `metadata`: TokenMetadata
// * `num_to_mint`: 10
// * `royalty_args`: {"split_between":{"royalty1.near":1275,"royalty2":8750},"percentage":"10000"}
//    royalty1 = 12.5%, royalty2 87.5%
// * `split_owners`: {"co.owner.near":5000}
//    original owner = 50%, co owner = 50%
function nft_batch_mint(
    owner_id: string,
    metadata: TokenMetadata,
    num_to_mint: number,
    royalty_args: {split_between:{[index:string]:number,percentage:number}}|null,
    split_owners: {[index:string]:number}|null,
): void {}

// Transfer 2d array of tokens mapped to destination accounts
//
// Requirements
// * Caller of the method must attach a deposit of 1 yoctoⓃ for security purposes
// * Contract MUST panic if called by someone other than token ownerfunction nft_batch_transfer(
//
// Arguments:
// * `token_id`: [ ["1","account.near"], ["2","account2.near"] ]
function nft_batch_transfer(
    token_ids: string[],
): void {}


/// The token will be permanently removed from this contract. Burn each
/// token_id in `token_ids`.
///
/// Only the tokens' owner may call this function.
//
// Arguments:
// * `token_id`: ["1","2"]
function nft_batch_burn(
    token_ids: string[]
): void {}
```
