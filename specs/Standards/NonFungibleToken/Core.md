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
// The base structure that will be returned for a token. If contract is using
// extensions such as Approval Management, Metadata, or Royalties, other
// attributes may be included in this structure.
type Token = {
  owner_id: string;
}

/******************/
/* CHANGE METHODS */
/******************/

// Simple transfer. Transfer a given `token_id` from current owner to
// `receiver_id`.
//
// Requirements
// * Caller of the method must attach a deposit of 1 yoctoⓃ for security purposes
// * Contract MUST panic if called by someone other than token owner or,
//   if using Approval Management, one of the approved accounts
// * If given `enforce_owner_id`, MUST panic if current owner does not match
//   the provided `enforce_owner_id` value. This prevents an accidental
//   transfer race condition, in which:
//   1. a token is listed in two marketplaces, which are both saved to the
//      token as approved accounts
//   2. one marketplace sells the token, which clears the approved accounts
//   3. the new owner lists the token in the second marketplace
//   4. the second marketplace, operating from cached information, attempts to
//      transfer the token, thinking it still belongs to the original owner
// * If using Approval Management, contract MUST nullify approved accounts on
//   successful transfer.
//
// Arguments:
// * `receiver_id`: the valid NEAR account receiving the token
// * `token_id`: the token to transfer
// * `enforce_owner_id`: a valid NEAR account
// * `memo` (optional): for use cases that may benefit from indexing or
//    providing information for a transfer
function nft_transfer(
  receiver_id: string,
  token_id: string,
  enforce_owner_id: string|null,
  memo: string|null,
) {}

// Returns `true` if the token was transferred from the sender's account.

// Transfer token and call a method on a receiver contract. A successful
// workflow will end in a success execution outcome to the callback on the NFT
// contract at the method `nft_resolve_transfer`.
//
// You can think of this as being similar to attaching native NEAR tokens to a
// function call. It allows you to attach any Non-Fungible Token in a call to a
// receiver contract.
//
// Requirements:
// * Caller of the method must attach a deposit of 1 yoctoⓃ for security
//   purposes
// * Contract MUST panic if called by someone other than token owner or,
//   if using Approval Management, one of the approved accounts
// * The receiving contract must implement `ft_on_transfer` according to the
//   standard. If it does not, FT contract's `ft_resolve_transfer` MUST deal
//   with the resulting failed cross-contract call and roll back the transfer.
// * Contract MUST implement the behavior described in `ft_resolve_transfer`
// * If given `enforce_owner_id`, MUST panic if current owner does not match
//   the provided `enforce_owner_id` value. See motivation in `nft_transfer`
//   description.
// * If using Approval Management, contract MUST nullify approved accounts on
//   successful transfer.
//
// Arguments:
// * `receiver_id`: the valid NEAR account receiving the token.
// * `token_id`: the token to send.
// * `enforce_owner_id`: a valid NEAR account
// * `memo` (optional): for use cases that may benefit from indexing or
//    providing information for a transfer.
// * `msg`: specifies information needed by the receiving contract in
//    order to properly handle the transfer. Can indicate both a function to
//    call and the parameters to pass to that function.
function nft_transfer_call(
  receiver_id: string,
  token_id: string,
  enforce_owner_id: string|null,
  memo: string|null,
  msg: string,
): Promise<boolean> {}


/****************/
/* VIEW METHODS */
/****************/

// Returns the total supply of non-fungible tokens as a string representing the
// value as an unsigned 128-bit integer to avoid JSON number limit of 2^53.
function nft_total_supply(): string {}

// Returns the token with the given `token_id` or `null` if no such token.
function nft_token(token_id: string): Token|null {}
```

The following behavior is required, but contract authors may name this function something other than the conventional `nft_resolve_transfer` used here.

```ts
// Finalize an `nft_transfer_call` chain of cross-contract calls.
//
// The `nft_transfer_call` process:
//
// 1. Sender calls `nft_transfer_call` on FT contract
// 2. NFT contract transfers token from sender to receiver
// 3. NFT contract calls `nft_on_transfer` on receiver contract
// 4+. [receiver contract may make other cross-contract calls]
// N. NFT contract resolves promise chain with `nft_resolve_transfer`, and may
//    transfer token back to sender
//
// Requirements:
// * Contract MUST forbid calls to this function by any account except self
// * If promise chain failed, contract MUST revert token transfer
// * If promise chain resolves with `true`, contract MUST return token to
//   `sender_id`
//
// Arguments:
// * `sender_id`: the sender of `ft_transfer_call`
// * `receiver_id`: the `receiver_id` argument given to `ft_transfer_call`
// * `token_id`: the `token_id` argument given to `ft_transfer_call`
// * `approved_token_ids`: if using Approval Management, contract MUST provide
//   set of original approved accounts in this argument, and restore these
//   approved accounts in case of revert.
//
// Returns true if token was successfully transferred to `receiver_id`.
function nft_resolve_transfer(
  owner_id: string,
  receiver_id: string,
  token_id: string,
  approved_account_ids: null|string[],
): boolean {}
```
