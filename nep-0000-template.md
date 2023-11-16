---
NEP: 0
Title: NEP Template
Authors: Todd Codrington III <satoshi@fakenews.org>
Status: Approved
DiscussionsTo: https://github.com/nearprotocol/neps/pull/0000
Type: Developer Tools
Version: 1.1.0
Created: 2022-03-03
LastUpdated: 2023-03-07
---

[This is a NEP (NEAR Enhancement Proposal) template, as described in [NEP-0001](https://github.com/near/NEPs/blob/master/neps/nep-0001.md). Use this when creating a new NEP. The author should delete or replace all the comments or commented brackets when merging their NEP.]

<!-- NEP Header Preamble

Each NEP must begin with an RFC 822 style header preamble. The headers must appear in the following order:

NEP: The NEP title in no more than 4-5 words.

Title: NEP title

Author: List of author name(s) and optional contact info. Examples FirstName LastName <satoshi@fakenews.org>, FirstName LastName (@GitHubUserName)>

Status: The NEP status -- New | Approved | Deprecated.

DiscussionsTo (Optional): URL of current canonical discussion thread, e.g. GitHub Pull Request link.

Type: The NEP type -- Protocol | Contract Standard | Wallet Standard | DevTools Standard.

Requires (Optional): NEPs may have a Requires header, indicating the NEP numbers that this NEP depends on.

Replaces (Optional): A newer NEP marked with a SupercededBy header must have a Replaces header containing the number of the NEP that it rendered obsolete.

SupersededBy (Optional): NEPs may also have a SupersededBy header indicating that a NEP has been rendered obsolete by a later document; the value is the number of the NEP that replaces the current document.

Version: The version number. A new NEP should start with 1.0.0, and future NEP Extensions must follow Semantic Versioning.

Created: The Created header records the date that the NEP was assigned a number, should be in ISO 8601 yyyy-mm-dd format, e.g. 2022-12-31.

LastUpdated: The Created header records the date that the NEP was assigned a number, should be in ISO 8601 yyyy-mm-dd format, e.g. 2022-12-31.

See example above -->

## Summary

[Provide a short human-readable (~200 words) description of the proposal. A reader should get from this section a high-level understanding about the issue this NEP is addressing.]

## Motivation

[Explain why this proposal is necessary, how it will benefit the NEAR protocol or community, and what problems it solves. Also describe why the existing protocol specification is inadequate to address the problem that this NEP solves, and what potential use cases or outcomes.]

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
