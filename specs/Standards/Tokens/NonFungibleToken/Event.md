# Events

Version `1.1.0`

## Summary

Standard interface for NFT contract actions based on [NEP-297](../../EventsFormat.md).

## Motivation

NEAR and third-party applications need to track `mint`, `transfer`, `burn` and `contract_metadata_update` events for all NFT-driven apps consistently.
This extension addresses that.

Keep in mind that applications, including NEAR Wallet, could require implementing additional methods to display the NFTs correctly, such as [`nft_metadata`](Metadata.md) and [`nft_tokens_for_owner`](Enumeration.md).

## Interface

Non-Fungible Token Events MUST have `standard` set to `"nep171"`, standard version set to `"1.1.0"`, `event` value is one of `nft_mint`, `nft_burn`, `nft_transfer`, `contract_metadata_update`, and `data` must be of one of the following relavant types: `NftMintLog[] | NftTransferLog[] | NftBurnLog[] | NftContractMetadataUpdateLog[]`:

```ts
interface NftEventLogData {
    standard: "nep171",
    version: "1.1.0",
    event: "nft_mint" | "nft_burn" | "nft_transfer" | "contract_metadata_update",
    data: NftMintLog[] | NftTransferLog[] | NftBurnLog[] | NftContractMetadataUpdateLog[],
}
```

```ts
// An event log to capture token minting
// Arguments
// * `owner_id`: "account.near"
// * `token_ids`: ["1", "abc"]
// * `memo`: optional message
interface NftMintLog {
    owner_id: string,
    token_ids: string[],
    memo?: string
}

// An event log to capture token burning
// Arguments
// * `owner_id`: owner of tokens to burn
// * `authorized_id`: approved account_id to burn, if applicable
// * `token_ids`: ["1","2"]
// * `memo`: optional message
interface NftBurnLog {
    owner_id: string,
    authorized_id?: string,
    token_ids: string[],
    memo?: string
}

// An event log to capture token transfer
// Arguments
// * `authorized_id`: approved account_id to transfer, if applicable
// * `old_owner_id`: "owner.near"
// * `new_owner_id`: "receiver.near"
// * `token_ids`: ["1", "12345abc"]
// * `memo`: optional message
interface NftTransferLog {
    authorized_id?: string,
    old_owner_id: string,
    new_owner_id: string,
    token_ids: string[],
    memo?: string
}

// An event log to capture contract metadata updates. Note that the updated contract metadata is not included in the log, as it could easily exceed the 16KB log size limit. Listeners can query `nft_metadata` to get the updated contract metadata.
// Arguments
// * `memo`: optional message
interface NftContractMetadataUpdateLog {
    memo?: string
}
```

## Examples

Single owner batch minting (pretty-formatted for readability purposes):

```js
EVENT_JSON:{
  "standard": "nep171",
  "version": "1.1.0",
  "event": "nft_mint",
  "data": [
    {"owner_id": "foundation.near", "token_ids": ["aurora", "proximitylabs"]}
  ]
}
```

Different owners batch minting:

```js
EVENT_JSON:{
  "standard": "nep171",
  "version": "1.1.0",
  "event": "nft_mint",
  "data": [
    {"owner_id": "foundation.near", "token_ids": ["aurora", "proximitylabs"]},
    {"owner_id": "user1.near", "token_ids": ["meme"]}
  ]
}
```

Different events (separate log entries):

```js
EVENT_JSON:{
  "standard": "nep171",
  "version": "1.1.0",
  "event": "nft_burn",
  "data": [
    {"owner_id": "foundation.near", "token_ids": ["aurora", "proximitylabs"]},
  ]
}
```

```js
EVENT_JSON:{
  "standard": "nep171",
  "version": "1.1.0",
  "event": "nft_transfer",
  "data": [
    {"old_owner_id": "user1.near", "new_owner_id": "user2.near", "token_ids": ["meme"], "memo": "have fun!"}
  ]
}
```

Authorized id:

```js
EVENT_JSON:{
  "standard": "nep171",
  "version": "1.1.0",
  "event": "nft_burn",
  "data": [
    {"owner_id": "owner.near", "token_ids": ["goodbye", "aurevoir"], "authorized_id": "thirdparty.near"}
  ]
}
```

Contract metadata update:

```js
EVENT_JSON:{
  "standard": "nep171",
  "version": "1.1.0",
  "event": "contract_metadata_update",
  "data": []
}
```

## Events for Other NFT Methods

Note that the example events above cover two different kinds of events:
1. Events that do not have a dedicated trigger function in the NFT Standard (`nft_mint`, `nft_burn`, `contract_metadata_update`)
2. An event that has a relevant trigger function [NFT Core Standard](Core.md#nft-interface) (`nft_transfer`)

This event standard also applies beyond the events highlighted here, where future events follow the same convention of as the second type. For instance, if an NFT contract uses the [approval management standard](ApprovalManagement.md), it may emit an event for `nft_approve` if that's deemed as important by the developer community.
 
Please feel free to open pull requests for extending the events standard detailed here as needs arise.
