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
A validator `A` can create such contract and stake with it on their node.
Any other user can send their money to it, which will be pooled together with `A`'s stake.
These users would accrue rewards (subtracted `A`'s fee) and can withdraw their balance within the same unbonding period.

More complex example can also issue token for deposited user's stake. This stake is the right to withdraw underlaying balance and rewards. This provides staking liquidity and allows to trade staked tokens.

# Reference-level explanation
[reference-level-explanation]: #reference-level-explanation

## Staking Contract spec

Next interface is implemented by staking contract:
```
trait StakingContract { 
    /// Initializes this contract with given owner and staking_public_key. 
    /// This call doesn't take attached money, uses initial amount that is already on the contract.
    fn new(owner: AccountId, staking_public_key: PublicKey) -> Self;
    
    /// A function that must be called every epoch to update the rewards across all deposits.
    fn ping(&mut self);

    /// Deposits on virtual balance for predessesor of this contract attached balance.
    /// If this contract supports liquid staking, this would issue a token for this user.
    fn deposit(&mut self);

    /// Withdraws from the account given amount if this users has enough money on virtual balance.
    /// Different contracts can handle this differently, for example to require unstake first or maintain liqudiity and unstake automatically when this method is called.
    fn withdraw(&mut self, amount: Balance);
    
    /// Stake given balance for predessesor user.
    fn stake(&mut self, amount: Balance);

    /// Unstake given balance for predessesor user. Usually would proratated rewards for this amount.
    fn unstake(&mut self, amount: Balance);

    /// Returns virutal balance that's not staked for given user.
    fn get_user_balance(&mut self, account_id: AccountId) -> Balance;

    /// Returns virtual balance that's stake for given user.
    fn get_user_stake(&mut self, account_id: AccountId) -> Balance;
}
```

We suggest to at least have next internal state:
* `owner: AccountId` - the account that has ability to change `staking_public_key` and stop this staking contract operation.
* `staking_public_key: PublicKey` - current key that the contract stakes with. This is required as `stake` calls will be made to runtime and they require it as input.
* `users: NearMap<AccountId, User>` - map of accounts that delegated the money to given contract with the state of delegation.

Where `User` is represented in the next way:
```
struct User {
    /// Amount of money deposited but not staked/locked.
    amount: Balance,
    /// Amount of money staked.
    staked: Balance,
    /// Block index at which the staking happend.
    staked_at: BlockIndex,
}
```

Simple path with internal state and actions:
* Owner `A` creates staking contract `Q`.
   Internal state: `users -> {}, balance: 0, locked: 0`
* User `B` deposits `X1` NEAR into `Q` by calling `deposit`.
   Internal state: `users -> {B: {balance: X1, stake: 0}}, balance: X1, locked: 0`
* User `C` deposits `X2` NEAR into `Q` by calling `depoist`.
   Internal state: `users -> {B: {balance: X1, stake: 0}, C: {balance: X2, stake: 0}}, balance: X1+X2, locked: 0`
* User `B` calls `stake(X1)`.
    Call to `Q.stake(X1)` is issued.
    Internal state `users -> {B: {balance: 0, stake: X1}, C: {balance: X2, stake: 0}}, balance: X2, locked: X1`

At this point we need to update internal state based on the results of validator selection and amount of rewards allocated to this validator:

* On `ping()` call, internal state gets updated, adding proportional rewards to all users who have staked epoch - 1 to the given epoch.

# Drawbacks
[drawbacks]: #drawbacks

General drawback of staking finance, is leverage of the stake. Someone can try to create leverage and buy more stake to control bigger position of the network and do bigger harm. The issue is that this happening and addressing this on chain gives us great visibility.

# Rationale and alternatives
[rationale-and-alternatives]: #rationale-and-alternatives

There a number of applications around DeFi and staking that are going to happened soon.
Currently they require a separate set of multi-sig holders on a different chain. This creates new vectors of attack in addition to reducing visibility of security on chain.

Because in NEAR contracts can stake, we can relatively easily add the support for any generic staking finance contracts.

# Unresolved questions
[unresolved-questions]: #unresolved-questions


# Future possibilities
[future-possibilities]: #future-possibilities
