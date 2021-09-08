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

```rust

#[near_bindgen]
struct SmartContract {}

impl SmartContract {
    /// Mint a number of tokens for `owner_id` with optional royalty and split ownership shares.
    #[payable]
    pub fn nft_batch_mint(
        &mut self,
        owner_id: AccountId,
        metadata: TokenMetadata,
        num_to_mint: u64,
        royalty_args: Option<RoyaltyArgs>,
        split_owners: Option<HashMap<AccountId, u32>>,
    ) {}

    /// Transfer a array of tokens mapped to destination accounts
    /// Simple transfer. Transfer array of `token_ids` from current owner to
    /// mapped destination accounts.
    ///
    /// Requirements
    /// * Caller of the method must attach a deposit of 1 yoctoⓃ for security purposes
    /// * Contract MUST panic if called by someone other than token owner
    #[payable]
    pub fn nft_batch_transfer(
        &mut self, 
        token_ids: Vec<(U64, AccountId)>
    ) {}

    /// The token will be permanently removed from this contract. Burn each
    /// token_id in `token_ids`.
    ///
    /// Only the tokens' owner may call this function.
    #[payable]
    pub fn nft_batch_burn(
        &mut self, 
        token_ids: Vec<U64>
    ) {}
}

/// A hashmap of NEAR accounts representing royalty shares.
/// Share calculation is:
/// (`split_between.value`/`percentage`) * `percentage`
pub struct RoyaltyArgs {
    pub split_between: HashMap<AccountId, u32>,
    pub percentage: u32,
}
```
