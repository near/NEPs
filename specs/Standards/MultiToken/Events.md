# Multi Token Event([NEP-246](https://github.com/near/NEPs/discussions/246))


Version `1.0.0`

## Summary

Standard interfaces for emitting events for a Multi Token Contract.

## Motivation

MT driven apps such as marketplaces and videogames perform a few 
core actions minting, burning, transferring, and approving tokens
for transfer.

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


## Interface


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
    standard: string,
    version: string,
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
interface MtMintLog {
    owner_id: string,
    token_ids: string[],
    amounts: string[],
}

// Burning event log. Emitted when a token is burned.  
// Requirements
// * Contract MUST emit event when minting a token
// Fields 
// * Contract token_ids and amounts MUST be the same length 
// * `owner_id`: the account whose token(s) are being burned
// * `token_ids`: the tokens being burned
// * `amounts`: the number of tokens burned, wrapped in quotes and treated
//    like a string, although the numbers will be stored as an unsigned integer
//    array with 128 bits.
interface MtBurnLog {
    owner_id: string,
    token_ids: string[]
    amounts: string[]
}

// Transfer event log. Emitted when a token is transfered.  
// Requirements
// * Contract MUST emit event when transferring a token
// Fields 
// * `sender_id`: the account sending the tokens
// * `receiver_id`: the account receiving the tokens
// * `token_ids`: the tokens to transfer 
// * `amounts`: the number of tokens to transfer, wrapped in quotes and treated
//    like a string, although the numbers will be stored as an unsigned integer
//    array with 128 bits.
interface MtTransferLog {
    sender_id: string,
    receiver_id: string,
    token_ids: string[],
    amounts: string[]
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
interface MtApprovalLog {
    owner_id: string,
    approved_account_id: string,
    token_ids: string[],
    amounts: string[]
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

