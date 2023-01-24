# Royalties and Payouts

:::caution
This is part of the proposed spec [NEP-245](https://github.com/near/NEPs/blob/master/neps/nep-0245.md) and is subject to change.
:::

Version `1.0.0`.

This standard assumes the MT contract has implemented
[NEP-245](https://github.com/near/NEPs/blob/master/specs/Standards/Tokens/MultiToken/Core.md) (Core)
and [NEP-245](https://github.com/near/NEPs/blob/master/specs/Standards/Tokens/MultiToken/ApprovalManagement.md)
(Approval Management).

## Summary

An interface allowing multi token contracts to request that financial contracts pay-out multiple receivers, enabling
flexible royalty implementations.

## Motivation

Those familiar with the [NEP-199](https://nomicon.io/Standards/Tokens/NonFungibleToken/Payout) payout interface for 
non-fungible tokens may expect a similar interface for multi token contracts. However, the requirements for calculating 
payouts in multi token contracts are different, as they require information about the current holders and their 
balances. This standard aims to address this need by providing an extension interface for multi-token contracts that 
allows for the retrieval of current holder information, as well as methods interfaces for calculating and transferring 
payouts.

## Guide-level explanation

This Payout extension standard adds two methods to NFT contracts:

- a view method: `mt_payout`, accepting a `token_id` and some `balance`, returning the `Payout` mapping for the given
  token.
- a call method: `mt_transfer_payout`, accepting all the arguments of`mt_transfer`, plus a field for some `Balance`
  that calculates the `Payout`, calls `mt_transfer`, and returns the `Payout` mapping.

Financial contracts MUST validate several invariants on the returned
`Payout`:

1. The returned `Payout` MUST be no longer than the given maximum length (`max_len_payout` parameter) if provided.
   Payouts of excessive length can become prohibitively gas-expensive. Financial contracts can specify the maximum
   length of payout the contract is willing to respect with the `max_len_payout` field on `mt_transfer_payout`.
2. The balances MUST add up to less than or equal to the `balance` argument in `mt_transfer_payout`. If the balance
   adds up to less than the `balance` argument, the financial contract MAY claim the remainder for itself.
3. The sum of the balances MUST NOT overflow. This is technically identical to 2, but financial contracts should be
   expected to handle this possibility.

Financial contracts MAY specify their own maximum length payout to respect.
At minimum, financial contracts MUST NOT set their maximum length below 10.

If the Payout contains any addresses that do not exist, the financial contract MAY keep those wasted payout funds.

Financial contracts MAY take a cut of the NFT sale price as commission, subtracting their cut from the total token sale
price, and calling `mt_transfer_payout` with the remainder.

## Example Flow

```
 ┌─────────────────────────────────────────────────────────┐
 │Token Owner approves marketplace for "1000" token_id "1" │
 ├─────────────────────────────────────────────────────────┘
 │  mt_approve(["1"],["1000"],market.near,<SaleArgs>)
 ▼
 ┌─────────────────────────────────────────────────────────┐
 │Marketplace sells 500 tokens to user.near for 10N        │
 ├─────────────────────────────────────────────────────────┘
 │  mt_transfer_payout(user.near,"1","500",[market.near,1], None,5)
 ▼
 ┌─────────────────────────────────────────────────────────┐
 │MT contract returns Payout data                          │
 ├─────────────────────────────────────────────────────────┘
 │  Payout(<who_gets_paid_and_how_much)
 ▼
 ┌─────────────────────────────────────────────────────────┐
 │Market validates and pays out addresses                  │
 └─────────────────────────────────────────────────────────┘
```

## Interface

The contract must implement the following view method:
```ts
/// Get a list of all token holders (with pagination)
///
/// # Arguments:
/// * `token_id` - ID of the token
/// * `from_index`: a string representing an unsigned 128-bit integer,
///    representing the starting index of accounts to return
/// * `limit`: the maximum number of accounts to return
/// returns: List of [AccountId]s.
///
function mt_token_holders(
    token_id: string,
    from_index: number|null,
    limit: number|null,
): Promise<string[]>;
```

## Reference-level explanation

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
    fn mt_payout(&self, token_id: TokenId, balance: U128, max_len_payout: u32) -> Payout;
    /// Given a `token_id` and NEAR-denominated balance, transfer the token
    /// and return the `Payout` struct for the given token. Panic if the
    /// length of the payout exceeds `max_len_payout.`
    #[payable]
    fn mt_transfer_payout(
        &mut self,
        receiver_id: AccountId,
        token_id: TokenId,
        amount: U128,
        approval: Option<(AccountId, u64)>,
        memo: Option<String>,
        balance: U128,
        max_len_payout: u32,
    ) -> Payout {
        assert_one_yocto();
        let payout = self.mt_payout(token_id.clone(), balance, max_len_payout);
        self.mt_transfer(receiver_id, token_id, amount, approval, memo);
        payout
    }
}
```

Note that MT and financial contracts will vary in implementation. This means that some extra CPU cycles may occur in
one MT contract and not another. Furthermore, a financial contract may accept fungible tokens, native NEAR, or another
entity as payment. Transferring native NEAR tokens is less expensive in gas than sending fungible tokens. For these
reasons, the maximum length of payouts may vary according to the customization of the smart contracts.

## Drawbacks

[NEP-199 Drawbacks](https://nomicon.io/Standards/Tokens/NonFungibleToken/Payout#drawbacks)

## Future possibilities

[NEP-199 Future possibilities](https://nomicon.io/Standards/Tokens/NonFungibleToken/Payout#drawbacks)
