# NEAR Protocol Specifications and Standards

[![project chat](https://img.shields.io/badge/zulip-join_chat-brightgreen.svg)](https://near.zulipchat.com/#narrow/stream/320497-nep-standards)
[![CI](https://github.com/near/NEPs/actions/workflows/build.yml/badge.svg)](https://github.com/near/NEPs/actions/workflows/build.yml)

This repository hosts the current NEAR Protocol specification and standards.
This includes the core protocol specification, APIs, contract standards, processes, and workflows.

Changes to the protocol specification and standards are called NEAR Enhancement Proposals (NEPs).

## NEPs

| NEP #                                                             | Title                                                             | Author                                            | Status     |
| ----------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------- | ---------- |
| [0001](https://github.com/near/NEPs/blob/master/neps/nep-0001.md) | NEP Purpose and Guidelines                                        | @jlogelin                                         | Living     |
| [0021](https://github.com/near/NEPs/blob/master/neps/nep-0021.md) | Fungible Token Standard (Deprecated)                              | @evgenykuzyakov                                   | Deprecated |
| [0141](https://github.com/near/NEPs/blob/master/neps/nep-0141.md) | Fungible Token Standard                                           | @evgenykuzyakov @oysterpack, @robert-zaremba      | Final      |
| [0145](https://github.com/near/NEPs/blob/master/neps/nep-0145.md) | Storage Management                                                | @evgenykuzyakov                                   | Final      |
| [0148](https://github.com/near/NEPs/blob/master/neps/nep-0148.md) | Fungible Token Metadata                                           | @robert-zaremba @evgenykuzyakov @oysterpack       | Final      |
| [0171](https://github.com/near/NEPs/blob/master/neps/nep-0171.md) | Non Fungible Token Standard                                       | @mikedotexe @evgenykuzyakov @oysterpack           | Final      |
| [0177](https://github.com/near/NEPs/blob/master/neps/nep-0177.md) | Non Fungible Token Metadata                                       | @chadoh @mikedotexe                               | Final      |
| [0178](https://github.com/near/NEPs/blob/master/neps/nep-0178.md) | Non Fungible Token Approval Management                            | @chadoh @thor314                                  | Final      |
| [0181](https://github.com/near/NEPs/blob/master/neps/nep-0181.md) | Non Fungible Token Enumeration                                    | @chadoh @thor314                                  | Final      |
| [0199](https://github.com/near/NEPs/blob/master/neps/nep-0199.md) | Non Fungible Token Royalties and Payouts                          | @thor314 @mattlockyer                             | Final      |
| [0245](https://github.com/near/NEPs/blob/master/neps/nep-0245.md) | Multi Token Standard                                              | @zcstarr @riqi @jriemann @marcos.sun              | Final      |
| [0264](https://github.com/near/NEPs/blob/master/neps/nep-0264.md) | Promise Gas Weights                                               | @austinabell                                      | Final      |
| [0297](https://github.com/near/NEPs/blob/master/neps/nep-0297.md) | Events Standard                                                   | @telezhnaya                                       | Final      |
| [0330](https://github.com/near/NEPs/blob/master/neps/nep-0330.md) | Source Metadata                                                   | @BenKurrek                                        | Final      |
| [0364](https://github.com/near/NEPs/blob/master/neps/nep-0364.md) | Efficient signature verification and hashing precompile functions | @blasrodri                                        | Final      |
| [0366](https://github.com/near/NEPs/blob/master/neps/nep-0366.md) | Meta Transactions                                                 | @ilblackdragon @e-uleyskiy @fadeevab              | Final      |
| [0393](https://github.com/near/NEPs/blob/master/neps/nep-0393.md) | Sould Bound Token (SBT)                                           | @robert-zaremba                                   | Final      |
| [0399](https://github.com/near/NEPs/blob/master/neps/nep-0399.md) | Flat Storage                                                      | @Longarithm @mzhangmzz                            | Final      |
| [0413](https://github.com/near/NEPs/blob/master/neps/nep-0413.md) | Near Wallet API - support for signMessage method                  | @gagdiez @gutsyphilip                             | Final      |
| [0418](https://github.com/near/NEPs/blob/master/neps/nep-0418.md) | Remove attached_deposit view panic                                | @austinabell                                      | Final      |
| [0448](https://github.com/near/NEPs/blob/master/neps/nep-0448.md) | Zero-balance Accounts                                             | @bowenwang1996                                    | Final      |
| [0452](https://github.com/near/NEPs/blob/master/neps/nep-0452.md) | Linkdrop Standard                                                 | @benkurrek @miyachi                               | Final      |
| [0455](https://github.com/near/NEPs/blob/master/neps/nep-0455.md) | Parameter Compute Costs                                           | @akashin @jakmeier                                | Final      |
| [0488](https://github.com/near/NEPs/blob/master/neps/nep-0488.md) | Host Functions for BLS12-381 Curve Operations                     | @olga24912                                        | Final      |
| [0491](https://github.com/near/NEPs/blob/master/neps/nep-0491.md) | Non-Refundable Storage Staking                                    | @jakmeier                                         | Final      |
| [0492](https://github.com/near/NEPs/blob/master/neps/nep-0492.md) | Restrict creation of Ethereum Addresses                           | @bowenwang1996                                    | Final      |
| [0508](https://github.com/near/NEPs/blob/master/neps/nep-0508.md) | Resharding v2                                                     | @wacban @shreyan-gupta @walnut-the-cat            | Final      |
| [0509](https://github.com/near/NEPs/blob/master/neps/nep-0509.md) | Stateless validation Stage 0                                      | @robin-near @pugachAG @Longarithm @walnut-the-cat | Final      |
| [0514](https://github.com/near/NEPs/blob/master/neps/nep-0514.md) | Fewer Block Producer Seats in `testnet`                           | @nikurt                                           | Final      |
| [0519](https://github.com/near/NEPs/blob/master/neps/nep-0519.md) | Yield Execution                                                   | @akhi3030 @saketh-are                             | Final      |
| [0536](https://github.com/near/NEPs/blob/master/neps/nep-0536.md) | Reduce the number of gas refunds                                  | @evgenykuzyakov @bowenwang1996                    | Final      |
| [0539](https://github.com/near/NEPs/blob/master/neps/nep-0539.md) | Cross-Shard Congestion Control                                    | @wacban @jakmeier                                 | Final      |

## Specification

NEAR Specification is under active development.
Specification defines how any NEAR client should be connecting, producing blocks, reaching consensus, processing state transitions, using runtime APIs, and implementing smart contract standards as well.

## Standards & Processes

Standards refer to various common interfaces and APIs that are used by smart contract developers on top of the NEAR Protocol.
For example, such standards include SDK for Rust, API for fungible tokens or how to manage user's social graph.

Processes include release process for spec, clients or how standards are updated.

### Contributing

#### Expectations

Ideas presented ultimately as NEPs will need to be driven by the author through the process. It's an exciting opportunity with a fair amount of responsibility from the contributor(s). Please put care into the details. NEPs that do not present convincing motivation, demonstrate understanding of the impact of the design, or are disingenuous about the drawbacks or alternatives tend to be poorly received. Again, by the time the NEP makes it to the pull request, it has a clear plan and path forward based on the discussions in the governance forum.

#### Process

Spec changes are ultimately done via pull requests to this repository (formalized process [here](neps/nep-0001.md)). In an effort to keep the pull request clean and readable, please follow these instructions to flesh out an idea.

1. Sign up for the [governance site](https://gov.near.org/) and make a post to the appropriate section. For instance, during the ideation phase of a standard, one might start a new conversation in the [Development » Standards section](https://gov.near.org/c/dev/standards/29) or the [NEP Discussions Forum](https://github.com/near/NEPs/discussions).
2. The forum has comment threading which allows the community and NEAR Collective to ideate, ask questions, wrestle with approaches, etc. If more immediate responses are desired, consider bringing the conversation to [Zulip](https://near.zulipchat.com/#narrow/stream/320497-nep-standards).
3. When the governance conversations have reached a point where a clear plan is evident, create a pull request, using the instructions below.

   - Clone this repository and create a branch with "my-feature".
   - Update relevant content in the current specification that are affected by the proposal.
   - Create a Pull request, using [nep-0000-template.md](nep-0000-template.md) to describe motivation and details of the new Contract or Protocol specification. In the document header, ensure the `Status` is marked as `Draft`, and any relevant discussion links are added to the `DiscussionsTo` section.
     Use the pull request number padded with zeroes. For instance, the pull request `219` should be created as `neps/nep-0219.md`.
   - Add your Draft standard to the `NEPs` section of this README.md. This helps advertise your standard via github.
   - Update Docusaurus documentation under the `specs/Standards` to describe the contract standard at a high level, how to integrate it into a Dapp, and a link to the standard document (ie. `neps/nep-0123.md`). This helps advertise your standard via [nomicon](https://nomicon.io/). Any related nomicon sections should be prefixed and styled using the following snippet:

   ```text
   :::caution
   This is part of proposed spec [NEP-123](https://github.com/near/NEPs/blob/master/neps/nep-0123.md) and subject to change.
   :::
   ```

   - Once complete, submit the pull request for editor review.

   - The formalization dance begins:
     - NEP Editors, who are unopinionated shepherds of the process, check document formatting, completeness and adherence to [NEP-0001](neps/nep-0001.md) and approve the pull request.
     - Once ready, the author updates the NEP status to `Review` allowing further community participation, to address any gaps or clarifications, normally part of the Review PR.
     - NEP Editors mark the NEP as `Last Call`, allowing a 14 day grace period for any final community feedback. Any unresolved show stoppers roll the state back to `Review`.
     - NEP Editors mark the NEP as `Final`, marking the standard as complete. The standard should only be updated to correct errata and add non-normative clarifications.

Tip: build consensus and integrate feedback. NEPs that have broad support are much more likely to make progress than those that don't receive any comments. Feel free to reach out to the NEP assignee in particular to get help identify stakeholders and obstacles.

### Running Docusaurus

This repository uses [Docusaurus](https://docusaurus.io/) for the [Nomicon website](https://nomicon.io).

1. Move into the `/website` folder where you will run the following commands:

   - Make sure all the dependencies for the website are installed:

     ```sh
     # Install dependencies
     yarn
     ```

   - Run the local docs development server

     ```sh
     # Start the site
     yarn start
     ```

     _Expected Output_

     ```sh
     # Website with live reload is started
     Docusaurus server started on port 3000
     ```

     The website for docs will open your browser locally to port `3000`

2. Make changes to the docs

3. Observe those changes reflected in the local docs

4. Submit a pull request with your changes
