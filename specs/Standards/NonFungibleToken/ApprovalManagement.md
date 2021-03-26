# Non-Fungible Token Approval Management ([NEP-178](https://github.com/near/NEPs/discussions/178))

Version `1.0.0`

## Summary

A system for allowing a set of users or contracts to transfer specific Non-Fungible Tokens on behalf of an owner. Similar to approval management systems in standards like [ERC-721].

  [ERC-721]: https://eips.ethereum.org/EIPS/eip-721

## Motivation

People familiar with [ERC-721] may expect to need an approval management system for basic transfers, where a simple transfer from Alice to Bob requires that Alice first _approve_ Bob to spend one of her tokens, after which Bob can call `transfer_from` to actually transfer the token to himself.

NEAR's [core Non-Fungible Token standard](Core.md) includes good support for safe atomic transfers without such complexity. It even provides "transfer and call" functionality (`nft_transfer_call`) which allows a specific token to be "attached" to a call to a separate contract. For many Non-Fungible Token workflows, these options may circumvent the need for a full-blown Approval Managament system.

However, some Non-Fungible Token developers, marketplaces, dApps, or artists may require greater control. This standard provides a uniform interface allowing token owners to approve other NEAR accounts, whether individuals or contracts, to transfer specific tokens on the owner's behalf.

Prior art:

- Ethereum's [ERC-721]
- [NEP-4](https://github.com/near/NEPs/pull/4), NEAR's old NFT standard that does not include approvals per token ID

## Reference-level explanation

The `Token` structure returned by `nft_token` must include an `approvals` field, which is a map of account IDs to approval IDs. Using TypeScript's [Record type](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeystype) notation:

```diff
 type Token = {
   id: string,
   owner_id: string,
+  approvals: Record<string, number>,
 };
```

Example token data:

```json
{
  "id": "1",
  "owner_id": "alice.near",
  "approvals": {
    "bob.near": 1,
    "carol.near": 2,
  }
}
```

### What is an "approval ID"?

This is a unique number given to each approval that allows well-intentioned marketplaces or other 3rd-party NFT resellers to avoid a race condition. The race condition occurs when:

1. A token is listed in two marketplaces, which are both saved to the token as approved accounts.
2. One marketplace sells the token, which clears the approved accounts.
3. The new owner sells back to the original owner.
4. The original owner approves the token for the second marketplace again to list at a new price. But for some reason the second marketplace still lists the token at the previous price and is unaware of the transfers happening.
5. The second marketplace, operating from old information, attempts to again sell the token at the old price.

Note that while this describes an honest mistake, the possibility of such a bug can also be taken advantage of by malicious parties via [front-running](https://defi.cx/front-running-ethereum/).

To avoid this possibility, the NFT contract generates a unique approval ID each time it approves an account. Then when calling `nft_transfer` or `nft_transfer_call`, the approved account passes `approval_id` with this value to make sure the underlying state of the token hasn't changed from what the approved account expects.

Keeping with the example above, say the initial approval of the second marketplace generated the following `approvals` data:

```json
{
  "id": "1",
  "owner_id": "alice.near",
  "approvals": {
    "marketplace_1.near": 1,
    "marketplace_2.near": 2,
  }
}
```

But after the transfers and re-approval described above, the token might have `approvals` as:

```json
{
  "id": "1",
  "owner_id": "alice.near",
  "approvals": {
    "marketplace_2.near": 3,
  }
}
```

The marketplace then tries to call `nft_transfer`, passing outdated information:

```bash
# oops!
near call nft-contract.near nft_transfer '{ "approval_id": 2 }'
```


### Interface

The NFT contract must implement the following methods:

```ts
/******************/
/* CHANGE METHODS */
/******************/

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
// * Contract MUST increment approval ID even if re-approving an account
// * If successfully approved or if had already been approved, and if `msg` is
//   present, contract MUST call `nft_on_approve` on `account_id`. See
//   `nft_on_approve` description below for details.
//
// Arguments:
// * `token_id`: the token for which to add an approval
// * `account_id`: the account to add to `approvals`
// * `msg`: optional string to be passed to `nft_on_approve`
//
// Returns void, if no `msg` given. Otherwise, returns promise call to
// `nft_on_approve`, which can resolve with whatever it wants.
function nft_approve(
  token_id: TokenId,
  account_id: string,
  msg: string|null,
): void|Promise<any> {}

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
// * `account_id`: the account to remove from `approvals`
function nft_revoke(
  token_id: string,
  account_id: string
) {}

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
function nft_revoke_all(token_id: string) {}

/****************/
/* VIEW METHODS */
/****************/

// Check if a token is approved for transfer by a given account, optionally
// checking an approval_id
//
// Arguments:
// * `token_id`: the token for which to revoke an approval
// * `approved_account_id`: the account to check the existence of in `approvals`
// * `approval_id`: an optional approval ID to check against current approval ID for given account
//
// Returns:
// if `approval_id` given, `true` if `approved_account_id` is approved with given `approval_id`
// otherwise, `true` if `approved_account_id` is in list of approved accounts
function nft_is_approved(
  token_id: string,
  approved_account_id: string,
  approval_id: number|null
): boolean {}
```

### Approved Account Contract Interface

If a contract that gets approved to transfer NFTs wants to, it can implement `nft_on_approve` to update its own state when granted approval for a token:

```ts
// Respond to notification that contract has been granted approval for a token.
//
// Notes
// * Contract knows the token contract ID from `predecessor_account_id`
//
// Arguments:
// * `token_id`: the token to which this contract has been granted approval
// * `owner_id`: the owner of the token
// * `approval_id`: the approval ID stored by NFT contract for this approval.
//   Expected to be a number within the 2^53 limit representable by JSON.
// * `msg`: specifies information needed by the approved contract in order to
//    optimally handle the approval. Can indicate both a function to call and
//    the parameters to pass to that function.
function nft_on_approve(
  token_id: TokenId,
  owner_id: string,
  approval_id: number,
  msg: string|null,
) {}
```

Note that the NFT contract will fire-and-forget this call, ignoring any return values or errors generated. This means that even if the approved account does not have a contract or does not implement `nft_on_approve`, the approval will still work correctly from the point of view of the NFT contract.

Further note that there is no parallel `nft_on_revoke` when revoking either a single approval or when revoking all. This is partially because scheduling many `nft_on_revoke` calls when revoking all approvals could incur prohibitive [gas fees](https://docs.near.org/docs/concepts/gas). Apps and contracts which cache NFT approvals can therefore not rely on having up-to-date information, and should periodically refresh their caches. Since this will be the necessary reality for dealing with `nft_revoke_all`, there is no reason to complicate `nft_revoke` with an `nft_on_revoke` call.

### No incurred cost for core NFT behavior

NFT contracts should be implemented in a way to avoid extra gas fees for serialization & deserialization of `approvals` for calls to `nft_*` methods other than `nft_token`. See `near-contract-standards` [implementation of `ft_metadata` using `LazyOption`](https://github.com/near/near-sdk-rs/blob/c2771af7fdfe01a4e8414046752ee16fb0d29d39/examples/fungible-token/ft/src/lib.rs#L71) as a reference example.
