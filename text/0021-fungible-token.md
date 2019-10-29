- Proposal Name: fungible-token
- Start Date: 2019/10/28
- NEP PR: [nearprotocol/neps#0021](https://github.com/nearprotocol/neps/pull/21)
- Issue(s): https://github.com/nearprotocol/near-bindgen/pull/38

# Summary
[summary]: #summary

A standard interface for fungible tokens allowing for ownership, escrow and transfer, specifically targeting third-party marketplace integration.

# Motivation
[motivation]: #motivation

NEAR Protocol uses an asynchronous sharded Runtime. This means the following:
 - Storage for different contracts and accounts can be located on the different shards.
 - Two contracts can be executed at the same time in different shards.
 
While this increases the transaction throughput linearly with the number of shards, it also creates some challenges for cross-contract development.
For example, if one contract wants to query some information from the state of another contract (e.g. current balance), by the time the first contract receive the balance the real balance can change.
It means in the async system, a contract can't rely on the state of other contract and assume it's not going to change.
Instead the contract should rely on temporary partial lock of the state with a callback to act or unlock.

It influences the design of async fungible token.   

Prior art:
- ERC-20 standard: https://eips.ethereum.org/EIPS/eip-20
- NEP#4 NEAR NFT standard: [nearprotocol/neps#4](https://github.com/nearprotocol/neps/pull/4)

# Guide-level explanation
[guide-level-explanation]: #guide-level-explanation

We should be able to do the following:
- Initialize contract once. The given total supply will be owned by the given account ID.
- Get the total supply.
- Transfer tokens to a new user.
- Set a given allowance for an escrow account ID. Escrow will be able to transfer up this allowance from your account. 
- Get current total balance for a given account ID.
- Transfer from one user to another some amount (up to allowance).
- Temporary lock some amount of tokens to prevent someone else spending them. It's needed for an async transfers by escrows.
- Unlock some amount of locked tokens.
- Get the current allowance for an escrow account on behalf of the balance owner.
- Get the current amount of locked tokens by an escrow account on behalf of an balance owner.

There are a few concepts in the scenarios above:
- **Total supply**. It's the total number of tokens in circulation.
- **Balance owner**. An account ID that owns some amount of tokens.
- **Transfer**. Moves some amount from one account to another account.
- **Escrow**. A different account from the balance owner who has permission to use some amount of tokens.
- **Allowance**. The amount of tokens an escrow account can use on behalf of an owner.
- **Locked tokens**. Locked tokens still belongs to the balance owner, but can't be used by anyone except the account which locked them.
- **Unlocked tokens**. Tokens that can be used by the owner or by escrow accounts on behalf of the owner.

### Real scenarios
 
#### Simple transfer

Alice wants to send 5 wBTC tokens to Bob.

**Assumptions**

- The wBTC token contract is `wbtc`.
- Alice's account is `alice`.
- Bob's account is `bob`.
- The precision on wBTC contract is `10^8`. 
- The 5 tokens is `5 * 10^8` or as a number is `500000000`. 

**High-level explanation**

Alice needs to issue one transaction to wBTC contract to transfer 5 tokens (multiplied by precision) to Bob.
 
**Technical calls**

1. `alice` calls `wbtc::transfer({"new_owner_id": "bob", "amount": "500000000"})`.

#### Token deposit to a contract 

Alice wants to deposit 1000 DAI tokens to a compound interest contract to earn some interest.

**Assumptions**

- The DAI token contract is `dai`.
- Alice's account is `alice`.
- The compound interest contract is `compound`.
- The precision on DAI contract is `10^18`. 
- The 1000 tokens is `1000 * 10^18` or as a number is `1000000000000000000000`. 
- The compound contract can work with multiple token types.

**High-level explanation**

Alice needs to issue 2 transactions. The first one to `dai` to set an allowance for `compound` to be able to withdraw tokens from `alice`.
The second transaction is to the `compound` to start the deposit process. Compound will check that the DAI tokens are supported and will try to withdraw the desired amount of DAI from `alice`.
- If transfer succeeded, `compound` can increase local ownership for `alice` to 1000 DAI
- If transfer fails, `compound` doesn't need to do anything in current example, but maybe can notify `alice` of unsuccessful transfer.

**Technical calls**

1. `alice` calls `dai::set_allowance({"escrow_account_id": "compound", "allowance": "1000000000000000000000"})`.
1. `alice` calls `compound::deposit({"token_contract": "dai", "amount": "1000000000000000000000"})`. During the `deposit` call, `compound` does the following:
   1. makes async call `dai::transfer_from({"owner_id": "alice", "new_owner_id": "compound", "amount": "1000000000000000000000"})`.
   1. attaches a callback `compound::on_transfer({"owner_id": "alice", "token_contract": "dai", "amount": "1000000000000000000000"})`.

#### Multi-token swap on DEX

Charlie wants to exchange his wLTC to wBTC on decentralized exchange contract. Alex wants to buy wLTC and has 80 wBTC.

**Assumptions**

- The wLTC token contract is `wltc`.
- The wBTC token contract is `wbtc`.
- The DEX contract is `dex`.
- Charlie's account is `charlie`.
- Alex's account is `alex`.
- The precision on both tokens contract is `10^8`. 
- The amount of 9001 wLTC tokens is Alex wants is `9001 * 10^8` or as a number is `900100000000`. 
- The 80 wBTC tokens is `80 * 10^8` or as a number is `8000000000`. 
- Charlie has 1000000 wLTC tokens which is `1000000 * 10^8` or as a number is `100000000000000`
- Dex contract already has an open order to sell 80 wBTC tokens by `alex` towards 9001 wLTC.
- Dex acts in good faith. It doesn't hold the assets, but only acts as an escrow. Which means any order can potentially fail, users don't have to deposit tokens for creating an order.

**High-level explanation**

Let's first setup open order by Alex on DEX. It's similar to `Token deposit to a contract` example above.
- Alex sets an allowance on wBTC to DEX
- Then calls DEX to make an new sell order.

Then Charlie comes and decides to fulfill the order by selling his wLTC to Alex on DEX.
Before Charlie calls the DEX, he can verify that Alex has enough unlocked tokens and enough allowance to DEX to fulfill the order. It doesn't guarantee the success of filling the order, but it shows high probability of the success.
Once verified,
- Charlie sets the allowance on wLTC to DEX
- Then calls DEX to take the order from Alex.

When called, DEX issues 2 async calls in parallel and attaches a callback to itself:
- One to wLTC to lock tokens from Charlie
- Another to wBTC to lock tokens from Alex.
- Callback to check the results of locks
   - If both lock calls succeeded, DEX issues another 2 async calls:
      - On wLTC transfer from Charlie to Alex
      - On wBTC transfer from Alex to Charlie.
      - Order is considered fulfilled now.
   - If any of the locks fails.
      - For every successful lock, the DEX issues async call to unlock it.
      - It can also cancel the order if Alex's order

**Technical calls**

1. `alex` calls `wbtc::set_allowance({"escrow_account_id": "dex", "allowance": "8000000000"})`.
1. `alex` calls `dex::trade({"have": "wbtc", "have_amount": "8000000000", "want": "wltc", "want_amount": "900100000000"})`.
1. `charlie` calls `wltc::set_allowance({"escrow_account_id": "dex", "allowance": "100000000000000"})`.
1. `charlie` calls `dex::trade({"have": "wltc", "have_amount": "900100000000", "want": "wbtc", "want_amount": "8000000000"})`. DEX initiates the exchange:
   1. DEX makes 2 async calls in parallel:
      - `wbtc::lock({"owner_id": "alex", "lock_amount": "8000000000"})`
      - `wltc::lock({"owner_id": "charlie", "lock_amount": "900100000000"})`
   1. DEX attaches a callback `dex::on_lock({"owner_a": "alex", "token_a": "wbtc", "amount_a": "8000000000", "owner_b": "charlie", "token_b": "wltc", "amount_b": "900100000000"})`.
      - If both locks succeed, DEX issues 2 async calls in parallel:
         - `wbtc::transfer_from({"owner_id": "alex", "new_owner_id": "charlie", "amount": "8000000000"})`
         - `wltc::transfer_from({"owner_id": "charlie", "new_owner_id": "alex", "amount": "900100000000"})`
         - Internally marks the order as successful
      - If the first lock fails, unlocks Charlie's locked amount:
         - `wltc::unlock({"owner_id": "charlie", "unlock_amount": "900100000000"})`
         - Internally deletes Alex's order.
      - If the second lock fails, unlocks Alex's locked amount:
         - `wbtc::unlock({"owner_id": "alex", "unlock_amount": "8000000000"})`
         - Internally deletes Charlies's order.


# Reference-level explanation
[reference-level-explanation]: #reference-level-explanation

The full implementation in Rust can be found there: https://github.com/nearprotocol/near-bindgen/blob/master/examples/fun-token/src/lib.rs

Interface:

```rust
/// Initializes the token contract with the given `total_supply` owned by the `owner_id`.
pub fn new(owner_id: AccountId, total_supply: Balance) -> Self;

/// Sets amount allowed to spent by `escrow_account_id` on behalf of the caller of the function
/// (`predecessor_id`) who is considered the balance owner to the new `allowance`.
/// If some amount of tokens is currently locked by the `escrow_account_id` the new allowance is
/// decreased by the amount of locked tokens.
pub fn set_allowance(&mut self, escrow_account_id: AccountId, allowance: Balance);

/// Locks an additional `lock_amount` to the caller of the function (`predecessor_id`) from
/// the `owner_id`.
/// Requirements:
/// * The (`predecessor_id`) should have enough allowance or be the owner.
/// * The owner should have enough unlocked balance.
pub fn lock(&mut self, owner_id: AccountId, lock_amount: Balance);

/// Unlocks the `unlock_amount` from the caller of the function (`predecessor_id`) back to
/// the `owner_id`.
/// If called not by the `owner_id` then the `unlock_amount` will be converted to the allowance.
/// Requirements:
/// * The (`predecessor_id`) should have at least `unlock_amount` locked tokens from `owner_id`.
pub fn unlock(&mut self, owner_id: AccountId, unlock_amount: Balance);

/// Transfers the `amount` of tokens from `owner_id` to the `new_owner_id`.
/// First uses locked tokens by the caller of the function (`predecessor_id`). If the amount
/// of locked tokens is not enough to cover the full amount, then uses unlocked tokens
/// for the remaining balance.
/// Requirements:
/// * The caller of the function (`predecessor_id`) should have at least `amount` of locked plus
/// allowance tokens.
/// * The balance owner should have at least `amount` of locked (by `predecessor_id`) plus
/// unlocked tokens.
pub fn transfer_from(&mut self, owner_id: AccountId, new_owner_id: AccountId, amount: Balance);

/// Same as `transfer_from` with `owner_id` `predecessor_id`.
pub fn transfer(&mut self, new_owner_id: AccountId, amount: Balance);

/// Returns total supply of tokens.
pub fn get_total_supply(&self) -> Balance;

/// Returns total balance for the `owner_id` account. Including all locked and unlocked tokens.
pub fn get_total_balance(&self, owner_id: AccountId) -> Balance;

/// Returns unlocked token balance for the `owner_id`.
pub fn get_unlocked_balance(&self, owner_id: AccountId) -> Balance;

/// Returns current allowance for the `owner_id` to be able to use by `escrow_account_id`.
pub fn get_allowance(&self, owner_id: AccountId, escrow_account_id: AccountId) -> Balance;

/// Returns current locked balance for the `owner_id` locked by `escrow_account_id`.
pub fn get_locked_balance(&self, owner_id: AccountId, escrow_account_id: AccountId) -> Balance;
```

# Drawbacks
[drawbacks]: #drawbacks

- Current interface doesn't have minting, precision and naming.
- It's possible to accidentally lock tokens if the escrow account is not carefully handling gas correctly.
Ideally we should automatically unlock long-locked tokens after the some period of time and/or blocks.  

# Unresolved questions
[unresolved-questions]: #unresolved-questions

- For how long should we lock the token?
- Should a new lock reset the time for an older lock?
- Should locks automatically unlocks, or a user have to trigger it?

# Future possibilities
[future-possibilities]: #future-possibilities

- Support for multiple token types
- Minting and burning
