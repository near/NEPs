# Fungible Token Metadata ([NEP-148](https://github.com/near/NEPs/discussions/148))

Version `1.0.0`

## Summary
[summary]: #summary

An interface for a fungible token's metadata. The goal is to keep the metadata future-proof as well as lightweight. This will be important to dApps needing additional information about an FT's properties, and broadly compatible with other tokens standards such that the [NEAR Rainbow Bridge](https://near.org/blog/eth-near-rainbow-bridge/) can move tokens between chains.

## Motivation

Custom fungible tokens play a major role in decentralized applications today. FTs can contain custom properties to differentiate themselves from other tokens or contracts in the ecosystem. Some properties, such as a token's description, are best stored off-chain or in a decentralized storage platform, in order to save on storage costs. Other properties, however, are more fundamental to a token's identity and arguably belong on-chain, like the token's name and symbol.

As blockchain technology advances, it becomes increasingly important to provide backwards compatibility and a concept of a spec. This standard encompasses all the concerns mentioned. Extra properties not included here likely belong in the `reference` object.

Prior art:
- [EIP-1046](https://eips.ethereum.org/EIPS/eip-1046)
- [OpenZeppelin's ERC-721 Metadata standard](https://docs.openzeppelin.com/contracts/2.x/api/token/erc721#ERC721Metadata) also helped, although it's for non-fungible tokens.

## Guide-level explanation

A fungible token smart contract allows for discoverable properties. Some properties can be determined by other contracts on-chain, or return in view method calls. Others can only be determined by an oracle system to be used on-chain, or by a frontend with the ability to access a linked reference file.

### Examples scenario

#### Token provides metadata upon deploy and initialization

Alice deploys a wBTC fungible token contract.

**Assumptions**

- The wBTC token contract is `wbtc`.
- Alice's account is `alice`.
- The precision ("decimals" in this metadata standard) on wBTC contract is `10^8`.

**High-level explanation**

Alice issues a transaction to deploy and initialize the fungible token contract, providing arguments to the initialization function that set metadata fields.

**Technical calls**

1. `alice` deploys a contract and calls `wbtc::new({"owner_id": "wbtc", "total_supply": "100000000000000", "spec": "ft-1.0.0", "name": "Wrapped Bitcoin", "symbol": "WBTC", "reference": "https://example.com/wbtc.json", "reference_hash": "7c879fa7b49901d0ecc6ff5d64d7f673da5e4a5eb52a8d50a214175760d8919a", "decimals": 8})`.

If this deploy and initialization were done using [NEAR CLI](https://docs.near.org/docs/tools/near-cli) the command would be:

    near deploy wbtc --wasmFile res/ft.wasm --initFunction new --initArgs '{"owner_id": "wbtc", "total_supply": "100000000000000", "spec": "ft-1.0.0", "name": "Wrapped Bitcoin", "symbol": "WBTC", "reference": "https://example.com/wbtc.json", "reference_hash": "7c879fa7b49901d0ecc6ff5d64d7f673da5e4a5eb52a8d50a214175760d8919a", "decimals": 8}'

## Reference-level explanation

A fungible token contract implementing the metadata standard shall contain a field named `ft_metadata`. The field will link to a structure with the properties from the interface below.

**Interface**:

```ts
type FungibleTokenMetadata = {
    spec: string;
    name: string;
    symbol: string;
    reference: string;
    reference_hash: string;
    decimals: number;
}
```

**Fields**:

- `spec` is a string and should be `ft-1.0.0` to indicate that a Fungible Token contract adheres to the current versions of this Metadata and Core spec. This will allow consumers of the Fungible Token to know if they support the features of a given contract.
- `name` is the human-readable name of the token.
- `symbol` is the abbreviation, like wETH or AMPL.
- `reference` is a link to a valid JSON file containing various keys offering supplementary details on the token. (For example: "/ipfs/QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm", "https://example.com/token.json", etc.)
- `reference_hash` is the sha256 hash of the JSON file contained in the `reference` field. This is to guard against off-chain tampering.
- `decimals` is used aid in the frontend showing the proper significant digits of a token. This concept is explained well in this [OpenZeppelin post](https://docs.openzeppelin.com/contracts/3.x/erc20#a-note-on-decimals).

## Drawbacks

- It could be argued that `symbol` and even `name` could belong as key/values in the `reference` JSON object.
- It might make sense to add `icon_url` and `icon_hash` to the on-chain properties listed in `FungibleTokenMetadata`.

## Future possibilities

- Detailed conventions that may be enforced for versions.
- A fleshed out schema for what the `reference` object should contain.
