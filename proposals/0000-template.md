- Proposal Name: `voting_contract`
- Start Date: 05-02-2020
- NEP PR: [nearprotocol/neps#0000](https://github.com/nearprotocol/neps/pull/0000)
- Issue(s): https://github.com/nearprotocol/nearcore/issues/2474, https://github.com/nearprotocol/nearcore/issues/2475.

# Summary
[summary]: #summary

This NEP proposes a way to implement voting contract on chain. This voting contract can be used for various types of
governance activities, including but not limited to deciding when to unlock token transfer, when to upgrade the network, etc.
More specifically, this contract allows anyone to make proposals (such as the height of the next network reset), but limits
voting to validators. Once a proposal receives 2/3 of the total votes, it is considered final.

# Motivation
[motivation]: #motivation

For a decentralized protocol, governance never fails to be one of the most important piece of the entire system. Without
proper governance the network will likely fall apart. On-chain voting is a crucial constituent of governance and this NEP
aims to make a first step in that direction by laying out the framework of a general-purpose voting contract that allows
validators as a community to make decisions on chain. 

# Guide-level explanation
[guide-level-explanation]: #guide-level-explanation

The structure of this contract looks like the following:

```rust
pub type ProposalId = u64;
pub type PollId = u64;

pub struct VotingContract {
    polls: Map<PollId, Poll>,
}
```

On the top level we store a map of `PollId` to `Poll`. `Poll` contains information about a particular poll,
including its topic and proposals for this poll.
```rust
pub struct Poll {
    topic: String,
    /// All proposals for this poll.
    proposals: Map<ProposalId, Proposal>,
    /// Accounts that have participated in this poll and the corresponding stake voted.
    accounts: Map<AccountId, Balance>,
    /// The final result of this poll. `None` means it is still open.
    result: Option<ProposalId>
}
```
`Proposal` contains all the voting information on this particular proposal in addition to the actual content of the proposal:
```rust
pub struct Proposal {
    content: String,
    /// When this proposal expires
    expiration_height: BlockHeight,
    /// Current votes on this proposal
    votes: Map<AccountId, Balance>,    
}
```

For each poll, validators can vote on proposals based on their stake. Within a given poll, the total stake that a validator
votes cannot exceed their current stake.

The voting contract has the following methods to allow creation of polls and proposals, as well as voting for proposals.

```rust
impl VotingContract {
    /// Create a poll on some topic.
    pub fn create_poll(&mut self, topic: String);
    /// Create a proposal for a given poll.
    pub fn create_proposal(&mut self, poll_id: PollId, proposal: String);
    /// Vote on a given proposal with certain amont of stake.
    pub fn vote(&mut self, poll_id: PollId, proposal_id: ProposalId, stake: Balance);
    /// View poll
    pub fn get_poll(&mut self, poll_id: PollId) -> Poll;
}
```
Notice that the `vote` function can also be used to withdraw a vote by putting 0 stake on the vote.

# Reference-level explanation
[reference-level-explanation]: #reference-level-explanation

A major difficulty in managing the votes comes from the fact that validator stake can change from epoch to epoch, which
means that we need to carefully update validator votes. For example, if a validator has 100 stake in the previous epoch and
they voted 80 on some proposal, but in the current epoch their stake has decreased to 80, and now if they try to vote 20
on some other proposal, it should fail. To address this, we introduce a helper function `resolve`, which is called
every epoch before any call to the contract:
```rust
fn resolve(&mut self) {
    // for each poll, go through all the proposals and for each account, scale the stake on votes to current stake, i.e,
    // for each vote, its stake is changed to orginal_stake * current_total_account_stake / previous_total_account_stake.
    // Also clear proposals that have expired.
}
```
To properly keep track of epochs, we need to add a field `last_epoch_height: EpochHeight` to `VotingContract` and check
if `env::epoch_height()` is the same as `last_epoch_height`.

Since the contract requires knowing the stake of current validators, we need to augment our runtime to expose that information.
More specifically, we need the following two functions in `near-vm-logic`:

```rust
/// Returns the stake of an account, if the account is currently a validator. Otherwise returns 0.
///
/// # Cost
///
/// For not nul-terminated account id:
/// `base + read_memory_base + read_memory_byte * num_bytes + utf8_decoding_base + utf8_decoding_byte * num_bytes + memory_write_base + memory_write_size * 16`
///
/// For nul-terminated account id :
/// `base + (read_memory_base + read_memory_byte) * num_bytes + utf8_decoding_base + utf8_decoding_byte * num_bytes + memory_write_base + memory_write_size * 16`
pub fn validator_stake(
    &mut self,
    account_len: u64,
    account_ptr: u64,
    stake_ptr: u64,
) -> Result<()>;

/// Returns the total validator stake of the current epoch.
///
/// # Cost
///
/// `base + memory_write_base + memory_write_size * 16`
pub fn validator_total_stake(&mut self, stake_ptr: u64) -> Result<()>;
```

This allows us to know on the smart contract side whether an account id is allowed to vote, how much stake they currently have,
and the total stake in the current epoch, which together are sufficient for calculating the result of voting.

# Drawbacks
[drawbacks]: #drawbacks

TBD

# Rationale and alternatives
[rationale-and-alternatives]: #rationale-and-alternatives

- In the current proposal, we allow the contract to hold a number of polls. This is partly due to the constraint imposed
by the lockup contract that we will deploy in the beginning of mainnet, but it also makes sense from a governance point of
view -- there is a central place for the community to vote on different things, rather than spreading too thin across multiple
different contracts, potentially one per poll. On the other hand, the tradeoff is that this contract might grow too large
if there are a lot of polls going on at the same time.

# Unresolved questions
[unresolved-questions]: #unresolved-questions

- For polls that are already finished, how long should we keep them?
- When the state of the contract is large (a lot of proposals), it is possible that `resolve` will not be able to finish
in one function call due to gas limit.
