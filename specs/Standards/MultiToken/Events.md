# Multi Token Event([NEP-246](https://github.com/near/NEPs/discussions/246))


Version `1.0.0`

## Summary

Standard interfaces for Multi Token Contract actions.

## Motivation

MT-driven apps such as marketplaces and videogames perform a few 
core actions `minting`, `burning`, `transferring`, and 
`approving tokens for transfer`.

Each app has their own way of performing these actions and it
is difficult to consistently capture these actions. We codify these
actions as events, in order to capture them from a variety of context
within the MT Contract. This specification enables the events to be 
broadly consumed by indexers, developers, and interested systems.


Contract implementers are required to emit events for the actions they take. 
These actions are `minting`,`burning`,`transferring`, and `approving tokens to be transferred`.

This enables indexers, and systems to be able to build a consistent view of the contract and take action on the contract without polling.

Prior Art:
- [ERC-721]'s events 
- [ERC-1155]'s events 
- [NEP-254]'s events

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
Multi Token Events MUST have `standard` set to `"nep246"`, standard version set to `"1.0.0"`, `event` value is one of `mt_mint`, `mt_burn`, `mt_transfer`, `mt_approval` and `data` must be of one of the following relavant types: `MtMintLog[] | MtBurnLog[] | MtTransferLog[] | MtApprovalLog[]`:



```ts
// Interface to capture an event. The indexer looks for events prefixed 
// with EVENT_JSON. The rest follows the EventLog 
type MtEvent = "mt_mint" | "mt_burn" | "mt_transfer" | "mt_approval"

// Interface for MT contract event data. It is used to emit event data with
// the near standard logging.    
// * `EVENT_JSON`: The standard event prefix required to signal consumers about
// the type of log data being emitted.
// * `standard`: name of standard e.g. nep-246 
// * `version`: e.g. "1.0.0"
// * `event`: `mt_mint` | `mt_burn` | `mt_transfer` | `mt_approval`
// * `data`: associate event data
interface MtEventLogData {
  EVENT_JSON: {
    standard: "nep246",
    version: "1.0.0",
    event: MtEvent,
    data: MtMintLog[] | MtBurnLog[] | MtTransferLog[] | MtApprovalLog[]
  }
}

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
// * `authorized_id`: approved account to burn, if applicable
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

// Transfer event log. Emitted when a token is transfered.  
// Requirements
// * Contract MUST emit event when transferring a token
// Fields 
// * `authorized_id`: approved account to transfer
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
// Approval event log. Emitted when a token's approval has changed.  
// Requirements
// * Contract MUST emit event when approval of tokens have changed
// * Contract token_ids and amounts MUST be the same length 
// Fields 
// * `owner_id`: the account who owns the token, sending the approval
// * `approved_account_id`: the account being approved
// * `token_ids`: the tokens to transfer 
// * `amounts`: the number of tokens approved for transfer, wrapped in quotes and treated
//    like a string, although the numbers will be stored as an unsigned integer
//    array with 128 bits.
// * `memo`: optional message
interface MtApprovalLog {
    owner_id: string,
    approved_account_id: string,
    token_ids: string[],
    amounts: string[],
    memo?:  string
}

```

## Examples

Single owner minting (pretty-formatted for readability purposes):

```js
EVENT_JSON:{
  "standard": "nep246",
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
  "standard": "nep246",
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
  "standard": "nep246",
  "version": "1.0.0",
  "event": "mt_burn",
  "data": [
    {"owner_id": "foundation.near", "token_ids": ["aurora", "proximitylabs_ft"], "amounts": ["1","100"]},
  ]
}
```

```js
EVENT_JSON:{
  "standard": "nep246",
  "version": "1.0.0",
  "event": "mt_transfer",
  "data": [
    {"old_owner_id": "user1.near", "new_owner_id": "user2.near", "token_ids": ["meme"], "amounts":["1"], "memo": "have fun!"}
  ]
}
```

```js
EVENT_JSON:{
  "standard": "nep246",
  "version": "1.0.0",
  "event": "mt_approval",
  "data": [
    {"owner_id": "user1.near", "approved_account_id": "market.near", "token_ids": ["meme"], "amounts":["1"], "memo": "have fun at the market!"}
  ]
}
```


## Drawbacks

There is a known limitation of 16kb strings when capturing logs.
This can be observed from `token_ids` that may vary in length
for different apps so the amount of logs that can
be executed may vary.

  [ERC-721]: https://eips.ethereum.org/EIPS/eip-721
  [ERC-1155]: https://eips.ethereum.org/EIPS/eip-1155
  [storage]: https://docs.near.org/docs/concepts/storage-staking
  [NEP-254]: https://github.com/near/NEPs/issues/254

