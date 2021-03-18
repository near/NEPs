# Non-Fungible Token Approval Management ([NEP-???](???))

Version `1.0.0`

This standard is useful for developers who prefer to use the approval system common in standards like [ERC-721](https://docs.ethhub.io/built-on-ethereum/erc-token-standards/erc721/). Both fungible tokens and non-fungible tokens include a "transfer and call" functionality which improves ergonomics such that an approval system is not necessary. etc, etc

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
