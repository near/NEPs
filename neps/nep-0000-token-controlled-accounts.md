---
NEP: 0
Title: Token-Controlled Accounts
Authors: @Nebulaz7
Status: Draft
DiscussionsTo: https://github.com/near/NEPs/discussions/668
Type: Standards Track
Category: Contract
Version: 1.0.0
Created: 2026-11-14
Requires: 171, 297
---

## Summary

This NEP extends NEP-171 so that an NFT can be the **title** to an AI agent's account. A token may be bound to one NEAR account (the "agent account"). The agent account only obeys the current owner of the token, and re-checks that ownership on every authority decision. Three mechanisms make this safe under NEAR's asynchronous execution:

1. a monotonic **owner epoch** that increases on every change of owner, including a rollback of `nft_transfer_call`,
2. a binding that is **cleared** on every change of owner, so a new owner has to bind explicitly, and
3. a **fail-closed settlement rule**: an agent account must re-check the epoch before completing any operation it started under an older epoch.

Tokens that implement this extension remain valid NEP-171 tokens. Existing wallets and marketplaces keep working.

## Motivation

An AI agent that holds funds is only as tradeable as its control is transferable. When an NFT represents such an agent, a sale must move control to the buyer and cut it off from the seller, in the same step, on a chain where cross-contract calls are asynchronous and `nft_transfer_call` can roll back.

NEP-171 and NEP-177 define ownership and display metadata. They say nothing about:

1. which account an agent acts through, and who may bind or change it,
2. what happens to that binding when the token is sold, or when a transfer is rolled back,
3. what an agent account must do if ownership changes while one of its operations is in flight,
4. whether a marketplace approval (NEP-178) can touch agent control.

Without one answer to these questions, each project invents its own, and buyers, marketplaces and custodians cannot rely on any of them.

To our knowledge there is no accepted NEP for this. We searched the `near/NEPs` repository for "agent" and found no agent-ownership NEP. That search was lexical, not exhaustive, and ecosystem registries for agent identity exist, so this proposal does not claim that nothing similar is built, only that nothing is standardized.

### Related work

- **ERC-8004 (Ethereum)** identifies agents with ERC-721 tokens and reserves an `agentWallet` entry. Changing it requires proof of control (EIP-712 or ERC-1271), and implementations clear it on token transfer so that payments do not keep flowing to the previous owner. The "clear on transfer" idea comes from there. This NEP adds the NEAR-specific parts: epochs, rollback behavior and fail-closed settlement under asynchronous calls.
- **ERC-7857 (Ethereum)** standardizes AI-agent NFTs whose metadata is private, with TEE or ZKP proofs for re-encrypting data on transfer. It does not inherit ERC-721. It addresses private metadata transfer and not control of a wallet. Check its header for current status when citing it.
- **ERC-6551 (Ethereum)** defines token-bound accounts, the closest analogue to a token that owns an account.
- **BAP-578 (BNB Chain)** proposes a non-fungible-agent token with memory commitments.
- **NEP-393 (NEAR, Final)** covers soulbound tokens whose transfers are constrained and coordinated with a registry. It is the nearest NEAR precedent for restricting what a transfer does to token state.
- **NEP-330 (NEAR, Final)** standardizes `contract_source_metadata` for verifying deployed contract code. This NEP uses it, and does not replace it (see "Advertising the standard").

## Specification

The key words MUST, MUST NOT, SHOULD and MAY are as in RFC 2119.

A contract implementing this NEP (a "title contract") MUST implement NEP-171 and MUST emit events following NEP-297. It MUST NOT change the behavior or return values of any NEP-171 or NEP-178 method it implements, except for the agent-state side effects defined here.

### Terms

- **Title contract**: the NEP-171 contract that holds the tokens.
- **Agent account**: a NEAR account bound to a token. It is typically a contract.
- **Owner epoch**: an unsigned 64-bit counter kept per token.

### Data

```rust
pub struct AgentInfo {
    pub token_id: TokenId,
    /// Current owner, as in nft_token. Included so one call is enough.
    pub owner_id: AccountId,
    /// Starts at 0 when the agent record is created. Increases by exactly 1
    /// on every change of owner_id. Never decreases.
    pub owner_epoch: u64,
    /// The bound agent account, or None if unbound.
    pub agent_account: Option<AccountId>,
    /// Owner-set flag. See "Pause".
    pub paused: bool,
}
```

