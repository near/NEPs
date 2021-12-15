# Fungible Token Event

Version `1.0.0`

## Summary

Standard interfaces for FT contract actions.
Extension of [NEP-297](../EventsFormat.md)

## Motivation

NEAR and third-party applications need to track `mint`, `transfer`, `burn` events for all FT-driven apps consistently.
This extension addresses that.

Keep in mind that applications, including NEAR Wallet, could require implementing additional methods, such as [`ft_metadata`](Metadata.md), to display the FTs correctly.

## Interface

Fungible Token Events MUST have `standard` set to `"nep141"`, standard version set to `"1.0.0"`, `event` value is one of `ft_mint`, `ft_burn`, `ft_transfer`, and `data` must be of one of the following relevant types: `FtMintLog[] | FtTransferLog[] | FtBurnLog[]`:

```ts
interface FtEventLogData {
    standard: "nep141",
    version: "1.0.0",
    event: "ft_mint" | "ft_burn" | "ft_transfer",
    data: FtMintLog[] | FtTransferLog[] | FtBurnLog[],
}
```

```ts
// An event log to capture tokens minting
// Arguments
// * `owner_id`: "account.near"
// * `amount`: the number of tokens to mint, wrapped in quotes and treated
//   like a string, although the number will be stored as an unsigned integer
//   with 128 bits.
// * `memo`: optional message
interface FtMintLog {
    owner_id: string,
    amount: string,
    memo?: string
}

// An event log to capture tokens burning
// Arguments
// * `owner_id`: owner of tokens to burn
// * `amount`: the number of tokens to burn, wrapped in quotes and treated
//   like a string, although the number will be stored as an unsigned integer
//   with 128 bits.
// * `memo`: optional message
interface FtBurnLog {
    owner_id: string,
    amount: string,
    memo?: string
}

// An event log to capture tokens transfer
// Arguments
// * `old_owner_id`: "owner.near"
// * `new_owner_id`: "receiver.near"
// * `amount`: the number of tokens to transfer, wrapped in quotes and treated
//   like a string, although the number will be stored as an unsigned integer
//   with 128 bits.
// * `memo`: optional message
interface FtTransferLog {
    old_owner_id: string,
    new_owner_id: string,
    amount: string,
    memo?: string
}
```

## Examples

Batch mint:

```js
EVENT_JSON:{
  "standard": "nep141",
  "version": "1.0.0",
  "event": "ft_mint",
  "data": [
    {"owner_id": "foundation.near", "amount": "500"}
  ]
}
```

Batch transfer:

```js
EVENT_JSON:{
  "standard": "nep141",
  "version": "1.0.0",
  "event": "ft_transfer",
  "data": [
    {"old_owner_id": "from.near", "new_owner_id": "to.near", "amount": "42", "memo": "hi hello bonjour"},
    {"old_owner_id": "user1.near", "new_owner_id": "user2.near", "amount": "7500"}
  ]
}
```

Batch burn:

```js
EVENT_JSON:{
  "standard": "nep141",
  "version": "1.0.0",
  "event": "ft_burn",
  "data": [
    {"owner_id": "foundation.near", "amount": "100"},
  ]
}
```

## Further methods

Note that the example events covered above cover two different kinds of events:
1. Events that are not specified in the FT Standard (`ft_mint`, `ft_burn`)
2. An event that is covered in the [FT Core Standard](Core.md). (`ft_transfer`)

Please feel free to open pull requests for extending the events standard detailed here as needs arise.
