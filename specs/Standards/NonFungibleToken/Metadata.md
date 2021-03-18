# Non-Fungible Token Metadata ([NEP-???](???))

Version `1.0.0`

An interface for a non-fungible token's metadata. The goal is to keep the metadata future-proof as well as lightweight. etc, etc

## Interface

Metadata applies at both the contract level (`NFTMetadata`) and the token level (`TokenMetadata`). The relevant metadata for each:

```rust
type NFTMetadata = {
  spec: string; // required, essentially a version like "nft-1.0.0"
  name: String; // required, ex. "Mochi Rising — Digital Edition" or "Metaverse 3"
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

```rust
function nft_metadata(): NFTMetadata {}
```

And a new attribute must be added to each `Token` struct:

```diff
 type Token = {
   owner_id: string,
+  metadata: TokenMetadata,
 }
```

## Drawbacks

* When this NFT contract is created and initialized, the storage use per-token will be higher than an NFT Core version. Frontends can account for this by adding extra deposit when minting. This could be done by padding with a reasonable amount, or by the frontend using the [RPC call detailed here](https://docs.near.org/docs/develop/front-end/rpc#genesis-config) that gets genesis configuration and actually determine precisely how much deposit is needed.
