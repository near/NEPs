# Royalties and Payouts

## [NEP-199](https://github.com/near/NEPs/blob/master/neps/nep-0199.md)

Version `2.0.0`.

This standard assumes the NFT contract has implemented
[NEP-171](https://github.com/near/NEPs/blob/master/specs/Standards/Tokens/NonFungibleToken/Core.md) (Core) and [NEP-178](https://github.com/near/NEPs/blob/master/specs/Standards/Tokens/NonFungibleToken/ApprovalManagement.md) (Approval Management).

## Summary

An interface allowing non-fungible token contracts to request that financial contracts pay-out multiple receivers, enabling flexible royalty implementations.

## Motivation

Currently, NFTs on NEAR support the field `owner_id`, but lack flexibility for ownership and payout mechanics with more complexity, including but not limited to royalties. Financial contracts, such as marketplaces, auction houses, and NFT loan contracts would benefit from a standard interface on NFT producer contracts for querying whom to pay out, and how much to pay.

Therefore, the core goal of this standard is to define a set of methods for financial contracts to call, without specifying how NFT contracts define the divide of payout mechanics, and a standard `Payout` response structure.


## Specification

This Payout extension standard adds two methods to NFT contracts:
- a view method: `nft_payout`, accepting a `token_id` and some `balance`, returning the `Payout` mapping for the given token.
- a call method: `nft_transfer_payout`, accepting all the arguments of`nft_transfer`, plus a field for some `Balance` that calculates the `Payout`, calls `nft_transfer`, and returns the `Payout` mapping.

Financial contracts MUST validate several invariants on the returned
`Payout`:
1. The returned `Payout` MUST be no longer than the given maximum length (`max_len_payout` parameter) if provided. Payouts of excessive length can become prohibitively gas-expensive. Financial contracts can specify the maximum length of payout the contract is willing to respect with the `max_len_payout` field on `nft_transfer_payout`.
2. The balances MUST add up to less than or equal to the `balance` argument in `nft_transfer_payout`. If the balance adds up to less than the `balance` argument, the financial contract MAY claim the remainder for itself.
3. The sum of the balances MUST NOT overflow. This is technically identical to 2, but financial contracts should be expected to handle this possibility.

Financial contracts MAY specify their own maximum length payout to respect.
At minimum, financial contracts MUST NOT set their maximum length below 10.

If the Payout contains any addresses that do not exist, the financial contract MAY keep those wasted payout funds.

Financial contracts MAY take a cut of the NFT sale price as commission, subtracting their cut from the total token sale price, and calling `nft_transfer_payout` with the remainder.

## Example Flow
```
 ┌─────────────────────────────────────────────────┐
 │Token Owner approves marketplace for token_id "0"│
 ├─────────────────────────────────────────────────┘
 │  nft_approve("0",market.near,<SaleArgs>)
 ▼
 ┌───────────────────────────────────────────────┐
 │Marketplace sells token to user.near for 10N   │
 ├───────────────────────────────────────────────┘
 │  nft_transfer_payout(user.near,"0",0,"10000000",5)
 ▼
 ┌───────────────────────────────────────────────┐
 │NFT contract returns Payout data               │
 ├───────────────────────────────────────────────┘
 │  Payout(<who_gets_paid_and_how_much)
 ▼
 ┌───────────────────────────────────────────────┐
 │Market validates and pays out addresses        │
 └───────────────────────────────────────────────┘
```

## Reference Implementation

```rust
/// A mapping of NEAR accounts to the amount each should be paid out, in
/// the event of a token-sale. The payout mapping MUST be shorter than the
/// maximum length specified by the financial contract obtaining this
/// payout data. Any mapping of length 10 or less MUST be accepted by
/// financial contracts, so 10 is a safe upper limit.
#[derive(Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct Payout {
  pub payout: HashMap<AccountId, U128>,
}

pub trait Payouts {
  /// Given a `token_id` and NEAR-denominated balance, return the `Payout`.
  /// struct for the given token. Panic if the length of the payout exceeds
  /// `max_len_payout.`
  fn nft_payout(&self, token_id: String, balance: U128, max_len_payout: Option<u32>) -> Payout;
  /// Given a `token_id` and NEAR-denominated balance, transfer the token
  /// and return the `Payout` struct for the given token. Panic if the
  /// length of the payout exceeds `max_len_payout.`
  #[payable]
  fn nft_transfer_payout(
    &mut self,
    receiver_id: AccountId,
    token_id: String,
    approval_id: Option<u64>,
    memo: Option<String>,
    balance: U128,
    max_len_payout: Option<u32>,
  ) -> Payout {
    assert_one_yocto();
    let payout = self.nft_payout(token_id, balance);
    self.nft_transfer(receiver_id, token_id, approval_id, memo);
    payout
  }
}
```

## Fallback on error

In the case where either the `max_len_payout` causes a panic, or a malformed `Payout` is returned, the caller contract should transfer all funds to the original token owner selling the token.

## Potential pitfalls

The payout must include all accounts that should receive funds. Thus it is a mistake to assume that the original token owner will receive funds if they are not included in the payout.

NFT and financial contracts vary in implementation. This means that some extra CPU cycles may occur in one NFT contract and not another. Furthermore, a financial contract may accept fungible tokens, native NEAR, or another entity as payment. Transferring native NEAR tokens is less expensive in gas than sending fungible tokens. For these reasons, the maximum length of payouts may vary according to the customization of the smart contracts.

## Drawbacks

There is an introduction of trust that the contract calling `nft_transfer_payout` will indeed pay out to all intended parties. However, since the calling contract will typically be something like a marketplace used by end users, malicious actors might be found out more easily and might have less incentive.  
There is an assumption that NFT contracts will understand the limits of gas and not allow for a number of payouts that cannot be achieved.

## Future possibilities

In the future, the NFT contract itself may be able to place an NFT transfer is a state that is "pending transfer" until all payouts have been awarded. This would keep all the information inside the NFT and remove trust.

## Errata

- Version `2.1.0` adds a memo parameter to `nft_transfer_payout`, which previously forced implementers of `2.0.0` to pass `None` to the inner `nft_transfer`. Also refactors `max_len_payout` to be an option type.
- Version `2.0.0` contains the intended `approval_id` of `u64` instead of the stringified `U64` version. This was an oversight, but since the standard was live for a few months before noticing, the team thought it best to bump the major version.

## Copyright
[copyright]: #copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).