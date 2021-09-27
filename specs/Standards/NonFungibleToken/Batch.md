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

Due to different functions used by marketplaces to perform their
batching requirements discussed here https://github.com/near/NEPs/issues/254,
a standard way to capture these events is needed.

## Interface

Many apps may use different mechanisms to perform their batching
requirements. This interface standardises this process by capturing
events of these activities through logs.

```ts
// Interface to capture an event
interface EventLog {
    EVENT_JSON:EventLogData
}

// Interface to capture data 
// about an event
// Arguments
// * `standard`: name of standard e.g. nep171
// * `version`: e.g. 1.0.0
// * `event`: `nft_mint` | `nft_burn` | `nft_transfer`
// * `data`: associate event data
interface EventLogData {
    standard:string,
    version:string,
    event:string,
    data: NftMintLog[]|NftTransferLog[]|NftBurnLog
}

// An event log to capture token minting
// Arguments
// * `account_id`: "account.near"
// * `token_id`: "1"
interface NftMintLog {
    account_id:string,
    token_id:string
}

// An event log to capture token burning
// Arguments
// * `owner_id`: owner of tokens to burn
// * `token_ids`: ["1","2"]
interface NftBurnLog {
    owner_id:string,
    token_ids:string[]
}

// An event log to capture token transfer
// Arguments
// * `sender_id`: "account.near"
// * `receiver_id`: "receiver.near"
// * `token_id`: "12345abc"
interface NftTransferLog {
    sender_id:string,
    receiver_id:string,
    token_id:string
}
```
