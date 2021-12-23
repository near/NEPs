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
Keep in mind that applications, including NEAR Wallet, could require implementing additional methods to display the NFTs correctly, such as [`nft_metadata`](Metadata.md) and [`nft_tokens_for_owner`](Enumeration.md).

We need a standard way to capture events.
This was discussed here https://github.com/near/NEPs/issues/254.

## Events

Many apps use different interfaces that represent the same action.
This interface standardizes that process by introducing event logs.
There is no Event NEP yet, so this standard paves the road to that.

Events use standard logs capability of NEAR and defined as a convention.
Events are log entries that start with `EVENT_JSON:` prefix followed by a single valid JSON document of the following interface:

```ts
// Interface to capture data 
// about an event
// Arguments
// * `standard`: name of standard e.g. nep171
// * `version`: e.g. 1.0.0
// * `event`: string
// * `data`: associate event data
interface EventLogData {
    standard: string,
    version: string,
    event: string,
    data?: unknown,
}
```

#### Valid event logs:

```js
EVENT_JSON:{"standard": "nepXXX", "version": "1.0.0", "event": "xyz_is_triggered"}
```

```js
EVENT_JSON:{
  "standard": "nepXXX",
  "version": "1.0.0",
  "event": "xyz_is_triggered"
}
```

```js
EVENT_JSON:{"standard": "nepXXX", "version": "1.0.0", "event": "xyz_is_triggered", "data": {"triggered_by": "foundation.near"}}
```

#### Invalid event logs:

* Two events in a single log entry (instead, call `log` for each individual event)
```
EVENT_JSON:{"standard": "nepXXX", "version": "1.0.0", "event": "xyz_is_triggered"}
EVENT_JSON:{"standard": "nepXXX", "version": "1.0.0", "event": "xyz_is_triggered"}
```
* Invalid JSON data
```
EVENT_JSON:invalid json
```

## Interface

Non-Fungible Token Events MUST have `standard` set to `"nep171"`, standard version set to `"1.0.0"`, `event` value is one of `nft_mint`, `nft_burn`, `nft_transfer`, and `data` must be of one of the following relavant types: `NftMintLog[] | NftTransferLog[] | NftBurnLog[]`:

```ts
interface EventLogData {
    standard: "nep171",
    version: "1.0.0",
    event: "nft_mint" | "nft_burn" | "nft_transfer",
    data: NftMintLog[] | NftTransferLog[] | NftBurnLog[],
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
```

## Examples

Single owner batch minting (pretty-formatted for readability purposes):

```js
EVENT_JSON:{
  "standard": "nep171",
  "version": "1.0.0",
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
  "version": "1.0.0",
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
  "version": "1.0.0",
  "event": "nft_burn",
  "data": [
    {"owner_id": "foundation.near", "token_ids": ["aurora", "proximitylabs"]},
  ]
}
```

```js
EVENT_JSON:{
  "standard": "nep171",
  "version": "1.0.0",
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
  "version": "1.0.0",
  "event": "nft_burn",
  "data": [
    {"owner_id": "owner.near", "token_ids": ["goodbye", "aurevoir"], "authorized_id": "thirdparty.near"}
  ]
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
