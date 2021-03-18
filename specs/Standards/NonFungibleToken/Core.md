# Non-Fungible Token ([NEP-171](https://github.com/near/NEPs/discussions/171))

Version `1.0.0`

## Summary

TODO

## Motivation

TODO

Prior art:

- [Mintbase's ERC-721 Reference](https://github.com/Mintbase/near-nft-standards/blob/main/ERC721_reference.md#rust-equivalent) including a Rust interface
- [OpenZeppelin implementation of ERC-721](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC721/ERC721.sol)
- [EIP/ERC-721](https://eips.ethereum.org/EIPS/eip-721) from Ethereum.org
- [EIP-1155 for multi-tokens](https://eips.ethereum.org/EIPS/eip-1155#non-fungible-tokens) which is a considering particularly for universal identifiers.
- A [simple NFT implementation](https://github.com/near/core-contracts/blob/7eb1b0d06f79893cb13b82178a37af2a49c46b9f/nft-simple/src/lib.rs) (not created after recent discussions)
- [Fungible Token library implementation of the Storage Management standard](https://github.com/near/near-sdk-rs/blob/master/near-contract-standards/src/fungible_token/core_impl.rs#L58-L72)
- [NEP-4](https://github.com/near/NEPs/pull/4), the old NFT standard that does not include approvals per token ID

## Reference-level explanation

**NOTES**:
- All amounts, balances and allowance are limited by `U128` (max value `2**128 - 1`).
- Token standard uses JSON for serialization of arguments and results.
- Amounts in arguments and results have are serialized as Base-10 strings, e.g. `"100"`. This is done to avoid JSON limitation of max integer value of `2**53`.
- The contract must track the change in storage when adding to and removing from collections. This is not included in this core fungible token standard but instead in the [Storage Standard](../Storage.md).
- To prevent the deployed contract from being modified or deleted, it should not have any access keys on its account.

**Interface**:

```ts
// The structure that will be returned for a token
type Token = {
  owner_id: string;
}

/******************/
/* CHANGE METHODS */
/******************/

// Simple transfer. Transfer a given `token_id` from current owner to
// `receiver_id`.
//
// * if given `enforce_owner_id`, MUST panic if called by an account other
//   than provided `enforce_owner_id` value.
// * if not given `enforce_owner_id`, MUST panic if called by someone other
//   than token owner or approved accounts (if using Approval Management)
function nft_transfer(
  receiver_id: string,
  token_id: string,
  enforce_owner_id: string|null,
  memo: string|null,
) {}

// Returns `true` if the token was transferred from the sender's account.
function nft_transfer_call(
  receiver_id: string,
  token_id: string,
  enforce_owner_id: string|null,
  memo: string|null,
  msg: string,
): Promise<boolean> {}

function nft_resolve_transfer(
  owner_id: AccountId,
  receiver_id: AccountId,
  approved_account_ids: HashSet<AccountId>,
  token_id: TokenId,
): boolean {}

/****************/
/* VIEW METHODS */
/****************/

// Returns a string representation of an unsigned 64-bit integer to avoid JSON
// number limit of 2^53
function nft_total_supply() -> string;

function nft_token(token_id: string) -> Token|null;
```
