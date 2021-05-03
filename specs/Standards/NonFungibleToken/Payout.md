# Standard for a Multiple-Recipient-Payout mechanic on NFT Contracts (NEP-X)
Version `1.0.0`.

This standard assumes the NFT contract has implemented
[NEP-171](https://github.com/near/NEPs/blob/master/specs/Standards/NonFungibleToken/Core.md)
(Core) and
[NEP-178](https://github.com/near/NEPs/blob/master/specs/Standards/NonFungibleToken/ApprovalManagement.md)
(Approval Management).

## Summary
An interface allowing non-fungible token contracts to request that
financial contracts pay-out multiple receivers, enabling flexible royalty
implementations.

## Motivation
Currently, NFTs on Near support the field `owner_id`, but lack flexibility
for ownership and payout mechanics with more complexity, including but not
limited to royalties. Financial contracts, such as Marketplaces,
Auction-houses, and NFT Loan contracts, would benefit from a standard
interface on NFT producer contracts for querying whom to pay out, and how
much to pay.

Therefore, the core goal of this standard is to define a set of methods for
financial contracts to call, without specifying how NFT contracts define
the divide of payout mechanics, and a standard `Payout` response structure.

## Proposal
The proposed implementation requires two methods on NFT contracts:
- a view method: `nft_payout`, accepting a `token_id` and some `balance`,
  returning the `Payout` mapping for the given token.
- a call method: `nft_transfer_payout`, accepting all the arguments of
  `nft_transfer`, plus a field for some `Balance` that calculates the
  `Payout`, calls `nft_transfer`, and returns the `Payout` mapping.

Financial contracts MUST validate several invariants on the returned
`Payout`:
1. The returned `Payout` MUST be no longer than maximum length. Payouts of
   excessive length can become prohibitively gas-expensive.
2. The balances MUST add up to less than or equal to the `balance` argument
   in `nft_transfer_payout`. If the balance adds up to less then the
   `balance` argument, the financial contract MAY claim the remainder for
   itself.

Financial contracts MAY specify their own maximum length payout to respect.
At minimum, financial contracts MUST NOT set their maximum length lower
than 10.

Note that if either of the above two invariants are violated (as a result
of the error by the NFT holder), the financial contract has either too
little gas or Near to complete the transaction. In this pathological
situation, because of user error, the token has been transferred, but the
financial contract cannot payout the token's payee's. Front-ends should
attempt to minimize the possibility for this type of user error.

The financial contract is NOT responsible for user error, and MAY choose to
not pay out any address in the returned `Payout`. The financial contract
MAY keep the wasted payout funds. It is recommended that the financial
contract ban the violating NFT contract from further interaction with the
financial contract.

If the NFT contract returns addresses that do not yet exist, the
financial contract MAY keep the wasted payout funds.

Users of NFT contracts should therefore use discretion when listing to
financial contracts: first, the `Payout` interface is an optional interface
for financial contracts to respect. Second, financial contracts may differ
in the maximum length of addresses they are willing to pay out on sale.

Finally, financial contracts MAY take a cut of the NFT sale price as
commission, subtracting their cut from the total token sale price, and
calling `nft_transfer_payout` with the remainder.

## Example Flow
```
 ┌───────────────────────────────────────────────┐
 │Token Owner approves marketplace for token_id 0│
 ├───────────────────────────────────────────────┘
 │  nft_approve(0,market.near,<SaleArgs>)
 ▼
 ┌───────────────────────────────────────────────┐
 │Marketplace sells token to user.near for 10N   │
 ├───────────────────────────────────────────────┘
 │  nft_transfer_payout(user.near,0,0,10_000_000...)
 ▼
 ┌───────────────────────────────────────────────┐
 │NFT contract returns Payout data               │
 ├───────────────────────────────────────────────┘
 │         Payout(<who_gets_paid_and_how_much)
 ▼
 ┌───────────────────────────────────────────────┐
 │Market validates and pays out addresses        │
 └───────────────────────────────────────────────┘
```

## Reference-level explanation
```rust
/// A mapping of Near accounts to the amount each should be paid out, in
/// the event of a token-sale. The payout mapping MUST be shorter than the
/// maximum length specified by the financial contract obtaining this
/// payout data. Any mapping of length 10 or less MUST be accepted by
/// financial contracts, so 10 is a safe upper limit.
#[derive(Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct Payout {
  pub payout: HashMap<AccountId, U128>,
}

pub trait Payouts{
  /// Given a `token_id` and NEAR-denominated balance, return the `Payout`
  /// struct for the given token.
  fn nft_payout(&self, token_id: U64, balance: U128) -> Payout;
  /// Given a `token_id` and NEAR-denominated balance, transfer the token
  /// and return the `Payout` struct for the given token.
  fn nft_transfer_payout(
    &mut self,
    receiver_id: AccountId,
    token_id: String,
    approval_id: U64,
    balance: U128,
  ) -> Payout{
    let payout = self.nft_payout(token_id.clone(), balance);
    self.nft_transfer(receiver_id, token_id, approval_id);
    payout
  }
}
```
