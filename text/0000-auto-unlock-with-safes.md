- Proposal Name: auto-unlock-with-safes
- Start Date: 2019-12-10
- NEP PR: [nearprotocol/neps#26](https://github.com/nearprotocol/neps/pull/26)
- Issue(s):  [nearprotocol/neps#23](https://github.com/nearprotocol/neps/pull/23), [nearprotocol/neps#24](https://github.com/nearprotocol/neps/pull/24)

# Summary
[summary]: #summary

Introducing a new concept of safes that allows to securely lock some data from a contract with
automatic unlock mechanism.

# Motivation
[motivation]: #motivation

There are a few NEPs that proposed solutions to address the cross-shard communication problem.
For example when an decentralized exchange tries to swap 2 tokens without owning them.

One solution is to introduce locks with automatic unlock capabilities, but without explicitly exposing the locked structure.
While it solves the issue for a simple exchange use-case. It has some limitations and complexity for non trivial use cases.

It might lead to an unexpected behavior when a token is behind the proxy contract.

This proposal is to introduce explicit locked data storage which we call a `safe` that can't be copied and always resolved at the end.
It's a familiar concept for an asynchronous development similar to guards.
When a guard is released, the destructor (or Drop in Rust) is called and the lock can be resolved.


# Guide-level explanation
[guide-level-explanation]: #guide-level-explanation

We introduce a new concept which we call a `safe`.

- Only the owner contract can create a safe.
- The safe has one owner.
- A safe always has a promise attached on it that calls the owner to release the safe (unlock). 
- Safe can't be cloned or copied, so there are always only 1 instance of a particular safe.
- Non-owner contracts can pass safes to other contracts and read the content, but can't modify the content of the safe.
- Owner contract can modify the content of the safe, but not the automatic release promise.

### Example:

When a decentralized exchange tries to move some tokens, it first has to acquire and lock the funds.
- Dex calls token contract to lock 1000 tokens for `alice`.
- Token contract creates a safe with the following data:
```
{
  owner_id: "alice",
  amount: 1000,
  locked_by: "dex",
}
```
- Token contract creates a promise to release the safe, e.g. by calling `unlock` on itself.
- Token returns OK and this safe to the `dex`.

Now Dex has this safe from the token contract.
Dex can read the content of the safe and assert the content is correct.

- Dex calls `transfer` on the token contract and pass this safe with this promise.
- Token contract reads the content of the safe that it received and transfers the required amount `400` to the new owner.
- Token contract modifies the content of the safe and decreased the safe amount by `400` by the transferred amount. E.g.
```
{
  owner_id: "alice",
  amount: 600,
  locked_by: "dex",
}
```
- Token contract can now return OK and the safe back to `dex`.

Transfer has completed successfully, but `dex` may want to do more transfers. It's safe to drop the safe now.

- Dex returns OK and drops the safe.
- When the safe is dropped (not passed to any contract and not returned), it calls the associated promise on the token contract.

NOTE, that the promise is always called even if the content of the safe was fully used.
It's because the promise is fully prepaid during the creation of the safe.

- Token contract checks the content of the safe and if there are still funds, it can return them back to `alice`.


# TBD BELOW
# TBD BELOW
# TBD BELOW

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
