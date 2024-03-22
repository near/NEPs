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

We propose to limit the outgoing receipts included in each chunk. Limits depend
on the congestion level of that receiving shard and are to be enforced by the
protocol.

As the first line of defense, shards must stop accepting more transactions to
generally congested shards, where general congestion is measured as the memory
consumption for receipts stored in any queue or buffer.

As the second line of defense, shards must hold back already produced receipts
before forwarding them when the receiving shard experiences incoming congestion.
The incoming congestion is measured by the amount of gas attached to receipts in
delayed queue of the receiving shard.

This proposal replaces the local congestion control rules already in place.

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
changes. This is known as "local congestion control" and can be summarized in
two rules:

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

Cross-shard congestion control addresses this issue by stopping new transactions
at the source and delaying receipt forwarding when the receiving shard has
reached its memory limit.

## Specification

The proposal adds fields to chunks headers, it adds a trie columns, it changes
the rules to select transactions, and it changes the chunk execution flow. The
next four sections specifies each of these changes in more details.

### Chunk header changes

We change the chunk header to include congestion information.
Specifically, we include two indicators.

```rust
ShardChunkHeaderInnerV3 {
  // ...all field from ShardChunkHeaderInnerV2
  incoming_congestion: u16
  general_congestion: u16
}
```

This adds 4 bytes to the chunk header, increasing it from 374 bytes to 378
bytes in borsh representation. (Assuming no validator proposals included.)
This in turn increases the block size by 4 bytes per shard.

While the numbers are stored as `u16`,for the remainder of the NEP
specification, `incoming_congestion` and `general_congestion` values are
interpreted as numbers between 0 and 1, dividing the stored `u16` by `u16::MAX`
(65535).

### Changes to transaction selection

Today, transactions are taken from the chunk producer's pool until `tx_limit` is
reached, where `tx_limit` is computed as follow.

```python
# old
tx_limit = 500 Tgas if len(delayed_receipts) < 20_000 else 0
```

We replace the formula for the transaction limit to depend on the
`general_congestion` computed in the previous shard variable (between 0 and 1):

```python
# new
MIN_GAS = 5 Tgas
MAX_GAS = 500 Tgas
tx_limit = mix(MAX_GAS, MIN_GAS, general_congestion)
```

*TODO: fine-tune `MIN_GAS` and `MAX_GAS`*

In the pseudo code above, we borrow the [`mix`](https://docs.gl/sl4/mix)
function from GLSL for linear interpolation.

> `mix(x, y, a)`
> 
> `mix` performs a linear interpolation between x and y using a to weight between
> them. The return value is computed as $x \times (1 - a) + y \times a$. 


Plus, we add the additional rule to reject all transactions to shard with an
`incoming_congestion` above a certain threshold.

```python
def filter_tx(tx):
  INCOMING_CONGESTION_THRESHOLD = 0.5
  if incoming_congestion(tx.receiver_shard_id) > INCOMING_CONGESTION_THRESHOLD
    tx.reject()
  else
    tx.accept()
```

*TODO: fine-tune `INCOMING_CONGESTION_THRESHOLD`*

Chunk validators must validate that the two rules above are respected in a
produced chunk.


### Changes to chunk execution

We add 3 new steps to chunk execution (enumerate as 1, 2, 6 below) and modify
how outgoing receipts are treated in the transaction conversion step (3) and in
the receipts execution step (4).

The new chunk execution then follows this order.

1. (new) Compute bandwidth limits to other shards based on the congestion information.
   The formula is:
    ```python
        # linear interpolation based on congestion level
        outgoing_gas_limit[receiver]
          = mix(30 Pgas, 0 Pgas, incoming_congestion(receiver))
    ```
2. (new) Drain receipts in the outgoing buffer from the previous round-
    - Subtract `receipt.gas()` from `outgoing_gas_limit[receipt.receiver]` for
      each receipt drained.
    - Keep receipts in the buffer if the gas limit would be negative.
    - Add the removed receipts to the outgoing receipts of the new chunk.
3. Convert all transactions to receipts included in the chunk.
    - Local receipts, which are receipts where the sender account id is equal to
      the receiver id, are set aside as local receipts for step 4.
    - Non-local receipts up to `outgoing_gas_limit[receipt.receiver]` for the
      respective shard go to the outgoing receipts list of the chunk.
    - (new) Non-local receipts above `outgoing_gas_limit[receipt.receiver]` for
      the respective shard go to the outgoing receipts buffer.
4. Execute receipts in the order of `local`, `delayed`, `incoming`.
    - Don't stop before all receipts are executed or more than 1000 Tgas have
      been burnt. Burnt gas includes the burnt gas from step 3.
    - Outgoing receipts up to what is left in
      `outgoing_gas_limit[receipt.receiver]` per shard (after step 3) go to the
      outgoing receipts list of the chunk.
    - (new) Above `outgoing_gas_limit[receipt.receiver]` receipts go to the
      outgoing buffer.
5. Remaining local or incoming receipts are added to the end of the `delayed`
   receipts queue.
6. (new) Compute own congestion information for the next block.:
    ```python
    MAX_CONGESTION_INCOMING_GAS = 100 PGas
    gas_backlog = sum([receipt.gas() for receipt in delayed_receipts_queue])
    incoming_congestion = gas_backlog / MAX_CONGESTION_INCOMING_GAS
    incoming_congestion = min(1.0, incoming_congestion)

    MAX_CONGESTION_MEMORY_CONSUMPTION = 500 MB
    memory_consumption = 0
    memory_consumption += sum([receipt.size() for receipt in delayed_receipts_queue])
    memory_consumption += sum([receipt.size() for receipt in postponed_receipts_queue])
    memory_consumption += sum([receipt.size() for receipt in outgoing_receipts_buffer])
  
    general_congestion = memory_consumption / MAX_CONGESTION_MEMORY_CONSUMPTION
    general_congestion = min(1.0, general_congestion)
    ```

*TODO: fine-tune `MAX_CONGESTION_INCOMING_GAS` and `MAX_CONGESTION_MEMORY_CONSUMPTION`*

In the formula above, we receipt gas and size are defined as:

```python
def gas(receipt):
  return receipt.attached_gas + receipt.exec_gas

def size(receipt):
  return len(borsh(receipt))
```

### Change to Trie

We store the outgoing buffered receipts in the trie, similar to delayed receipts
but in their own separate column. Therefore we add a trie column
`DELAYED_RECEIPT_OR_INDICES: u8 = 13;`. Then we read and write analogue to tje
delayed receipts queue.

*TODO: describe in more details*

## Reference Implementation

TODO: An actual implementation in nearcore will follow and be linked here.

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

TODO: describe how 
TODO: describe how it combines with transaction priority

[Describe any natural extensions and evolutions to the NEP proposal, and how they would impact the project. Use this section as a tool to help fully consider all possible interactions with the project in your proposal. This is also a good place to "dump ideas"; if they are out of scope for the NEP but otherwise related. Note that having something written down in the future-possibilities section is not a reason to accept the current or a future NEP. Such notes should be in the section on motivation or rationale in this or subsequent NEPs. The section merely provides additional information.]

## Consequences

TODO (in general)
TODO: describe if anything changes for light clients

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
