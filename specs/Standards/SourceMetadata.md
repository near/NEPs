# Source Metadata

## [NEP-330](https://github.com/near/NEPs/blob/master/neps/nep-0330.md)

Version `1.1.0`

## Summary

The contract source metadata is a standard interface that allows auditing and viewing source code for a deployed smart contract. Implementation of this standard is purely optional but is recommended for developers whose contracts are open source.

## Motivation

There is no trivial way of finding the source code or author of a deployed smart contract. Having a standard that outlines how to view the source code of an arbitrary smart contract creates an environment of openness and collaboration.

Additionally, we would like for wallets and dApps to be able to parse this information and determine which methods they are able to call and render UIs that provide that functionality.

The initial discussion can be found [here](https://github.com/near/NEPs/discussions/329).

## Rationale and alternatives

There is a lot of information that can be held about a contract. Ultimately, we wanted to limit it to the least amount fields while still maintaining our goal. This decision was made to not bloat the contracts with unnecessary storage and also to keep the standard simple and understandable.

## Specification

Successful implementations of this standard will introduce a new  (`ContractSourceMetadata`) struct that will hold all the necessary information to be queried for. This struct will be kept on the contract level.

The metadata will include two optional fields:
- `version`: a string that references the specific commit hash or version of the code that is currently deployed on-chain. This can be included regardless of whether or not the contract is open-sourced and can also be used for organizational purposes.
- `link`: a string that references the link to the open-source code. This can be anything such as Github or a CID to somewhere on IPFS.
- `standards`: a list of objects (see type definition below) that enumerates the NEPs supported by the contract. If this extension is supported, it is advised to also include NEP-330 version 1.1.0 in the list (`{standard: "nep330", version: "1.1.0"}`).

```ts
type ContractSourceMetadata = {
  version: string|null, // optional, commit hash being used for the currently deployed wasm. If the contract is not open-sourced, this could also be a numbering system for internal organization / tracking such as "1.0.0" and "2.1.0".
  link: string|null, // optional, link to open source code such as a Github repository or a CID to somewhere on IPFS.
  standards: Standard[]|null, // optional, standards and extensions implemented in the currently deployed wasm e.g. [{standard: "nep330", version: "1.1.0"},{standard: "nep141", version: "1.0.0"}].
}

type Standard {
    standard: string, // standard name e.g. "nep141"
    version: string, // semantic version number of the Standard e.g. "1.0.0"
}
```

In order to view this information, contracts must include a getter which will return the struct.

```ts
function contract_source_metadata(): ContractSourceMetadata {}
```

## Reference Implementation

As an example, say there was an NFT contract deployed on-chain which was currently using the commit hash `39f2d2646f2f60e18ab53337501370dc02a5661c` and had its open source code located at `https://github.com/near-examples/nft-tutorial`. This contract would then include a struct which has the following fields:

```ts
type ContractSourceMetadata = {
  version: "39f2d2646f2f60e18ab53337501370dc02a5661c"
  link: "https://github.com/near-examples/nft-tutorial",
  standards: [
    {
        standard: "nep330", 
        version: "1.1.0"
    },
    {
        standard: "nep171", 
        version: "1.0.0"
    },
    {
        standard: "nep177", 
        version: "2.0.0"
    }
  ]
}
```

If someone were to call the view function `contract_metadata`, the contract would return:

```bash
{
    version: "39f2d2646f2f60e18ab53337501370dc02a5661c"
    link: "https://github.com/near-examples/nft-tutorial",
    standards: [
        {
            standard: "nep330", 
            version: "1.1.0"
        },
        {
            standard: "nep171", 
            version: "1.0.0"
        },
        {
            standard: "nep177", 
            version: "2.0.0"
        }
    ]
}
```

An example implementation can be seen below.

```rust
/// Simple Implementation
#[near_bindgen]
pub struct Contract {
    pub contract_metadata: ContractSourceMetadata
}

// Standard structure
type Standard {
    standard: string, // standard name e.g. "nep141"
    version: string // semantic version number of the Standard e.g. "1.0.0"
}

/// Contract metadata structure
pub struct ContractSourceMetadata {
    pub version: String,
    pub link: String,
    pub standards: Vec<Standard>
}

/// Minimum Viable Interface
pub trait ContractSourceMetadataTrait {
    fn contract_source_metadata(&self) -> ContractSourceMetadata;
}

/// Implementation of the view function
#[near_bindgen]
impl ContractSourceMetadataTrait for Contract {
    fn contract_source_metadata(&self) -> ContractSourceMetadata {
        self.contract_source_metadata.get().unwrap()
    }
}
```

## Future possibilities

- By having a standard outlining metadata for an arbitrary contract, any information that pertains on a contract level can be added based on the requests of the developer community.
