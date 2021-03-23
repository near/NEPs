# Non-Fungible Token Approval Management ([NEP-178](https://github.com/near/NEPs/discussions/178))

Version `1.0.0`

## Summary

A system for allowing a set of users or contracts to transfer specific Non-Fungible Tokens on behalf of an owner. Similar to approval management systems in standards like [ERC-721].

  [ERC-721]: https://eips.ethereum.org/EIPS/eip-721

## Motivation

People familiar with [ERC-721] may expect to need an approval management system for basic transfers, where a simple transfer from Alice to Bob requires that Alice first _approve_ Bob to spend one of her tokens, after which Bob can call `transfer_from` to actually transfer the token to himself.

NEAR's [core Non-Fungible Token standard](Core.md) includes good support for safe atomic transfers without such complexity by using an `enforce_owner_id` argument. In addition, the core standard even provides "transfer and call" functionality (`nft_transfer_call`) which allows a specific token to be "attached" to a call to a separate contract. For many Non-Fungible Token workflows, these options may circumvent the need for a full-blown Approval Managament system.

However, some Non-Fungible Token developers, marketplaces, dApps, or artists may require greater control. This standard provides a uniform interface allowing token owners to approve other NEAR accounts, whether individuals or contracts, to transfer specific tokens on the owner's behalf.

Prior art:

- Ethereum's [ERC-721]
- [NEP-4](https://github.com/near/NEPs/pull/4), NEAR's old NFT standard that does not include approvals per token ID

## Interface

The `Token` structure returned by `nft_token` must include an `approved_account_ids` field:

```diff
 type Token = {
   owner_id: string;
+  approved_account_ids: string[],
 }
```

The contract must implement the following methods:

```ts
// Add an approved account for a specific token.
//
// Requirements
// * Caller of the method must attach a deposit of at least 1 yoctoⓃ for
//   security purposes
// * Contract MAY require caller to attach larger deposit, to cover cost of
//   storing approver data
// * Contract MUST panic if called by someone other than token owner
// * Contract MUST panic if addition would cause `nft_revoke_all` to exceed
//   single-block gas limit
// * If successful, contract MUST call `nft_on_approve` on `account_id`
//
// Arguments:
// * `token_id`: the token for which to add an approval
// * `account_id`: the account to add to `approved_account_ids`
// * `msg`: 
//
// Returns `true` if successfully approved, otherwise `false`
function nft_approve(
  token_id: TokenId,
  account_id: string, // account approved to transfer this token
): boolean {}

// Revoke an approved account for a specific token.
//
// Requirements
// * Caller of the method must attach a deposit of 1 yoctoⓃ for security
//   purposes
// * If contract requires >1yN deposit on `nft_approve`, contract
//   MUST refund associated storage deposit when owner revokes approval
// * Contract MUST panic if called by someone other than token owner
//
// Arguments:
// * `token_id`: the token for which to revoke an approval
// * `account_id`: the account to remove from `approved_account_ids`
//
// Returns `true` if successfully revoked, otherwise `false`
function nft_revoke(
  token_id: string,
  account_id: string
): boolean {}

// Revoke all approved accounts for a specific token.
//
// Requirements
// * Caller of the method must attach a deposit of 1 yoctoⓃ for security
//   purposes
// * If contract requires >1yN deposit on `nft_approve`, contract
//   MUST refund all associated storage deposit when owner revokes approvals
// * Contract MUST panic if called by someone other than token owner
//
// Arguments:
// * `token_id`: the token with approvals to revoke
//
// Returns `true` if successfully revoked, otherwise `false`
function nft_revoke_all(token_id: string): boolean {}
```

### Notes

* `nft_on_approve` is a fire-and-forget operation. `nft_approve` returns a boolean immediately, ignoring the result of this call.
* There is no parallel `nft_on_revoke` when revoking either a single approval or when revoking all. This is partially because scheduling many `nft_on_revoke` calls when revoking all approvals could incur prohibitive [gas fees](https://docs.near.org/docs/concepts/gas). Apps caching approved account statuses can therefore not rely on having up-to-date information, and should periodically refresh their caches. Since this will be the necessary reality for `nft_revoke_all`, there is no reason to complicate `nft_revoke` with an `nft_on_revoke` call.

### No incurred cost for core NFT behavior

Contracts should be implemented in a way to avoid extra gas fees for serialization & deserialization of approved accounts for calls to `nft_*` methods other than `nft_token`. See `near-contract-standards` [implementation using `LazyOption`](https://github.com/near/near-sdk-rs/blob/c2771af7fdfe01a4e8414046752ee16fb0d29d39/examples/fungible-token/ft/src/lib.rs#L71) as a reference example.
