- Feature Name: `transaction-status`
- Start Date: 2019-06-11
- NEP PR: [nearprotocol/neps#0000](https://github.com/nearprotocol/neps/pull/0000)
- Issues:
    - [nearprotocol/near-wallet#76](https://github.com/nearprotocol/near-wallet/issues/76)

# Summary
[summary]: #summary

Node (full and light) should provide a way to track the status of the submitted transaction.
This can be used for better UX, e.g. in Wallet, when users submit a transaction and want to be updated on its progress.

# Motivation
[motivation]: #motivation

Detailed transaction status is required for good UX as users want the status being updated the second they submit a transaction until this transaction is completed entirely.
All UI tools including console-based tools, like NEAR shell would use this feature.

# Guide-level explanation
[guide-level-explanation]: #guide-level-explanation

All blockchain interfaces, like UI devtools and command line tools, would benefit from displaying the status of the transaction that was just submitted.
Specifically, for UI tools like wallet once the user clicks "send money" or call a contract we display the progress.
This is displayed as a list where items are gradually checked out once they are completed, e.g.:
* Transaction 04ffa4f received by a node;
* Transaction 04ffa4f:
    * Received by a chunk producer on shard 93667aa;
    * Included in chunk (1 receipt created: 20693fc);
    * Included in block;
* Receipt 20693fc:
    * Received by a chunk producer on shard 9227d15;
    * Included in chunk (1 refund created: 1ce44a3);
    * Included in block;
* Refund 1ce44a3:
    * Received by a chunk producer on shard 93667aa;
    * Included in chunk;
    * Included in block;
* Complete.

The UI has the following properties: 
* a transaction can be first received by a non-validating node that reroutes it to the validator;
* a transaction can result in multiple receipts, callbacks, refunds, and other transactions;
* these other transactions can be executed on different shards and asynchronously, which means the items might be checked out out of order;
* the node the user uses to query for the status might not have a perfect synchronization with the network and so multiple items will be checked out at once, instead of one at a time.
* the ids of the transactions and shards a truncated to the first 7 base64 characters, similarly to how github does it.

Similar UI is available from the command line tools, e.g. near shell interactively prints the very same list, similar to how advanced progress bar in shell tools work.
Near shell supports several levels of verbosity, where the highest level includes full base64 identifiers of everything: the node that received a transaction, hashes of the chunk and the block.

Finally, the RPC of a node is the source of this information and it allows querying it in a structured format.

# Reference-level explanation
[reference-level-explanation]: #reference-level-explanation

The source of transaction status information is the RPC of a node. Both validating and non-validating nodes should have
access to this information. However, non-validating nodes might have a slightly stale information and they might discover
about transaction included in chunk simultaneously with it included in the block. So the status known to non-validating
might jump several items at once, e.g. from "received" to "included in block", or even to "completed".

The structured information returned by an RPC should be exhaustive and forward compatible to avoid breaking wallet and Near shell
in the future because of the changes in the structure of this format. Wallet and Near shell, however, should also be forward compatible,
meaning they should not fail if some field is missing from the structured output of RPC.

To simplify the development RPC `tx_details` should return the maximum exhaustive information. And we do not
create overloads of this RPC based on verbosity. So the following RPC call `tx_details` with `{"tx_hash": "04ffa4f"}`
will return the following (notice how we allow incomplete hash in the RPC):
```json
[
  {"ReceivedByNonValidator": {"node_id":  "some_node_id"}},
  {"ReceivedByChunkProducer":  {
      "node_id": "some_node_id",
      "shard_id": "some_shard_id",
      "details": [
        {"IncludedInChunk": {
          "chunk_id": "some_chunk_id",
          "chunk_index": "some_chunk_index",
          "receipts": ["receipt_hash"],
          "logs": ["some_logs"],
          "result": "some_result"}
        },
        {"IncludedInBlock": {"block_id": "some_block_id", "block_index": "some_block_index"}}
      ]
      }
  }
]
```
(Note, this JSON output can be a direct result of serializing an internal Rust struct using `serde_json`)

Near shell then would print the entire JSON, upon calling `near tx_details` and support verbosity in two different ways:
* `--verbosity` with `full`, `normal` (default), and `minimal`.
* `--format` (see Future Possibilities).
-- the Go template, e.g.: `--format='{{range $key, $value := .}}{{(index $key "node_id")}}{{end}}'` prints node ids of the participating nodes.
This is very similar to docker tools, like `docker inspect` that returns a large JSON object (like network or container config) that can be queried using `--format`.

# Unresolved questions
[unresolved-questions]: #unresolved-questions

If the user does not own the node that they use to query such information from Wallet or Near shell then it is unclear what
would be the incentive system for such nodes to reply. It is clear that we need some incentive system for non-validating nodes to
accept and propagate transactions, which as a side-effect can create an incentive system for the nodes to provide transaction details
and reply to other transaction queries. Specifically:
  * A Wallet should have a default go-to node that it uses for RPC requests, including transaction submission and status replies;
  * If the node misbehaves and throttles some RPC requests, like transaction details queries then the Wallet rotates
  to a different node.
  * Since the rotation also means that the misbehaving node loses its transactions (for which it should get a cut, even if it is not a validating node)
  the node has incentive to behave on all RPC queries.

# Future possibilities
[future-possibilities]: #future-possibilities

* `--format` is a powerful tool used by Docker tools, e.g. [docker inspect](https://docs.docker.com/engine/reference/commandline/inspect/).
Docker tools frequently return large pieces of information in JSON format that do not even fit on the screen, e.g.
network config or container config. It would be impossible to provide different verbosity levels for all possible cases.
`--format` allows to query JSON and even restructure it. E.g. The following query would return list of node ids that participated in transaction execution:
```bash
--format='{{range $key, $value := .}}{{(index $key "node_id")}}{{end}}'
```
The format is Go-template, for which there are implementations in Rust.
