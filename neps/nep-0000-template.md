---
NEP: 0 XXX
Title: Cross-Shard Congestion Control
Authors: Waclaw Banasik <waclaw@near.org>, Jakob Meier <inbox@jakobmeier.ch>
Status: New
DiscussionsTo: https://github.com/nearprotocol/neps/pull/0000 XXX
Type: Protocol
Version: 1.0.0
Created: 2024-03-21
LastUpdated: 2024-03-21
---

## Summary

We propose to limit the outgoing receipts included in each chunk. Limits should
be applied per receiving shard. Above the limit, shards should stop accepting
more transactions and hold back already produced receipts before forwarding it
to the receiving shard.


## Motivation

We want to guarantee the Near Protocol blockchain operates stable even during
congestion.

Today, when users sends transactions at a higher rate than the network can
process them, receipts accumulate without limits. This leads to unlimited memory
consumption on chunk producer's and validator's machines. Furthermore, the delay
for a transaction from when it is accepted to when it finishes execution becomes
larger and larger, as the receipts need to queue behind those already in the
system.

First attempts to limit the memory consumption have been added without protocol
changes. Namely:

- Limit the transaction pool to 100 MB.
  https://github.com/near/nearcore/pull/9172
- Once we have accumulated more than 20k delayed receipts in a shard,
  chunk-producers for that shard stop accepting more transactions.
  https://github.com/near/nearcore/pull/9222

But this does not put any limits on what shards will accept for other shards.
For example, when a particular contract is popular, the contract's shard will
eventually stop accepting new transactions but all other shards keep accepting
more and more transactions that produce receipts for the popular contract.
Therefore the number of delayed receipts keeps growing indefinitely.

Cross-shard congestion control addresses this issue by stopping new transaction
at the source and delaying receipt forwarding when the receiving shard has
reached its memory limit.

## Specification


### Data changes

To implement cross-shard congestion control we change the chunk output to include:

- A list of outgoing receipts that have been produced but are not ready to be forwarded yet.
- Congestion information about the shard.

The block producer must then gather the congestion information from each shard
and include it in the block header, so that chunk producers can base their
decisions to include new transactions and forward produced receipts based on it.

TODO: New fields in code (here or in reference impl)

### Changes to transaction selection

Today, transactions are taken from the chunk producer's pool until `tx_limit` is
reached, where `tx_limit` is computed as follow.

```python
# old
tx_limit = 500 Tgas if len(delayed_receipts) < 20_000 else 0
```

We update the formula for the tx_limit to depend on the `congestion_level`
computed in the previous shard variable (between 0 and 1):

```python
# new
tx_limit = mix(
  500 Tgas,
  5 Tgas,
  min(
    incoming_congestion_level,
    outgoing_congestion_level
  )
) 
```

Additionally, we always reject transactions if the incoming congestion level of the
receiving shard is above 0.5.

### Changes to chunk execution

The new chunk execution follows this order.

1. Compute bandwidth limits to other shards based on the congestion information.
   The formula is:
    ```python
        # linear interpolation based on congestion_level
        outgoing_gas_limit = mix(30 Pgas, 0 Pgas, incoming_congestion_level)
    ```
2. Take as many receipts as possible from the outgoing buffer while staying
   below the `outgoing_gas_limit` per receiving shard. Add the removed receipts
   to the outgoing receipts of the new chunk.
3. Convert all transactions to receipts that were included in the chunk.
    - Local receipts, which are receipts where the sender account id is equal to
      the receiver id, are set aside as local receipts for step 4.
    - Non-local receipts up to `outgoing_gas_limit` for the respective shard go
      to the outgoing receipts list of the chunk.
    - Non-local receipts above `outgoing_gas_limit` for the respective shard go
      to the outgoing receipts buffer.
4. Execute receipts in the order of `local`, `delayed`, `incoming`.
    - Don't stop before all receipts are executed or more than 1000 Tgas have
      been burnt. Burnt gas includes the burnt gas from step 3.
    - Outgoing receipts up to what is left in `outgoing_gas_limit` per shard
      after step 3 go to the outgoing receipts list of the chunk. Above that,
      outgoing receipts go to the outgoing buffer.
5. Any remaining local or incoming receipts are added to the end of the
   `delayed` receipts queue.
6. Compute own congestion information for the next block. The congestion level
   depends on how much memory we currently use to store receipts and on how much
   gas is present in the delayed receipts.:
    ```python
    gas_backlog = sum([receipt.gas() for receipt in delayed_receipts_queue])

    memory_consumption = 0
    memory_consumption += sum([receipt.size() for receipt in delayed_receipts_queue])
    memory_consumption += sum([receipt.size() for receipt in postponed_receipts_queue])
    memory_consumption += sum([receipt.size() for receipt in outgoing_receipts_buffer])

    incoming_congestion_level = gas_backlog / 100 Pgas
    incoming_congestion_level = min(1.0, incoming_congestion_level)
  
    outgoing_congestion_level = memory_consumption / 500 MB
    outgoing_congestion_level = min(1.0, outgoing_congestion_level)
    ```

TODO: define receipt.gas() (The relevant gas value of a receipt is `attached_gas` + `exec_gas`.)
TODO: define receipt.size() (borsh)
TODO: define congestion_level format (maybe u8 interpreted as fraction?)


## Reference Implementation

TODO

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

TODO (Discussion is still ongoing)

[Explain any alternative designs that were considered and the rationale for not choosing them. Why your design is superior?]

## Future possibilities

TODO

[Describe any natural extensions and evolutions to the NEP proposal, and how they would impact the project. Use this section as a tool to help fully consider all possible interactions with the project in your proposal. This is also a good place to "dump ideas"; if they are out of scope for the NEP but otherwise related. Note that having something written down in the future-possibilities section is not a reason to accept the current or a future NEP. Such notes should be in the section on motivation or rationale in this or subsequent NEPs. The section merely provides additional information.]

## Consequences

TODO

[This section describes the consequences, after applying the decision. All consequences should be summarized here, not just the "positive" ones. Record any concerns raised throughout the NEP discussion.]

### Positive

* p1

### Neutral

* n1

### Negative

* n1

### Backwards Compatibility

TODO

[All NEPs that introduce backwards incompatibilities must include a section describing these incompatibilities and their severity. Author must explain a proposes to deal with these incompatibilities. Submissions without a sufficient backwards compatibility treatise may be rejected outright.]

## Unresolved Issues (Optional)

TODO

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
