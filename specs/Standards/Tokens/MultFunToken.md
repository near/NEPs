# Multi Fungible-Token Contract ([NEP-xxx](https://github.com/nearprotocol/NEPs/pull/xxx))

Version `0.1.0`

## Summary
[summary]: #summary

A standard interface for a contract handling multiple fungible tokens.

## Changelog

### `0.0.1`

- Initial Proposal

## Motivation
[motivation]: #motivation

Coding the diversifying-staking-pool I can see that because the combination of sharding and cross-contract calls mechanism (async, no 2PC) there are reasons to code multiple tokens in the same contract instead of the stanadrd in Ethereum of a contract per token

Prior art:
- TBD

## Guide-level explanation
[guide-level-explanation]: #guide-level-explanation

A contract implementing this standard would allow users to:
- Create a new Fungible Token to be served from deployed this contract.<br>
- It will eas up the creation of fungible tokens, reusing audited stable code.

To satisfy this NEP the contract must implement several methods: 

1. `get_symbols() -> Vec<string>` returning an array of all Token symbols this contract handles


## Reference-level explanation
[reference-level-explanation]: #reference-level-explanation

### Reference Implementations:
#### Rust:
```rust
```

####  ts/pseudocode:
```typescript
```

## Drawbacks
[drawbacks]: #drawbacks

TBD 

## Unresolved questions
[unresolved-questions]: #unresolved-questions

TBD

## Future possibilities
[future-possibilities]: #future-possibilities

* Automated swap mechanisms. Since several tokens are served from the same contract, a standard liq.pool/swap mechanism can be coded for any combination of the serverd tokens.

