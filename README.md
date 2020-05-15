# NEAR Protocol Specifications and Standards

This repository hosts the current NEAR Protocol specification and standards.
Including core protocol specification, APIs, contract standards, processes and workflows.

Both changes to the core specification and standards are called Near Enhancement Proposals (NEPs).

## Specification

NEAR Specification is under active development. Latest version can be found - https://nomicon.io
Specification defines how any NEAR client should be connecting, producing blocks, reaching consensus, processing state transitions and runtime APIs.

### Contributing

Spec changes are done via PRs to this repository.

* Clone this repository and create a branch with "my-feature".
* Update relevant places in the specification with proposal.
* Create PR, where information of the PR follows 0000-template.md to describe motivation and details of the change to the protocol.
* Receive feedback from the community and revise as suggested.
* Post pre-approval of the spec change, present a PR for NEAR Protocol client(s) that implements this specification change.
* Receive final approval and merge change into the `master` to be included in the next specification release.

## Standards & Processes

Standards refer to various common interfaces and APIs that are used by smart contract developers on top of the NEAR Protocol.
For example, such standards include SDK for Rust, API for fungible tokens or how to manage user's social graph.

Processes include release process for spec, clients or how standards are updated.

### Contributing

* Copy `0000-template.md` to `text/0000-my-feature.md` (where "my-feature" is descriptive. don't assign an NEP number yet).
* If applicable, link to the issued in specific repositories;
* Fill in the NEP. Put care into the details: NEPs that do not present convincing motivation, demonstrate understanding of the impact of the design, or are disingenuous about the drawbacks or alternatives tend to be poorly received.
* Submit a pull request. As a pull request the NEP will receive design feedback from the larger community, and the author should be prepared to revise it in response.
* Build consensus and integrate feedback. NEPs that have broad support are much more likely to make progress than those that don't receive any comments. Feel free to reach out to the NEP assignee in particular to get help identifying stakeholders and obstacles.
