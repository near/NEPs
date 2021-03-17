This GitHub discussion is a continuation from several conversations that resulted in a short thread on the NEAR Governance Forum here:
https://gov.near.org/t/nft-standard-discussion/853/13

Handy reference links:
- [Mintbase's ERC-721 Reference](https://github.com/Mintbase/near-nft-standards/blob/main/ERC721_reference.md#rust-equivalent) including a Rust interface
- [OpenZeppelin implementation of ERC-721](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC721/ERC721.sol)
- [EIP/ERC-721](https://eips.ethereum.org/EIPS/eip-721) from Ethereum.org
- [EIP-1155 for multi-tokens](https://eips.ethereum.org/EIPS/eip-1155#non-fungible-tokens) which is a considering particularly for universal identifiers.

Other NEAR-related links:
- A [simple NFT implementation](https://github.com/near/core-contracts/blob/7eb1b0d06f79893cb13b82178a37af2a49c46b9f/nft-simple/src/lib.rs) (not created after recent discussions)
- [Fungible Token library implementation of the Storage Management standard](https://github.com/near/near-sdk-rs/blob/master/near-contract-standards/src/fungible_token/core_impl.rs#L58-L72)
- [NEP-4](https://github.com/near/NEPs/pull/4), the old NFT standard that does not include approvals per token ID

---

As we step through the different facets of an NFT standard and extension standards, let's keep in mind two NFT scenarios:
1. An art NFT that can be sold on multiple markets.
2. An NFT that acts as a deed. (Think a car title, plot of land, etc.)

These may help guide what we determine to be necessary in an **NFT Core** standard or not.

## Core (with Storage Management)

### Data structures / fields

```rust
pub type TokenId = String;

pub struct Token {
    pub owner_id: AccountId,
}

pub struct Core {
  pub tokens: LookupMap<TokenId, Token>,
  owner_id: AccountId,
  token_storage_usage: StorageUsage, // u64, how much it costs to add an entry to the "tokens" map if the owner's account is max length of 64 characters.
}
```

### Methods

The following have the same workflow as the explained in the [Fungible Token Core spec](https://nomicon.io/Standards/Tokens/FungibleTokenCore.html), except with `nft_transfer_call` there is no value returned from the receiver contract. Instead, the contract shall panic if it's unable to transfer an NFT to an individual. An execution that doesn't panic indicates a successful transfer.

```rust
pub fn nft_transfer(
  &mut self,
  receiver_id: AccountId,
  token_id: TokenId,
  enforce_owner_id: Option<ValidAccountId>,
  memo: String
) {}

fn nft_transfer_call(
  &mut self,
  receiver_id: ValidAccountId,
  token_id: TokenId,
  enforce_owner_id: Option<ValidAccountId>,
  memo: Option<String>,
  msg: String,
) -> Promise {}

pub fn on_nft_transfer: (
  &mut self,
  receiver_id: ValidAccountId,
  token_id: TokenId,
  enforce_owner_id: Option<ValidAccountId>,
  memo: Option<String>
) {}
```

## Metadata

```rust
pub struct NFTMetadata {
  spec: String, // required, essentially a version like "nft-1.0.0"
  name: String, // required, ex. "Mochi Rising — Digital Edition" or "ML Course Completion, Spring 2021"
  media: Option<String>, // preferably decentralized URL (can be centralized, though) to associated media
  icon: Option<String>, // Data URL, this could be, for instance, a thumbnail of a piece of art
  reference: Option<String>, // URL to a JSON file with more info
  reference_hash: Option<String> // Base64-encoded sha256 hash of JSON from reference field
}

pub struct Token {
  pub owner_id: AccountId,
  pub meta: NFTMetadata, // NEW FIELD
}
```

Note that when this NFT contract is created and initialized, the associated `token_storage_usage` will be higher than the previous Core example because of the added metadata fields. The fields `name` and `icon` in particular are indeed variable. The frontend can account for this by adding extra deposit when minting. This could be done by padding with a reasonable amount, or by the frontend using the [RPC call detailed here](https://docs.near.org/docs/develop/front-end/rpc#genesis-config) that gets genesis configuration and actually determine precisely how much deposit is needed.

## Approvals

This is a point for continued work, following some healthy debate on the topic. A critical objective is to have a token able to add multiple approvals. In example form, a piece of art is an individual token on an NFT contract and this piece of art can allow Volcano Art and Petroglyph Art shops to list the piece for purchase.

One approach suggested was that the `Token` object has a flag, something like `has_approvals: bool`. Then separately, another mapping exists linking owner » approvers. The combination of these two is used to determine if a market can take a particular token. This leaves some wiggle room for trust.

**Example of this problem**: Clark Little is an ocean photographer that embraces selling his work as NFTs. Alice visits a market website selling his work and finds a print she'd like to buy. She waits for her partner to come home before purchasing, leaving the tab open. Simultaneously, Surfrider, a beach cleanup organization asks if Clark would donate a couple prints for a raffle. Clark agrees, delists two prints from all market websites, and adds the `surfrider` account as an approver. `surfrider` will take care of all the details regarding the raffle, transferring it to the winner, etc. Alice finalizes her decision and clicks the (stale) website UI to purchase a print that was delisted, since the market is among the approvers and the two prints have the flag of `has_approvals` the transfer goes through.

**Conclusion**: in order to avoid introducing trust and inconsistency, approvals need to be tied *per token*. This would look like:

```rust
pub struct Token {
    pub owner_id: AccountId,
    pub metadata: String,
    pub approved_account_ids: HashSet<AccountId>, // if the number of approvers is expected to be large, a NEAR collection instead of HashSet
}
```

## Enumeration

## Universal token identifiers

## Royalties

Given the use case of a property deed NFT where royalties wouldn't apply so much, this makes sense as its own standard. This section needs to be fleshed out more, but below is provided some code from a couple resources to help kickstart the standard discussion.

Taking some ideas from Mintbase and the [Staking Pool contract](https://github.com/near/core-contracts/blob/master/staking-pool) regarding the safe representation of a fraction:

```rust
use uint::construct_uint;
use near_sdk::Balance;

construct_uint! {
    /// 256-bit unsigned integer.
    pub struct U256(4);
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct Fraction {
    pub numerator: u32,
    pub denominator: u32,
}

impl Fraction {
    pub fn assert_valid(&self) {
        assert_ne!(self.denominator, 0, "Denominator must be a positive number");
        assert!(
            self.numerator <= self.denominator,
            "The fraction must be less or equal to 1"
        );
    }

    pub fn multiply(&self, value: Balance) -> Balance {
        (U256::from(self.numerator) * U256::from(value) / U256::from(self.denominator)).as_u128()
    }
}
```

And the the `Fraction` struct can be used as a royalty field on a token, like:

```rust
pub struct Royalty {
  pub split_between: UnorderedMap<AccountId, Fraction>,
  pub percentage: Fraction,
}
```
