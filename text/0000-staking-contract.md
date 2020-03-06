- Proposal Name: staking-contract
- Start Date: 2020-01-12
- NEP PR: [nearprotocol/neps#0000](https://github.com/nearprotocol/neps/pull/0000)
- Issue(s): link to relevant issues in relevant repos (not required).

# Summary
[summary]: #summary

Provides both reference design for staking contract and required modification to NEAR runtime to support it.

# Motivation
[motivation]: #motivation

In NEAR contracts and accounts are the same object. This allows to have a contract that stakes NEAR on it's balance.
This is useful to implement delegation, custom reward dispersion, liquid staking and various derivatives on stake and more.

# Guide-level explanation
[guide-level-explanation]: #guide-level-explanation

The simplest example of staking contract would be a delegation contract.
A validator `A` can create such contract and stake with it on their node.
Any other user can send their money to it, which will be pooled together with `A`'s stake.
These users would acrue rewards (subtracted `A` fee) and can withdraw their balance within the same unbonding period.

More complex example can also issue token for deposited user's stake. This stake is the right to withdraw underlaying balance and rewards. This provides staking liquidity and allows to trade staked tokens.

# Reference-level explanation
[reference-level-explanation]: #reference-level-explanation

## Staking Contract spec

Next interface is implemented by staking contract:
```
trait StakingContract { 
    /// Initializes this contract with given owner and staking_public_key. This call doesn't take attached money.
    fn new(owner: AccountId, staking_public_key: PublicKey) -> Self;
    
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

At this point we need to update internal state based on the results of validator selection at the end of epoch. See next section for API of the callback.

* On epoch change callback, internal state gets updated, adding proportional rewards to all users who have staked epoch - 1 to the given epoch.


## Runtime changes required

Currently runtime doesn't expose any APIs to surface the state of staking and rewards.
For staking contracts to be able to give back appropriate amount of reward, we need an API that can expose this internal state.

For any account that has contract deployed, we can add a hook that gets called first block of the epoch (we already doing calculations there, but currently do not propagate the information to the contracts).

Contract needs to have enough gas to execute such an operation - hence should both leave enough NEAR and somewhere specify how much gas it needs (or we can just budget based on funds available). 

Proposal to add next callback API `def on_epoch_change(seat_price: Balance, past_reward: Balance, past_validator_stats: ValidatorStats)` which will be attempted to call on any account which `code_hash != 0`.

Where `seat_price` is amount of NEAR required to take one seat. This required for contract to figure out if it had enough money to stake. `past_reward` is amount that this validator received for the past epoch.

```
/// Contains for previous epoch stats of the given vsaldiator.
struct ValidatorStats {
    num_blocks_produced: BlockIndex,
    num_blocks_exepcted: BlockIndex,
    num_chunks_produced: BlockIndex,
    num_chunks_expected: BlockIndex,
    is_slashed: bool,
}
```

# Drawbacks
[drawbacks]: #drawbacks

General drawback of staking finance, is leverage of the stake. Someone can try to create leverage and buy more stake to control bigger position of the network and do bigger harm. The issue is that this happening and addressing this on chain gives us great visilibity.

The first block of the epoch will be filled with staking contract calls. People can try to grind that block by creating expensive callbacks on staking contracts.

# Rationale and alternatives
[rationale-and-alternatives]: #rationale-and-alternatives

There a number of applications around DeFi and staking that are going to happened soon.
Currently they require a separate set of multi-sig holders on a different chain. This creates new vectors of attack in addition to reducing visibility of securiy on chain.

Because in NEAR contracts can stake, we can relatively easily add the support for any generic staking finance contracts.

An alternative to callback API, we can extend promises API to support a delayed scheduling based on epoch switch or generally block index. In addition that we would also need to surface same epoch manager state via host function calls.

# Unresolved questions
[unresolved-questions]: #unresolved-questions


# Future possibilities
[future-possibilities]: #future-possibilities
