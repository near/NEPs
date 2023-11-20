---
NEP: 519
Title: Yield Execution
Authors: Akhi Singhania <akhi3030@gmail.com>
Status: Draft
DiscussionsTo: https://github.com/near/NEPs/pull/519
Type: Protocol
Version: 0.0.0
Created: 2023-11-17
LastUpdated: 2023-11-20
---

## Summary

Today, when a smart contract is called by a user or another contract, it has no sensible way to delay responding to the caller.  There exist use cases where contracts would benefit from being able to delay responding till some arbitrary time in the future.  This proposal introduces such possibility into the NEAR protocol.

## Motivation

There exist some situations where when a smart contract on NEAR is called, it will only be able to provide an answer at some arbitrary time in the future.  So the callee needs a way to defer replying to the caller till this time in future.

Examples include when a smart contract (`S`) provides MPC signing capabilities parties external to the NEAR protocol are computing the signature.  The rough steps are:
1. Signer contract provides a function `fn sign_payload(Payload, ...)`.
2. When called, the contract updates some contract state which is being monitored by external indexers to indicate that a new signing request has been received.  It also defers replying to the caller.
3. The indexers observe the new signing request, they compute a signature and call another function `fn signature_available(Signature, ...)` on the signer contract.
4. The signer contract validates the signature and if validate, replies to the original caller.

Today, the NEAR protocol has no sensible way to defer replying to the caller in step 2 above.  This proposal proposes adding two following new host functions to the NEAR protocol:

- `yield`: this can be called by a contract to indicate to the protocol that it is not ready yet to reply to its caller.
- `resume`: a contract can use this mechanism to indicate to a protocol that it is now ready to reply to a caller that it had deferred earlier.

If these two host functions were available, then `yield` would be used in step 2 above and `resume` would be used in step 4 above.

## Specification

[Explain the proposal as if you were teaching it to another developer. This generally means describing the syntax and semantics, naming new concepts, and providing clear examples. The specification needs to include sufficient detail to allow interoperable implementations getting built by following only the provided specification. In cases where it is infeasible to specify all implementation details upfront, broadly describe what they are.]

## Reference Implementation

[This technical section is required for Protocol proposals but optional for other categories. A draft implementation should demonstrate a minimal implementation that assists in understanding or implementing this proposal. Explain the design in sufficient detail that:

* Its interaction with other features is clear.
* Where possible, include a Minimum Viable Interface subsection expressing the required behavior and types in a target programming language. (ie. traits and structs for rust, interfaces and classes for javascript, function signatures and structs for c, etc.)
* It is reasonably clear how the feature would be implemented.
* Corner cases are dissected by example.
* For protocol changes: A link to a draft PR on nearcore that shows how it can be integrated in the current code. It should at least solve the key technical challenges.

The section should return to the examples given in the previous section, and explain more fully how the detailed proposal makes those examples work.]

## Security Implications

[Explicitly outline any security concerns in relation to the NEP, and potential ways to resolve or mitigate them. At the very least, well-known relevant threats must be covered, e.g. person-in-the-middle, double-spend, XSS, CSRF, etc.]

## Alternatives

[Explain any alternative designs that were considered and the rationale for not choosing them. Why your design is superior?]

## Future possibilities

[Describe any natural extensions and evolutions to the NEP proposal, and how they would impact the project. Use this section as a tool to help fully consider all possible interactions with the project in your proposal. This is also a good place to "dump ideas"; if they are out of scope for the NEP but otherwise related. Note that having something written down in the future-possibilities section is not a reason to accept the current or a future NEP. Such notes should be in the section on motivation or rationale in this or subsequent NEPs. The section merely provides additional information.]

## Consequences

[This section describes the consequences, after applying the decision. All consequences should be summarized here, not just the "positive" ones. Record any concerns raised throughout the NEP discussion.]

### Positive

* p1

### Neutral

* n1

### Negative

* n1

### Backwards Compatibility

[All NEPs that introduce backwards incompatibilities must include a section describing these incompatibilities and their severity. Author must explain a proposes to deal with these incompatibilities. Submissions without a sufficient backwards compatibility treatise may be rejected outright.]

## Unresolved Issues (Optional)

[Explain any issues that warrant further discussion. Considerations

* What parts of the design do you expect to resolve through the NEP process before this gets merged?
* What parts of the design do you expect to resolve through the implementation of this feature before stabilization?
* What related issues do you consider out of scope for this NEP that could be addressed in the future independently of the solution that comes out of this NEP?]

## Changelog

[The changelog section provides historical context for how the NEP developed over time. Initial NEP submission should start with version 1.0.0, and all subsequent NEP extensions must follow [Semantic Versioning](https://semver.org/). Every version should have the benefits and concerns raised during the review. The author does not need to fill out this section for the initial draft. Instead, the assigned reviewers (Subject Matter Experts) should create the first version during the first technical review. After the final public call, the author should then finalize the last version of the decision context.]

### 1.0.0 - Initial Version

> Placeholder for the context about when and who approved this NEP version.

#### Benefits

> List of benefits filled by the Subject Matter Experts while reviewing this version:

* Benefit 1
* Benefit 2

#### Concerns

> Template for Subject Matter Experts review for this version:
> Status: New | Ongoing | Resolved

|   # | Concern | Resolution | Status |
| --: | :------ | :--------- | -----: |
|   1 |         |            |        |
|   2 |         |            |        |

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
