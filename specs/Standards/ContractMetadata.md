# Contract Metadata

## [NEP-330](https://github.com/near/NEPs/discussions/329)

Version `1.0.0`

## Summary

The contract metadata is a standard interface to allow for auditing and viewing source code for a deployed smart contract. Implementation of this standard is purely optional but is recommended for developers whose contracts are open source.

## Motivation

There is no trivial way of finding the source code or author of a deployed smart contract. By having a standard that outlines how to view the source code of an arbitrary smart contract, an environment of openness and collaboration is created.

The initial discussion can be found [here](https://github.com/near/NEPs/discussions/329).

## Interface

Metadata applies at the contract level (`ContractMetadata`):

```ts
type ContractMetadata = {
  version: string|null, // optional, commit hash being used for the currently deployed wasm. If the contract is not open-sourced, this could also be a numbering system for internal organization / tracking such as "1.0.0" and "2.1.0".
  link: string|null, //optional,  link to open source code such as a Github repository or a CID to somewhere on IPFS.
}
```

A new function for querying the metadata must be supported on each smart contract implementing the standard:

```ts
function contract_metadata(): ContractMetadata {}
```

It is up to the author of the contract to keep the version and link up to date when new code is deployed. They can choose to update the metadata with a setter, have it static on the contract, or any other way of their choosing.

### An implementing contract MAY include the following fields on-chain

- `version`: a string that references the specific commit hash or version of the code that is currently deployed on-chain. This can be included regardless of whether or not the contract is open-sourced and can also be used for organizational purposes.
- `link`: a string that references the link to the open source code. This can be anything such as Github or a CID to somewhere on IPFS.

## Future possibilities

- By having a standard outlining metadata for an arbitrary contract, any information that pertains on a contract level can be added based on the requests of the developer community.