How a token receives an agent record at mint time is left to the contract. NEP-171 deliberately does not standardize minting, and neither does this NEP. A token without a record is an ordinary NFT.

### Title contract methods

```rust
pub trait AgentTitle {
    /// View. None if the token has no agent record.
    fn agent_info(&self, token_id: TokenId) -> Option<AgentInfo>;

    /// View. The current owner epoch, or None if there is no record.
    fn agent_epoch(&self, token_id: TokenId) -> Option<u64>;

    /// View. True iff an agent account is bound and the token is not paused.
    fn agent_is_operational(&self, token_id: TokenId) -> bool;

    /// Owner only. Binds an agent account. Panics if expected_epoch differs from
    /// the current owner epoch. Replaces any existing binding. Emits `agent_bound`.
    /// MUST require an attached deposit of exactly 1 yoctoNEAR.
    fn agent_bind(
        &mut self,
        token_id: TokenId,
        agent_account: AccountId,
        expected_epoch: u64,
    );

    /// Owner only. Same epoch and deposit rules as agent_bind. Emits `agent_paused`.
    fn agent_set_paused(&mut self, token_id: TokenId, paused: bool, expected_epoch: u64);
}
```

Rules for the mutating methods:

1. The caller (`predecessor_account_id`) MUST be the current `owner_id`. An account holding a NEP-178 approval MUST NOT be able to call any `agent_*` method on the owner's behalf. A marketplace approval must never become control of an agent.
2. They MUST require exactly 1 yoctoNEAR, so that a limited function-call key (for example an operator key) cannot call them, as with NEP-171 transfers.
3. They MUST reject a call whose `expected_epoch` is not equal to the current `owner_epoch`.
4. `agent_account` is a NEAR `AccountId`, which has a bounded length. The contract MUST NOT store other caller-supplied unbounded data and MUST charge or reserve storage for what it stores.

### Transfer rules

When `owner_id` of a token with an agent record changes, by `nft_transfer`, `nft_transfer_call`, an approved transfer, or a rollback, the contract MUST in the same state change:

1. increase `owner_epoch` by exactly 1,
2. set `agent_account` to `None`,
3. set `paused` to `false`, and
4. emit `agent_owner_changed`.

`paused` is reset because the binding is already cleared, so the agent is inoperative until the new owner acts, and a hidden pause flag would only surprise the buyer.

**`nft_transfer_call`.** While a call is in progress the receiver is the owner and the epoch has already increased. The receiver MAY call `agent_bind`. If `nft_resolve_transfer` returns the token to the sender, the contract MUST count that as another change of owner: increase the epoch again, clear any binding made during the window, and emit `agent_owner_changed`. The epoch is never reused.

**Burning.** Burning a token MUST delete its record. A title contract MUST NOT reuse a `token_id` after it was burned, because that would restart the epoch.

### Agent account obligations

The following rules are what make control enforceable, not advisory. An agent account that claims to implement this NEP MUST:

1. **Expose its authority.** Provide a view `agent_authority() -> Option<{ title_contract: AccountId, token_id: TokenId }>`, so anyone can check that the binding is two-way: the title contract names this account in `agent_info`, and this account names that title and token.
2. **Re-read the title on every authority decision.** For every operation that moves value, signs data or changes its own policy, read `agent_info` from the title contract at that time. It MUST NOT cache the owner. It MUST check that the caller equals `owner_id`, that `agent_account` equals itself, and that `paused` is false.
3. **Record the epoch.** Store the `owner_epoch` seen at step 2 with the pending operation.
4. **Fail closed at settlement.** Before completing the operation (in the callback that releases funds, or at the point it takes effect), re-read `agent_epoch`. If it differs from the recorded epoch, or the binding no longer points at this account, the account MUST abort and keep the funds. It MUST NOT complete an operation that started under an older epoch.
5. **Limit in-flight work.** Allow at most one pending value-moving operation per agent, or track the epoch of every pending operation separately.
6. **Not be bypassable.** The agent account MUST NOT have full-access keys, or a contract-upgrade path, that anyone other than the title-derived authority can use. Otherwise a previous owner can sidestep the title.

