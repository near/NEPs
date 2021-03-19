# Non-Fungible Token Metadata ([NEP-???](???))

Version `1.0.0`

## Summary

An interface for a non-fungible token's metadata. The goal is to keep the metadata future-proof as well as lightweight. This will be important to dApps needing additional information about an FT's properties, and broadly compatible with other token standards such that the [NEAR Rainbow Bridge](https://near.org/blog/eth-near-rainbow-bridge/) can move tokens between chains.

## Motivation

The primary value of non-fungible tokens comes from their metadata. While the [core standard](Core.md) provides the minimum interface that can be considered a non-fungible token, most artists, developers, and dApps will want to associate more data with each NFT, and will want a predictable way to interact with any NFT's metadata.

NEAR's unique [storage staking](https://docs.near.org/docs/concepts/storage-staking) approach makes it feasible to store more data on-chain than other blockchains. This standard leverages this strength for common metadata attributes, and provides a standard way to link to additional offchain data to support rapid community experimentation.

This standard also provides a `spec` version. This makes it easy for consumers of NFTs, such as marketplaces, to know if they support all the features of a given token.

Prior art:

- NEAR's [Fungible Token Metadata Standard](../FungibleToken/Metadata.md)

## Interface

Metadata applies at both the contract level (`NFTMetadata`) and the token level (`TokenMetadata`). The relevant metadata for each:

```ts
type NFTMetadata = {
  spec: string; // required, essentially a version like "nft-1.0.0"
  name: string; // required, ex. "Mochi Rising — Digital Edition" or "Metaverse 3"
  symbol: string; // required, ex. "MOCHI"
  icon: string|null, // Data URL
  reference: string|null, // URL to a JSON file with more info
  reference_hash: string|null // Base64-encoded sha256 hash of JSON from reference field. Required if `reference` is included.
}

type TokenMetadata = {
  name: String, // required, ex. "Arch Nemesis: Mail Carrier" or "Parcel #5055"
  media: Option<String>, // preferably a decentralized URL to associated media
}
```

Then a new field is needed on NFT contract:

```ts
function nft_metadata(): NFTMetadata {}
```

And a new attribute must be added to each `Token` struct:

```diff
 type Token = {
   owner_id: string,
+  metadata: TokenMetadata,
 }
```

**An implementing contract MUST include the following fields on-chain**

- `spec`: a string. Should be `ft-1.0.0` to indicate that a Fungible Token contract adheres to the current versions of this Metadata and the [Fungible Token Core](./FungibleTokenCore.md) specs. This will allow consumers of the Fungible Token to know if they support the features of a given contract.
- `name`: for the NFT, the human-readable name of the set of tokens. For individual tokens, the name of this specific token.
- `symbol`: the abbreviation, like MOCHI or MV3

**An implementing contract MAY include the following fields on-chain**

- `icon`: a small image associated with this token. Encouraged to be a [data URL](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs), to help consumers display it quickly while protecting user data. Recommendation: use [optimized SVG](https://codepen.io/tigt/post/optimizing-svgs-in-data-uris), which can result in high-resolution images with only 100s of bytes of [storage cost](https://docs.near.org/docs/concepts/storage-staking). (Note that these storage costs are incurred to the token owner/deployer, but that querying these icons is a very cheap & cacheable read operation for all consumers of the contract and the RPC nodes that serve the data.) Recommendation: create icons that will work well with both light-mode and dark-mode websites by either using middle-tone color schemes, or by [embedding `media` queries in the SVG](https://timkadlec.com/2013/04/media-queries-within-svg/).
- `reference`: a link to a valid JSON file containing various keys offering supplementary details on the token. Example: "/ipfs/QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm", "https://example.com/token.json", etc. If the information given in this document conflicts with the on-chain attributes, the values in `reference` shall be considered the source of truth.
- `reference_hash`: the base64-encoded sha256 hash of the JSON file contained in the `reference` field. This is to guard against off-chain tampering.

## Drawbacks

* When this NFT contract is created and initialized, the storage use per-token will be higher than an NFT Core version. Frontends can account for this by adding extra deposit when minting. This could be done by padding with a reasonable amount, or by the frontend using the [RPC call detailed here](https://docs.near.org/docs/develop/front-end/rpc#genesis-config) that gets genesis configuration and actually determine precisely how much deposit is needed.
* Convention of `icon` being a data URL rather than a link to an HTTP endpoint that could contain privacy-violating code cannot be done on deploy or update of contract metadata, and must be done on the consumer/app side when displaying token data.
* If on-chain icon uses a data URL or is not set but the document given by `reference` contains a privacy-violating `icon` URL, consumers & apps of this data should not naïvely display the `reference` version, but should prefer the safe version. This is technically a violation of the "`reference` setting wins" policy described above.

## Future possibilities

- Detailed conventions that may be enforced for versions.
- A fleshed out schema for what the `reference` object should contain.
