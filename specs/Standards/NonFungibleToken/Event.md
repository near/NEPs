# Non-Fungible Token Event

Version `1.0.0`

## Summary

Standard interfaces for NFT contract actions.

## Motivation

NFT-driven apps such as marketplaces regularly perform many
of the same actions such as `minting`, `burning` and `transferring`.
Each app have their own way of performing these actions and it
is difficult to consistently capture these events.
This extension addresses that.

For example, it's common in NFT marketplaces to have
different methods of transfer a single token vs many 
tokens. Other applications like wallets, will have
a difficult time tracking consistently this information for many
markets. This makes interactive with many NFT-driven apps 
infeasible.

Due to discussions here 
https://github.com/near/NEPs/issues/254,
a standard way to capture these events are needed.

## Interface

Many apps may use different mechanisms to perform their batching
requirements. This interface standardises this process by capturing
events of these activities through logs.

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
// * `account_id`: "account.near"
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

## Drawbacks

There is a known limitation of 16kb strings when capturing logs.
This can be observed from `token_ids` that may vary in length
for different apps so the amount of logs that can
be executed may vary.
