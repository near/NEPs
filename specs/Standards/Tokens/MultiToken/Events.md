# Multi Token Event

:::caution
This is part of the proposed spec [NEP-245](https://github.com/near/NEPs/blob/master/neps/nep-0245.md) and is subject to change.
:::

Version `1.0.0`

## Summary

Standard interfaces for Multi Token Contract actions.
Extension of [NEP-297](../../EventsFormat.md)

## Motivation

NEAR and third-party applications need to track
 `mint`, `burn`, `transfer` events for all MT-driven apps consistently. This exension addresses that.

Note that applications, including NEAR Wallet, could require implementing additional methods to display tokens correctly such as [`mt_metadata`](Metadata.md) and [`mt_tokens_for_owner`](Enumeration.md).

## Interface
Multi Token Events MUST have `standard` set to `"nep245"`, standard version set to `"1.0.0"`, `event` value is one of `mt_mint`, `mt_burn`, `mt_transfer`, and `data` must be of one of the following relavant types: `MtMintLog[] | MtBurnLog[] | MtTransferLog[]`:



```ts
interface MtEventLogData {
  EVENT_JSON: {
    standard: "nep245",
    version: "1.0.0",
    event: MtEvent,
    data: MtMintLog[] | MtBurnLog[] | MtTransferLog[]
  }
}
```

```ts
// Minting event log. Emitted when a token is minted/created. 
// Requirements
// * Contract MUST emit event when minting a token
// Fields 
// * Contract token_ids and amounts MUST be the same length 
// * `owner_id`: the account receiving the minted token
// * `token_ids`: the tokens minted
// * `amounts`: the number of tokens minted, wrapped in quotes and treated
//    like a string, although the numbers will be stored as an unsigned integer
//    array with 128 bits.
// * `memo`: optional message
interface MtMintLog {
    owner_id: string,
    token_ids: string[],
    amounts: string[],
    memo?: string
}

// Burning event log. Emitted when a token is burned.  
// Requirements
// * Contract MUST emit event when minting a token
// Fields 
// * Contract token_ids and amounts MUST be the same length 
// * `owner_id`: the account whose token(s) are being burned
// * `authorized_id`: approved account_id to burn, if applicable
// * `token_ids`: the tokens being burned
// * `amounts`: the number of tokens burned, wrapped in quotes and treated
//    like a string, although the numbers will be stored as an unsigned integer
//    array with 128 bits.
// * `memo`: optional message
interface MtBurnLog {
    owner_id: string,
    authorized_id?: string,
    token_ids: string[],
    amounts: string[],
    memo?: string
}

// Transfer event log. Emitted when a token is transferred.  
// Requirements
// * Contract MUST emit event when transferring a token
// Fields 
// * `authorized_id`: approved account_id to transfer
// * `old_owner_id`: the account sending the tokens "sender.near"
// * `new_owner_id`: the account receiving the tokens "receiver.near"
// * `token_ids`: the tokens to transfer 
// * `amounts`: the number of tokens to transfer, wrapped in quotes and treated
//    like a string, although the numbers will be stored as an unsigned integer
//    array with 128 bits.
interface MtTransferLog {
    authorized_id?: string,
    old_owner_id: string,
    new_owner_id: string,
    token_ids: string[],
    amounts: string[],
    memo?: string
}
```

## Examples

Single owner minting (pretty-formatted for readability purposes):

```js
EVENT_JSON:{
  "standard": "nep245",
  "version": "1.0.0",
  "event": "mt_mint",
  "data": [
    {"owner_id": "foundation.near", "token_ids": ["aurora", "proximitylabs_ft"], "amounts":["1", "100"]}
  ]
}
```

Different owners minting:

```js
EVENT_JSON:{
  "standard": "nep245",
  "version": "1.0.0",
  "event": "mt_mint",
  "data": [
    {"owner_id": "foundation.near", "token_ids": ["aurora", "proximitylabs_ft"], "amounts":["1","100"]},
    {"owner_id": "user1.near", "token_ids": ["meme"], "amounts": ["1"]}
  ]
}
```

Different events (separate log entries):

```js
EVENT_JSON:{
  "standard": "nep245",
  "version": "1.0.0",
  "event": "mt_burn",
  "data": [
    {"owner_id": "foundation.near", "token_ids": ["aurora", "proximitylabs_ft"], "amounts": ["1","100"]},
  ]
}
```

Authorized id:

```js
EVENT_JSON:{
  "standard": "nep245",
  "version": "1.0.0",
  "event": "mt_burn",
  "data": [
    {"owner_id": "foundation.near", "token_ids": ["aurora_alpha", "proximitylabs_ft"], "amounts": ["1","100"], "authorized_id": "thirdparty.near" },
  ]
}
```

```js
EVENT_JSON:{
  "standard": "nep245",
  "version": "1.0.0",
  "event": "mt_transfer",
  "data": [
    {"old_owner_id": "user1.near", "new_owner_id": "user2.near", "token_ids": ["meme"], "amounts":["1"], "memo": "have fun!"}
  ]
}

EVENT_JSON:{
  "standard": "nep245",
  "version": "1.0.0",
  "event": "mt_transfer",
  "data": [
    {"old_owner_id": "user2.near", "new_owner_id": "user3.near", "token_ids": ["meme"], "amounts":["1"], "authorized_id": "thirdparty.near", "memo": "have fun!"}
  ]
}
```

## Further methods

Note that the example events covered above cover two different kinds of events:
1. Events that are not specified in the MT Standard (`mt_mint`, `mt_burn`)
2. An event that is covered in the [Multi Token Core Standard](Core.md). (`mt_transfer`)

This event standard also applies beyond the three events highlighted here, where future events follow the same convention of as the second type. For instance, if an MT contract uses the [approval management standard](ApprovalManagement.md), it may emit an event for `mt_approve` if that's deemed as important by the developer community.

Please feel free to open pull requests for extending the events standard detailed here as needs arise.

## Drawbacks

There is a known limitation of 16kb strings when capturing logs.
This can be observed from `token_ids` that may vary in length
for different apps so the amount of logs that can
be executed may vary.
