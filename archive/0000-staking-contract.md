- Proposal Name: staking-contract
- Start Date: 2020-01-12
- NEP PR: [nearprotocol/neps#0000](https://github.com/nearprotocol/neps/pull/0000)
- Issue(s): link to relevant issues in relevant repos (not required).

# Summary
[summary]: #summary

Provides standard and reference internal design for staking contract with delegation.

# Motivation
[motivation]: #motivation

In NEAR contracts and accounts are the same object. This allows to have a contract that stakes NEAR with it's balance.
This is useful to implement delegation, custom reward dispersion, liquid staking and various derivatives on stake and more.

# Guide-level explanation
[guide-level-explanation]: #guide-level-explanation

The simplest example of staking contract would be a delegation contract.

Let's define actors:
- The staking pool contract account `staking-pool`. A key-less account with the contract that pools funds.
- The owner of the staking contract `owner`. Owner runs the validator node on behalf of the staking pool account.
- A delegator `user1`. The account who wants to stake their fund to the pool.

The owner can setup such contract and validate on behalf of this contract in their node.
Any other user can send their tokens to the contract, which will be pooled together and increase the total stake.
These users would accrue rewards (subtracted fees set by the owner).
Then they can unstake and withdraw their balance after some unlocking period.

More complex example can also issue token for deposited user's stake. This stake is the right to withdraw underlaying balance and rewards. This provides staking liquidity and allows to trade staked tokens.

# Reference-level explanation
[reference-level-explanation]: #reference-level-explanation

## Staking contract guarantees:

- The contract can't lose or lock tokens of users.
- If a user deposited X, the user should be able to withdraw at least X.
- If a user successfully staked X, the user can unstake at least X.
- The contract should lock unstaked funds for longer than 4 epochs.

## Staking Contract spec

Next interface is implemented by staking contract:
```rust
/******************/
/* Change methods */
/******************/

/// Call to distribute rewards after the new epoch. It's automatically called before every
/// changing action. But it's not called before the view methods, so one might need to call
/// `ping` before calling view methods to get recent results.
pub fn ping(&mut self);

/// Deposits the attached amount into the inner account of the predecessor.
#[payable]
pub fn deposit(&mut self);

/// Withdraws the non staked balance for given account.
/// It's only allowed if the `unstake` action was not performed in the recent 4 epochs.
pub fn withdraw(&mut self, amount: U128);

/// Stakes the given amount from the inner account of the predecessor.
/// The inner account should have enough unstaked balance.
pub fn stake(&mut self, amount: U128);

/// Unstakes the given amount from the inner account of the predecessor.
/// The inner account should have enough staked balance.
/// The new total unstaked balance will be available for withdrawal in 4 epochs.
pub fn unstake(&mut self, amount: U128);

/****************/
/* View methods */
/****************/

/// Returns the unstaked balance of the given account.
pub fn get_account_unstaked_balance(&self, account_id: AccountId) -> U128;

/// Returns the staked balance of the given account.
pub fn get_account_staked_balance(&self, account_id: AccountId) -> U128;

/// Returns the total balance of the given account (including staked and unstaked balances).
pub fn get_account_total_balance(&self, account_id: AccountId) -> U128;

/// Returns `true` if the given account can withdraw unstaked tokens in the current epoch.
pub fn is_account_unstaked_balance_available(&self, account_id: AccountId) -> bool;

/// Returns the total staking balance.
pub fn get_total_staked_balance(&self) -> U128;
```

## User path

A simple path for a user who wants to pool their funds can be the following:

##### Delegate money

To deposit and stake 100 NEAR.

```bash
near call staking-pool deposit '{}' --accountId user1 --amount 100
near call staking-pool stake '{"amount": "100000000000000000000000000"}' --accountId user1
```

Wait for a week, so the pool accumulate some rewards.

##### Update internal state of the staking pool (optional)

```bash
near call staking-pool ping '{}' --accountId user1
```

##### See current balance

```bash
# User1 total balance
near view staking-pool get_account_total_balance '{"account_id": "user1"}'
```

##### Unstake some rewards and withdraw them

Get the current staked balance

```bash
# User1 staked balance
near view staking-pool get_account_staked_balance '{"account_id": "user1"}'
```

Let's say `user1` accumulated `0.6` NEAR and the total is `100.6` NEAR. The user decides to withdraw `0.5` NEAR.
First the user has to unstake `0.5` NEAR.

```bash
near call staking-pool unstake '{"amount": "500000000000000000000000"}' --accountId user1
```

Let's check the unstaked balance.

```bash
# User1 unstaked balance
near view staking-pool get_account_unstaked_balance '{"account_id": "user1"}'
```

Wait for 4 epochs. Check if the balance is liquid and can be withdrawn now.

```bash
# Whether @user1 can withdraw
near view staking-pool is_account_unstaked_balance_available '{"account_id": "user1"}'
```

Now withdraw `0.5` NEAR back to the `user1` account.

```bash
near call staking-pool withdraw '{"amount": "500000000000000000000000"}' --accountId user1
```

# Drawbacks
[drawbacks]: #drawbacks

General drawback of staking finance, is leverage of the stake. Someone can try to create leverage and buy more stake to control bigger position of the network and do bigger harm. The issue is that this happening and addressing this on chain gives us great visibility.

# Rationale and alternatives
[rationale-and-alternatives]: #rationale-and-alternatives

There a number of applications around DeFi and staking that are going to happened soon.
Currently they require a separate set of multi-sig holders on a different chain. This creates new vectors of attack in addition to reducing visibility of security on chain.

Because in NEAR contracts can stake, we can relatively easily add the support for any generic staking financial contracts.

# Unresolved questions
[unresolved-questions]: #unresolved-questions


# Future possibilities
[future-possibilities]: #future-possibilities
