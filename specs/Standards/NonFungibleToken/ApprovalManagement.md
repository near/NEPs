# Non-Fungible Token Approval Management ([NEP-???](???))

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

The `Token` structure returned by various methods must include an `approved_account_ids` field:

```diff
 type Token = {
   owner_id: string;
+  approved_account_ids: string[],
 }
```

The contract must implement the following methods:

```ts
// contract MUST call `nft_on_approve` on `account_id` contract
function nft_approve_account_id(
  token_id: TokenId,
  account_id: string, // account approved to transfer this token
): Promise<boolean> {}

function nft_revoke_account_id(
  token_id: TokenId,
  account_id: ValidAccountId
): boolean {}

function nft_revoke_all(token_id: TokenId): boolean {}
```
