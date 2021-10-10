# Event Logs

Version `1.0.0`

## Summary

A standard interface for logging events including
JSON, Binary and future formats. This addresses
of the problem of duplicate events in inconsistent
formats needing different logic to parse.

## Motivation

Near apps commonly log data on chain to be indexed
off chain. For every kind of dApp, there are generic sets
of information that are useful to index:
- Wallet like Apps
    - minting events
    - transfer events
- NFT Marketplace Apps
    - Approval events
    - Market events
- etc

Without this, it'll be hard to index useful
information in general from apps. This
creates inconsistent experiences.

Event logs are strings consistent of 2 parts:
- Event name
    - e.g. `EVENT_JSON`, `EVENT_BINARY`
- Event data
    - Information about the event in native format

Events can be represented in the following formats

- JSON Data [NEP 256](https://github.com/near/NEPs/pull/256)


### Event Interface
```ts
// Interface of an JSON event log
//
// Arguments
// * `standard`: name of standard e.g. nep171
// * `version`: e.g. 1.0.0
// * `event`: NEP 256 event name e.g. `nft_mint` - [NEP 256](https://github.com/near/NEPs/pull/256)
// * `data`: NEP 256 event - [NEP 256](https://github.com/near/NEPs/pull/256)
interface EventJsonLog {
  standard:string,
  version:string,
  event:string,
  data: string
}
```

## Drawbacks

Other formats other than JSON are yet to
be confirmed. https://github.com/near/NEPs/issues/254#issuecomment-928249174
