- Proposal Code Name: block-limiters
- Start Date: 2019-10-09
- NEP PR: [nearprotocol/neps#0000](https://github.com/nearprotocol/neps/pull/0000)

# Summary
[summary]: #summary

We need to limit how many transactions are included in the block and how many transactions from the block are executed.
Currently, our system is easily abusable, one can stall block production or make us lose receipts.

# Motivation
[motivation]: #motivation

We have several problems at the moment:

* Currently our block production can be easily abused. For instance one can submit 20 transactions each of which
deploys a 1MiB contract. Together these transactions would take > 1 sec to process, however block producer will happily
include them into the block and when the next block is produced (potentially by a different block producer) node will choke on
processing it;

* Currently we have a limit on how many transactions+receipts we include in the block, but if we have number of receipts
larger than this limit we will drop the receipts. We don't ever want to drop the receipts.

# Complications
[complications]: #complications

Our architecture has the following complications that make block limiting difficult:
* Unlike Ethereum, we include transactions in block X but compute their state in block X+1. Therefore we cannot have
a simple gas limit on the block, because whoever includes transactions into the block does not know how much they are
going to cost;
  * We cannot estimate transaction cost without executing it. In general, idea of doing static analysis to estimate gas is abandoned in
    blockchain community unless we are talking about niche languages;
* We cannot afford to lose receipts. Our system heavily relies on the fact that receipts are not getting lost.

# Implementation
[implementation]: #implementation

The following proposed set of rules should provide a safe way of protecting our block production:

1. `block_size_limit` -- as block producer includes receipts and transactions into the block
they count the total size of serialized receipts and transactions. Block producer always starts by including receipts
from the previous block and cross-shard receipts, as they do this they do not check the total size against `block_size_limit` (because we never drop the receipts).
Then block producer starts including transactions into the block, if total size exceeds `block_size_limit` they stop. 

    Note, it is possible to have no transactions in the block and it is possible for receipts in the block to exceed the threshold.
    In other words, it is possible for shard to get spammed by other shards and get slowed down;
    
2. `block_gas_limit` -- as block producer executes transactions and receipts from the previous block they keep track
of how much gas they have already burnt (not to be confused with used gas). When they exceed this limit they take: A) all remaining receipts (if any); B)
and remaining transactions (if any), convert transactions to receipts and include (A)+(B) into the current block they are constructing.

# Future work
[future-work]: #future-work

In the future we need a way to ensure that one shard is not getting spammed by receipts from other shards preventing it
from processing transactions and making chunk production very slow.