Effects that already left the agent account before settlement (for example a call to another contract, or a signature already released to another chain) cannot be undone by this rule. Implementations SHOULD therefore keep value-moving effects inside the settlement step.

### Events

All events use NEP-297 with `standard` set to `"nepXXXX"` and `version` set to `"1.0.0"`. As in NEP-171, `data` is an array.

| event | data element |
| --- | --- |
| `agent_owner_changed` | `{ "token_id", "old_owner_id", "new_owner_id", "owner_epoch", "cleared_agent_account"? }` |
| `agent_bound` | `{ "token_id", "owner_epoch", "agent_account" }` |
| `agent_paused` | `{ "token_id", "owner_epoch", "paused" }` |

```json
EVENT_JSON:{"standard":"nepXXXX","version":"1.0.0","event":"agent_owner_changed","data":[{"token_id":"7","old_owner_id":"alice.near","new_owner_id":"bob.near","owner_epoch":3,"cleared_agent_account":"agent7.alice.near"}]}
```

### Advertising the standard

A title contract SHOULD list `{ "standard": "nepXXXX", "version": "1.0.0" }` in the `standards` field of its NEP-330 `contract_source_metadata`, and SHOULD publish reproducible build information there. NEP-330 identifies the **code of the contract**. It says nothing about an agent's own software, and this NEP does not define any hash of that software.

### Marketplace guidance (non-normative)

Marketplaces SHOULD read `owner_epoch` when a token is listed and again at purchase, and SHOULD abort the sale if it changed. A buyer then knows no ownership change or rollback happened in between.

### Test vectors

Implementations should pass at least these scenarios:

| # | Scenario | Expected |
| --- | --- | --- |
| 1 | Mint, bind, read `agent_info` | epoch 0, `agent_account` set |
| 2 | `nft_transfer` to a new owner | epoch 1, `agent_account` None, `paused` false, one `agent_owner_changed` |
| 3 | Old owner calls `agent_bind` | panics (not owner) |
| 4 | New owner calls `agent_bind` with `expected_epoch` 0 | panics (stale epoch) |
| 5 | Approved marketplace account calls `agent_bind` | panics (approval does not authorize) |
| 6 | `nft_transfer_call` whose receiver binds, then the call fails and rolls back | epoch increases twice in total, binding cleared, token back with sender |
| 7 | `agent_bind` with no attached yocto, or called with a function-call key | panics |
| 8 | Agent account starts a withdrawal, the token transfers before settlement | withdrawal aborts, funds stay in the agent account |
| 9 | Agent account called by a previous owner after a sale | rejected at the authority check |
| 10 | Burn, then mint with the same `token_id` | second mint is rejected |

## Reference Implementation

A Rust implementation with tests for the scenarios above lives at
<https://github.com/Nebulaz7/Nivry>, deployed on NEAR testnet from commit
`b083020`:

| contract | account |
| --- | --- |
| title contract (registry) | `nivry.testnet` |
| agent account, token 1 | `00000001.nivry.testnet` |
| agent account, token 2 | `00000002.nivry.testnet` |

The agent account is deployed from WASM embedded in the title contract at compile
time, with code hash
`ce3b675e2b3d9ab5a11d8840f0e1cd48471438f6a418ddc3bafce21fca4d8e5e`. The
provisioning batch contains no `add_full_access_key` action, so the agent account
has no keys by construction rather than by policy.

The repository also contains a CLI and a frontend. They are not part of the
standard. The implementation predates this draft and its method and field names
are still being aligned with the text above; see Unresolved Issues.

## Security Implications

