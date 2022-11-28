# NEP: Soulbound Token

---

NEP: 393
Title: Soulbound Token
Authors: Robert Zaremba <@robert-zaremba>, Noak Lindqvist <@KazanderDad>
DiscussionsTo:
Status: Draft
Type: Standards Track
Category: Contract
Created: 12-Sep-2022
Requires: --

---

## Summary

Soulbound Tokens (SBT) are non transferrable NFTs. Even though tranferability is not available, we define a recoverability mechanism.

SBTs are well suited of carrying proof-of-attendence NFTs, proof-of-unique-human "stamps" and other similar credibility-carriers.

## Motivation

Many operations are currently impossible or very hard to achieve on-chain without a way to query for proof-of-human (or even proof-of-unique-human). Examples include one-person-one-vote, fair airdrops & ICOs, universal basic income and other any other scenarios prone to sybil attacks.

Soulbound tokens need to be recoverable in case a user's private key is compromised (due to extortion, loss, etc). This becomes especially important for proof-of-human stamps and other NFTs that can only be issued once per user.

Two safeguards against misuse of recovery are contemplated. 1) Users cannot reover an SBT by themselves. The issuer, a DAO or a smart contract dedicated to manage the recovery should be assigned. 2) Whenever a recovery is triggered then the wallet from which the NFT was recovered gets blacklisted (burned). Recovering one NFT triggers a blacklist that applies across all NFTs that share the same address.

Soulbound tokens should also have an option to be renewable. Examples include mandatory renewal with some frequency to check that the owner is still alive, or renew membership to a DAO that uses SBTs as membership gating.

## Specification

### Smart contract interface

The Soulbound Token interface is a subset of NFT, hence the interface follows the [NEP-171](https://github.com/near/NEPs/blob/master/neps/nep-0171.md).

```rust
/// TokenMetadata defines attributes for each SBT token.
pub struct TokenMetadata {
    pub title: Option<String>, // ex. "fist bump with Robert"
    pub description: Option<String>, // free-form description
    pub media: Option<String>, // URL to associated media, preferably to decentralized, content-addressed storage
    pub media_hash: Option<Base64VecU8>, // Base64-encoded sha256 hash of content referenced by the `media` field. Required if `media` is included.
    pub copies: Option<u64>, // number of copies of this set of metadata in existence when token was minted.
    pub issued_at: Option<u64>, // When token was issued or minted, Unix epoch in milliseconds
    pub expires_at: Option<u64>, // When token expires, Unix epoch in milliseconds
    pub starts_at: Option<u64>, // When token starts being valid, Unix epoch in milliseconds
    pub updated_at: Option<u64>, // When token was last updated, Unix epoch in milliseconds
    pub extra: Option<String>, // anything extra the SBT wants to store on-chain. Can be stringified JSON.
    pub reference: Option<String>, // URL to an off-chain JSON file with more info.
    pub reference_hash: Option<Base64VecU8>, // Base64-encoded sha256 hash of JSON from reference field. Required if `reference` is included.
}


trait SBT {
    // ************
    //   QUERIES


    // get the information about specific token ID
    fn sbt(&self, token_id: TokenId) -> Option<Token>;

    // returns total amount of tokens minted by this contract
    fn sbt_total_supply(&self) -> U64;

    // returns total supply of SBTs for a given owner
    fn sbt_supply_for_owner(&self, account: AccountId);

    // Query for sbt tokens
    fn sbt_tokens(&self, from_index: Option<U64>, limit: Option<u32>) -> Vec<Token>;

    // Query sbt tokens by owner
    fn sbt_tokens_for_owner(
        &self,
        account: AccountId,
        from_index: Option<U64>,
        limit: Option<u32>,
    ) -> Vec<Token>;


    /**********
    * Transactions
    **********/

    /// creates a new, unique token and assigns it to the `receiver`.
    #[payable]
    fn sbt_mint(&mut self, metadata: TokenMetadata, receiver: AccountId);

    /// sbt_recover reassigns all tokens from the old owner to a new owner,
    /// and registers `old_owner` to a burned addresses registry.
    /// Must be called by operator.
    /// Must provide 5 miliNEAR to cover registry storage cost. Operator should
    ///   put that cost to the requester (old_owner), eg by asking operation fee.
    #[payable]
    fn sbt_recover(&mut self, from: AccountId, to: AccountId);

    /// sbt_renew will update the expire time of provided tokens.
    /// `expires_at` is a unix timestamp (in seconds).
    #[payable]
    pub fn sbt_renew(&mut self, tokens: Vec<TokenId>, expires_at: u64, memo: Option<String>);



}
```

### Logs

```typescript
interface SbtEventLogData {
  standard: "nepXXX";
  version: "1.0.0";
  event: "sbt_mint" | "sbt_recover" | "sbt_renew";
  data: SbtMintLog[] | SbtRecoverLog[] | SbtRenew[];
}

// An event emitted when a new SBT is minted.
// Arguments
// * `owner`: "account.near"
// * `tokens`: ["1", "abc"]
// * `memo`: optional message
interface SbtMintLog {
  owner: string;
  tokens: string[];
  memo?: string;
}

// An event emitted when a recovery process succeeded to reassign SBT.
// Arguments
// * `old_owner`: "old_account.near"
// * `new_owner`: "new_account.near"
// * `token_ids`: ["1", "abc"]
// * `memo`: optional message
interface SbtRecoverLog {
  old_owner: string;
  new_owner: string;
  tokens: string[];
  memo?: string;
}

// An event emitted when a existing tokens are renewed.
// Arguments
// * `tokens`: ["1", "abc"]
// * `memo`: optional message
interface SbtRenewLog {
  tokens: uint64[];
  memo?: string;
}
```

Whenever a recovery is made, a SBT must call `SbtBurnedAccounts.burn(account_id)`.

```typescript
class SbtBurnedAccounts {
  burn(account_id) {
    this.burned_accounts[this.account_id][this.predecessor_id] = true;
  }

  // query
  is_burned(account_id, sbt_token_contract): bool {
    return this.burned_accounts[account_id][sbt_token_id];
  }
}
```

### Recommended functions

Although the funcitons below are not part of the standard (depending on a use case, they may need different parameters), we recommend them as a part of every implementation and we also provide them in the reference implementation.

```typescript=

interface SBT {


    // Function for recovery committee, which can be either
    // the issuer, DAO, or an operator smart contract, authorized for the
    // recovery process.
    // Emits `SbtRecoverLog` when the recover process succeeds.
    // Returns an error if the recovery process failed.
    recover(token_id: uint64, old_address: string, new_address: string): error | undefined;



}

```

## Reference Implementation

- https://github.com/alpha-fi/i-am-human/tree/master/contracts/soulbound

## Example Flow

## Future possibilities

## Copyright

[copyright]: #copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
