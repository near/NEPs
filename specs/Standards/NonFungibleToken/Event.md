# Non-Fungible Token Event

Version `1.0.0`

## Summary

Standard interfaces for NFT contract actions.

## Motivation

NFT-driven apps perform many similar actions.
For example - `minting`, `burning` and `transferring`.
Each app may have their own way of performing these actions.
This introduces inconsistency in capturing these events.
This extension addresses that.

It's common for NFT apps to transfer many or one token at a time.
Other applications need to track these and similar events consistently.
If not, tracking state across many NFT-driven apps become infeasible.

We need a standard way to capture events.
This was discussed here https://github.com/near/NEPs/issues/254.

## Interface

Many apps use different interfaces that represent the same action.
This interface standardizes that process.
It captures these actions through logs.

```ts
// Interface to capture an event
// and return formatted event string.
interface EventJsonLog {
    // Takes `EventLogData` and returns
    // `EVENT_JSON: <EVENT_LOG_DATA>`
    (e:EventLogData):string
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
// * `owner_id`: "account.near"
// * `token_id`: "1"
interface NftMintLog {
    owner_id:string,
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

## Further methods

Note that the example events covered above cover two different kinds of events:
1. Events that are not specified in the NFT Standard (`nft_mint`, `nft_burn`)
2. An event that is covered in the [NFT Core Standard](https://nomicon.io/Standards/NonFungibleToken/Core.html#nft-interface). (`nft_transfer`)

This event standard also applies beyond the three events highlighted here, where future events follow the same convention of as the second type. For instance, if an NFT contract uses the [approval management standard](https://nomicon.io/Standards/NonFungibleToken/ApprovalManagement.html), it may emit an event for `nft_approve` if that's deemed as important by the developer community.
 
Please feel free to open pull requests for extending the events standard detailed here as needs arise.

## Drawbacks

There is a known limitation of 16kb strings when capturing logs.
This can be observed if `token_ids` vary in length across different apps.
This impacts the amount of events that can be processed.