1. **Copies cannot be revoked.** A previous owner may keep a copy of the agent's prompts, skills and data. The standard removes the copy's access to the agent account, not its code. Do not describe this as "un-copying" the agent.
2. **Off-chain keys are outside the standard.** If a runtime holds a key that can act without going through the agent account, a sale does not revoke it. Only the agent account's rules in this NEP are enforced by the chain. Custody providers, TEEs and hardware attestations are each their own trust assumption and should be named and not described as trustless.
3. **Time-of-check to time-of-use.** NEAR calls are asynchronous, so ownership can change between an authority check and a settlement. The epoch, the fail-closed rule and the one-pending-operation rule address this for effects inside the agent account. Effects that already left it cannot be reversed.
4. **Rollback.** `nft_transfer_call` can return a token to its sender. Treating the rollback as a change of owner (epoch up, binding cleared) removes any window in which a stale binding could be used.
5. **Approvals.** NEP-178 approvals are broad by design. This NEP excludes them from every `agent_*` method so that listing an agent on a marketplace does not grant control.
6. **Last-minute changes.** An owner could rebind or pause just before a sale. `expected_epoch` guards against stale calls only. Marketplaces should compare the epoch at listing and at purchase, and may also compare `agent_info`.
7. **Operator keys.** `agent_bind` and `agent_set_paused` need 1 yoctoNEAR, so they cannot be called with a function-call key. An operator key limited to the agent account's methods cannot change the binding.
8. **Bypassable agent accounts.** An agent account with a full-access key held by the previous owner defeats the standard. Obligation 6 forbids this, and NEP-330 build information lets a buyer verify the deployed code. Buyers should check the account's keys, not only its code.
9. **Storage.** Agent records use storage that the contract must pay for through NEAR's storage staking. The contract MUST NOT accept unbounded caller-supplied data.
10. **Event spoofing.** Any contract can emit events with this `standard` string. Indexers should only trust events from title contracts they have verified, for example through NEP-330 metadata.

11. **Public history is permanent.** Everything the title contract and the agent account emit is public, and a transfer cannot retract it. NEP-297 events already consumed by indexers stay visible, and the lifetime agent account keeps that trail on purpose, so a sale hands over control of the account going forward, not privacy about its past. Title ownership is not a confidentiality boundary. Memory, sessions, logs and keys live off chain, outside this standard, and whoever operates the runtime must authorize access to them separately. Implementations MUST NOT put confidential data in events, manifest fields or any other on-chain state.

## Alternatives

- **Advisory record only.** A title contract that stores a binding and a view, and relies on custodians to look at it. Rejected. This puts the trust in every custodian, and it is the trust model this NEP is meant to remove.
- **Stand-alone agent standard without NEP-171.** Rejected. Wallets, explorers and marketplaces would not recognize the tokens.
- **Agent state inside NEP-177 metadata.** Rejected. Metadata is descriptive and loosely typed. Control needs specified methods, rules and events.
- **Bind with no epoch, rely on ownership checks alone.** Rejected. It cannot detect an owner change or rollback that happens between a check and its settlement.
- **Keep the binding across transfers.** Rejected as the default, for safety. See Unresolved Issues.

## Future possibilities

- A commitment to the agent's software or skills (a "genome" hash with a version counter), kept separate from NEP-330's contract-code metadata.
- Encrypted or private agent data that moves with the token, in the spirit of ERC-7857.
- A standard commitment to an agent's interaction history, as in BAP-578.
- Payments and reputation standards. They are deliberately left out of this NEP, because an on-chain total that anyone can inflate does not belong in a control standard.
- Operator authorization without a transfer (rental).

## Consequences

### Positive

- A sale moves control of an agent account to the buyer and cuts off the seller, with rules that hold under asynchronous calls and rollbacks.
- Marketplaces, custodians and indexers can rely on one interface.
- Existing NFT tooling keeps working.

### Neutral

- Contracts store a small extra record per token.
- Agent accounts take on extra obligations (re-read, record epoch, fail closed).

### Negative

- The standard cannot revoke off-chain copies or keys that never pass through the agent account.
- A rolled-back `nft_transfer_call` costs the sender a rebind, because the binding is cleared again.
- Every authority decision in an agent account needs a cross-contract read, which costs gas and latency.

### Backwards Compatibility

This extension adds methods and events and does not change NEP-171 or NEP-178 behavior. Existing NEP-171 contracts are unaffected. Tokens without an agent record behave as ordinary NFTs. Existing tokens cannot adopt the extension without a migration that creates records for them.

## Unresolved Issues

- Whether a binding may survive a transfer when the agent account and the title contract are built to hand over control together, instead of clearing and rebinding.
- How to describe agent accounts that hold keys for other chains through Chain Signatures.
- Whether to allow an owner-approved operator account for the mutating methods.
- Final names for methods, views and the event standard.
- Whether to require `agent_authority` on the agent account, or leave the two-way check to indexers.
- Reconciling the reference implementation's current names (`authority_epoch`, `frozen`, `treasury_account_id`) with the names used in this draft.

## Changelog

Leave blank for the initial draft.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
