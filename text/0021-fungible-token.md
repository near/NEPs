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

Let's assume the following:
- The wBTC token contract is `wbtc`.
- Alice's account is `alice`.
- Bob's account is `bob`.
- The precision on wBTC contract is `10^8`. 
- The 5 tokens is `5 * 10^8` or as a number is `500000000`. 

High-level explanation:

Alice needs to issue one transaction to wBTC contract to transfer 5 tokens (multiplied by precision) to Bob.
 
Technical calls:

1. `alice` calls `wbtc::transfer({"new_owner_id": "bob", "amount": "500000000"})`.

#### Token deposit to a contract 

Alice wants to deposit 1000 DAI tokens to a compound interest contract to earn some interest.

Let's assume the following:
- The DAI token contract is `dai`.
- Alice's account is `alice`.
- The compound interest contract is `compound`.
- The precision on DAI contract is `10^18`. 
- The 1000 tokens is `1000 * 10^18` or as a number is `1000000000000000000000`. 
- The compound contract can work with multiple token types.

High-level explanation:

Alice needs to issue 2 transactions. The first one to `dai` to set an allowance for `compound` to be able to withdraw tokens from `alice`.
The second transaction is to the `compound` to start the deposit process. Compound will check that the DAI tokens are supported and will try to withdraw the desired amount of DAI from `alice`.
- If transfer succeeded, `compound` can increase local ownership for `alice` to 1000 DAI
- If transfer fails, `compound` doesn't need to do anything in current example, but maybe can notify `alice` of unsuccessful transfer.

Technical calls:

1. `alice` calls `dai::set_allowance({"escrow_account_id": "compound", "amount": "1000000000000000000000"})`.
1. `alice` calls `compound::deposit({"token_contract": "dai", "amount": "1000000000000000000000"})`. During the `deposit` call, `compound` does the following:
   1. makes async call `dai::transfer_from({"owner_id": "alice", "new_owner_id": "compound", "amount": "1000000000000000000000"})`.
   1. attaches a callback `compound::on_transfer({"owner_id": "alice", "token_contract": "dai", "amount": "1000000000000000000000"})`.

#### Multi-token swap on DEX

Charlie wants to exchange 9001 wLTC to 80 wBTC on decentralized exchange contract. Alex wants to buy wLTC.

Let's assume the following:
- The wLTC token contract is `wltc`.
- The wBTC token contract is `wbtc`.
- The DEX contract is `dex`.
- Charlie's account is `charlie`.
- Alex's account is `alex`.
- The precision on both tokens contract is `10^8`. 
- The 9001 wLTC tokens is `9001 * 10^8` or as a number is `900100000000`. 
- The 80 wBTC tokens is `80 * 10^8` or as a number is `8000000000`. 
- Dex contract already has an open order to sell 80 wBTC tokens by `alex` towards 9001 wLTC.
- Dex acts in good faith. It doesn't hold the assets, but only acts as an escrow. Which means any order can potentially fail, users don't have to deposit tokens for creating an order.

High-level explanation:

Let's first setup open order by Alex on dex. It's similar to `Token deposit to a contract` example above. Alex sets an allowance on wBTC to DEX, then calls DEX to make an new sell order.
Then Charlie comes and decides to fulfill the order by selling his wLTC to Alex on DEX.
Before Charlie calls the DEX, he can verify that Alex has enough unlocked tokens and enough allowance to DEX to fulfill the order. It doesn't guarantee the success of filling the order, but it shows high probability of the success.
Once verified, Charlie sets the allowance on wLTC to DEX, then calls DEX to take the order from Alex.
Once called, DEX issues 2 async calls in parallel: one to wLTC to lock tokens from Charlie, another to wBTC to lock tokens from Alex.
- If both lock calls succeeded, DEX issues another 2 async calls: on wLTC transfer from Charlie to Alex and on wBTC transfer from Alex to Charlie. Order is considered fulfilled now.
- If any of the locks fails. For every successful lock, the DEX issues async call to unlock it. It can also cancel the order if Alex's order

# Reference-level explanation
[reference-level-explanation]: #reference-level-explanation

This is the technical portion of the NEP. Explain the design in sufficient detail that:

- Its interaction with other features is clear.
- It is reasonably clear how the feature would be implemented.
- Corner cases are dissected by example.

The section should return to the examples given in the previous section, and explain more fully how the detailed proposal makes those examples work.

# Drawbacks
[drawbacks]: #drawbacks

Why should we *not* do this?

# Rationale and alternatives
[rationale-and-alternatives]: #rationale-and-alternatives

- Why is this design the best in the space of possible designs?
- What other designs have been considered and what is the rationale for not choosing them?
- What is the impact of not doing this?

# Unresolved questions
[unresolved-questions]: #unresolved-questions

- What parts of the design do you expect to resolve through the NEP process before this gets merged?
- What parts of the design do you expect to resolve through the implementation of this feature before stabilization?
- What related issues do you consider out of scope for this NEP that could be addressed in the future independently of the solution that comes out of this NEP?

# Future possibilities
[future-possibilities]: #future-possibilities

Think about what the natural extension and evolution of your proposal would
be and how it would affect the project as a whole in a holistic
way. Try to use this section as a tool to more fully consider all possible
interactions with the project in your proposal.
Also consider how the this all fits into the roadmap for the project
and of the relevant sub-team.

This is also a good place to "dump ideas", if they are out of scope for the
NEP you are writing but otherwise related.

If you have tried and cannot think of any future possibilities,
you may simply state that you cannot think of anything.

Note that having something written down in the future-possibilities section
is not a reason to accept the current or a future NEP. Such notes should be
in the section on motivation or rationale in this or subsequent NEPs.
The section merely provides additional information.
