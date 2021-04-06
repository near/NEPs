# Standard for a Multiple-Recipient-Payout mechanic on NFT Contracts

A standard for supporting structures that allow for NFT's to inform financial
contracts to payout multiple addresses on sales.

Currently, NFT's on Near support the field `owner_id`, but lack flexibility for
ownership and payout mechanics with more complexity, including but not limited
to royalties. Financial contracts, such as Marketplaces, Auction-houses, and
NFT Loan contracts, would benefit from a standard interface on NFT producer
contracts for querying whom to pay out, and how much to pay.

Therefore, the core goal of this standard is to define a set of methods for
financial standard set of methods to call, without specifying how NFT contracts
define the divide of payout mechanics.

The `Payout` interface is should be a simple collection of unique addresses that
map to either a proportional ownership of a Token, or even simpler, a mapping of
unique addresses to the Balances each is to receive, given an initial balance:
```rust
    // return fractional ownership
    pub struct OwnershipFractions {
      pub fractions: HashMap<AccountId, MultipliedSafeFraction>
    }
    // or else, return how much to pay each address
    pub struct Payout {
      pub payout: HashMap<AccountId, U128>,
    }
```
The advantage of the latter interface eliminates the need for a universally
respected fraction type, instead simply returning the amount to pay out to each
address.


## Methods

To support the payout interface, several methods should be supported on NFT
contracts:

-   A view method to query whom would be paid out for a given token, derived from
    some balance
-   A call method to transfer attempt to transfer the token, which returns the payout
    data

The latter of these two methods should be functionally equivalent to the
composition of `nft_transfer` in the Core standard, while returning the result
of the first method.
```rust
    pub trait Payouts{
      fn nft_payout(&self, token_id: String, balance: U128) -> Payout;
      fn nft_transfer_payout(
        &mut self,
        receiver_id: AccountId,
        token_id: String,
        approval_id: U64,
        balance: U128,
      ) -> Payout;
    }
```
