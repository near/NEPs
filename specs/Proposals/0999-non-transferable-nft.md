---
NEP: 999
Title: Non-transferable NFT Standard
Author: Jasper Timm <jasper@kycdao.xyz>, Sándor Juhász <sandor@kycdao.xyz>, Balazs Nemethi <balazs@kycdao.xyz>
DiscussionsTo: https://github.com/nearprotocol/neps/pull/0999
Status: Draft
Type: Standards Track
Category: Contract
Created: 02-May-2022
Requires: 171
---

## Summary

A standardised interface for constructing NFTs (non fungible tokens) that are not meant to be transfered. These non-transferable NFTs (NTNFTs, or account bound NFTs) should be bound to an owner address on minting so the owner never changes.

## Motivation

There are cases when a service would like to attribute something to a specific address and only that address. In such cases these attestations would no longer be applicable if they were transfered to a different account.

Example use-cases:

- badges, POAPs
- proofs of KYC or other verifications
- ticketing, access control
- certificates

As each of these attestations would be unique, it also makes sense to build upon the existing infrastructure already built for NFTs by basing this new standard on [NEP-171](../../neps/nep-0171.md). This would mean existing software, such as wallets, have 'backwards compatibility' with these tokens, allowing it to display simple details such as title, symbol and images.

In addition, having the non-transferable nature standardised would mean that in the future, software could give users a hint in the UI that these tokens are account bound and disabling any transfer functionality.

## Rationale and alternatives

One possible alternative to this standard would be to implement the non-transferable nature by creating a NEP-171 contract whose transfer function is prohibited (or extremely limited). However, recognising this fact would be hard to determine without checking the code of the contract. Making this limitation explicit, via a standard, would build trust in the owners of tokens abiding to this new NEP standard.

## Specification

From a technical standpoint the functionality described by this standard will be a subset of the standard NFT functions as described in [NEP-171](../../neps/nep-0171.md). In general terms, it is the NEP-171 standard WITHOUT any transfer or approval/allowance functionality.

### NTNFT Interface

```ts
// The base structure that will be returned for a token. If contract is using
// extensions such as Enumeration, Metadata, or other
// attributes may be included in this structure.
type Token = {
   token_id: string,
   owner_id: string,
 }

/****************/
/* VIEW METHODS */
/****************/

// Returns the token with the given `token_id` or `null` if no such token.
function nft_token(token_id: string): Token|null {}
```

To be more explicit then, an interface of this standard **SHOULD NOT** include the following functions from the NEP-171 standard:
```ts
function nft_transfer(
  receiver_id: string,
  token_id: string,
  approval_id: number|null,
  memo: string|null,
) {}

function nft_transfer_call(
  receiver_id: string,
  token_id: string,
  approval_id: number|null,
  memo: string|null,
  msg: string,
): Promise {}

function nft_resolve_transfer(
  owner_id: string,
  receiver_id: string,
  token_id: string,
  approved_account_ids: null|Record<string, number>,
): boolean {}
```

### Extending core functionality

Although not explicitly required by this standard, the existing Metadata ([NEP-177]()) and Enumeration ([NEP-181]()) standards may extend the interface by the usual functions, for example: `nft_metadata, nft_total_supply, nft_supply_for_owner`. It would make sense to conform as close as possible to the field names and functions as described in these standards so as to offer supporting software which already interacts with NFTs the best chances at backwards compatibility with NTNFTs.

However, [NEP-178](), which pertains to approval management is not applicable for this standard.

### Events

When reporting events in order to conform to the event standard [NEP-297](../../neps/nep-0297.md) this standard would be similar to the events specification for NEP-171, however there would be no need for an `nft_transfer` event.

More explicitly then, Non Transferable Non-Fungible Token Events MUST have `standard` set to `"nep999"`, standard version set to `"1.0.0"`, `event` value is one of `nft_mint` or `nft_burn` and `data` must be of one of the following relavant types: `NftMintLog[] | NftBurnLog[]`:

```ts
interface NftEventLogData {
    standard: "nep999",
    version: "1.0.0",
    event: "nft_mint" | "nft_burn"
    data: NftMintLog[] | NftBurnLog[],
}
```

```ts
// An event log to capture token minting
// Arguments
// * `owner_id`: "account.near"
// * `token_ids`: ["1", "abc"]
// * `memo`: optional message
interface NftMintLog {
    owner_id: string,
    token_ids: string[],
    memo?: string
}

// An event log to capture token burning
// Arguments
// * `owner_id`: owner of tokens to burn
// * `authorized_id`: approved account_id to burn, if applicable
// * `token_ids`: ["1","2"]
// * `memo`: optional message
interface NftBurnLog {
    owner_id: string,
    authorized_id?: string,
    token_ids: string[],
    memo?: string
}
```

## Reference Implementation

[Minimum Viable Interface](https://github.com/kycdao/near-sdk-rs/blob/ntnft/near-contract-standards/src/ntnft/core/mod.rs)

[NFT Implementation](https://github.com/kycdao/near-sdk-rs/blob/ntnft/near-contract-standards/src/ntnft/core/core_impl.rs)

## Unresolved Issues

### The ability to transfer NTNFTs due to lost/stolen or new account

Worth considering is the case of what should happen to these NTNFTs if the user loses access to their account, it is somehow compromised or they simply wish to use a new account. As there are a number of ways this can be handled, this standard does not explicitly mandate that any particular function MUST be implemented to handle this.

However, the following method MAY be considered:
- The service which created the smart contract would make efforts (off-chain) to identify the user. Once they're satisfied, at the user's request, they would then revoke the NTNFT in the user's old account and mint a new token (presumably with the same metadata) to the new account. This would require adding: `function burn_token(token_id: string): null {}`, which would be callable only by the contract creator.
- [TODO]() - Are there other common ways to handle this?

### Preventing transfer of account via trading wallet keys

There will always exist the possibility that a user can simply transfer all the assets in their account, including any NTNFTs, to another user by simply giving them the private keys to the account.

Ultimately, there is no way to prevent this. However, given common methods such as the one listed above for a user to do some sort of authenticated account recovery process, it would mean that any 'buyer' would run the risk the 'seller' simply recovers all their tokens using this process making such a trade less likely.

## Future possibilities

There are a few natural extensions to this standard which might be considered in NEPs for the future.

The first is setting a standard for an 'authenticated account recovery' process. If such a process, like that described above, were standardised it would give users confidence that their NTNFTs would not be lost if they need to migrate to a new account. It would also enable frontend software to assist users in the account recovery process when they know the contract supports it.

Other future NEPs might focus on more specific metadata which the NTNFT would provide, for specific use-cases. An example could be for when the NTNFT is used for KYC purposes that the metadata should specifically include fields such as `expiry date`, `validity` and `KYC_level`.

## Copyright
[copyright]: #copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).