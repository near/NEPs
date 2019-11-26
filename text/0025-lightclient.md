- Proposal Name: light-client-spec
- Start Date: 2019-11-25
- NEP PR: [nearprotocol/neps#0025](https://github.com/nearprotocol/neps/pull/0025)

# Summary
[summary]: #summary

Light client specification for Nightshade operated chain with NFG finality.

# Motivation
[motivation]: #motivation

Light clients are crucial for participants of the network to learn about the results of their transactions or state of the contracts they care without maingaining a full node.

Light clients are also a fundamental component that enables bridges to other blockchahains, such as Ethereum, or enables NEAR to be a part of multichain infrastructures such as Cosmos or Polkadot.

# Guide-level explanation
[guide-level-explanation]: #guide-level-explanation

This document covers two primary subcomponents of the light client:

* The way the light client processes incoming information (such as blocks with proofs);
* The RPC endpoints a full node exposes for the light client to query the information it needs.

In a case of a standalone light client it will be making the requests itself. In the case of a lightclient that runs on a different blockchain as an enabler for a bridge, some external entity needs to be querying data through the RPC and sending it to the light client.

Each light client maintains the highest height block for which it knows that the block is valid. It can then receive instances of a `LightClientBlock` messages (described in detail [below](#reference-level-explanation)) and update the highest height block known to them.

The `LightClientBlock`  message contains
 * some information that can be useful to the light client (state root, tx output root, timestamp etc)
 * information sufficient to confirm the block is actually finalized on the chain (approvals and future hashes)
 * the current and next epoch ids
 * (optionally) the set of block producers for the next epoch.

If some block `B_h1` is the highest height block known to the light client, with height `h1` and epoch `e1`, and next epoch `e1'`, a `LightClientBlock` for block `B_h2` received by the light client with height `h2` and epoch `e2` will be accepted by the light client if:

1. `h2 > h1`
2. Either `e1 = e2` or `e1' = e2`. In the lattest case the `LightClientBlock` must contain the list of block producers for the next epoch.
3. The approvals information is correct and shows that the block is finalized.

Note that the light client always knows the set of block producers and their public keys for (3) above, since the first block known in each epoch that is sent to the light client contains the block producers set for the next epoch.

Not every block can be sent to the light client in a form of `LightClientBlock`. In particular, for a block to be sendable to the light client, it needs to have a quorum pre-commit from perspective of some block with a higher height. While every block in the ancestry of the block with a quorum pre-commit is final, only the actual block that has a quorum pre-commit can be sent to the ligth client. This, in particular, means that the first block in the epoch that is sent to the light client is not necessarily the first block in the epoch. It is an arbitrary block in the epoch that has a quorum pre-commit on it. The existence of such a block is guaranteed since the epoch doesn't switch unless a block in the previous epoch is finalized.

The block `B` is final if it has a quorum pre-commit. That means that

1. There's a block `qv` such that in the ancestry of `qv` there are more than `2n/3` block producers who have an approval with parent block in the progeny of `B` and the reference block in the ancestry of `B` (here and throughout the ancestry and progeny are assumed to include the block itself). We call this `B` having a quorum pre-vote from perspective of `qv`.
2. There's some other block `qc` such that in the ancestry of `qc` there are more than `2n/3` block producers who have an approval with parent block in the progeny of `qv` and the reference block in the ancestry of `B`. We call this `B` having a quroum pre-commit from perspective of `qc`.

`LightClientBlock` contains the following information to verify the above conditions:

1. The hash of `qv`;
2. Enough information to compute the hashes of enough blocks in the progeny of `B`;
3. The approvals from each block producer that make `B` to have a quorum pre-vote from perspective of `qv`.
4. The approvals from each block producer that make `B` to have a quorum pre-commit from perspective of `qc`.

We then reconstruct the actual hashes of the blocks from (2) above and put them into two sets: those that are in the ancestry of `qv` and those that are in the progeny of `qv`. This enables us then for each approval to easily check the conditions described above:

1. A parent hash of approvals needed for quorum pre-vote needs to be in the set of future blocks that are in the ancestry of `qv`;
2. A parent hash of approvals needed for quorum pre-commit needs to be in the set of future blocks that are in the progeny of `qv`;
3. A reference hash of any such approval needs to be in neither of the two sets.

All three conditiosn above need a careful handling of the border cases (e.g. having `B` or `qv` itself as parent or reference hash).

## The checks above are sufficient

We do not provide formal proofs here, but here's an intuition on why the checks are sufficient:

1. Even though we do not show that the future block hashes actually correspond to some existing blocks, the future block hashes only exist to verify that the parent hashes are in the progeny of `B` (or `qv`). The approvals have signatures of the block producers on them, and having a signature on an approval that has a parent block which hash is provably influenced by hash of `B` is suffucient to show that the parent block of the approval is in the progeny of `B` (or that the approval is created by a malicious actor).
2. Even though we do not validate the apporvals beyond showing that the parent blocks are in the progeny of `B` and the reference hash is not between `B` and the parent block, it can be shown that for any approval created by an honest block producer the reference block is indeed in the ancestry of `B`. We assume that out of `2n/3` approvals presented less than `n/3` can be from malicous actors, thus more than `n/3` are from honest actors and have reference hash and parent hash satisfying the requirements above. If there's a block that is not on the same chain as `B` which is final, it has more than `2n/3` approvals, and thus at least one of them coming from the *honest* actor who signed an approvals on `B`, causing a contradiction.

# Reference-level explanation
[reference-level-explanation]: #reference-level-explanation

## Data structures

```
BlockProducerStake
    account_id: AccountId // block producer identifier
    public_key: PublikKey // the key of the block producer
    stake: u128 // voting power of the block producer
```

```
LightClientApproval
    parent_hash: Hash,
    reference_hash: Hash,
    signature: Signature
```

```
LightClientBlock
    inner_lite: BlockHeaderInnerLite:
        height: u64
        /// Epoch Id this header is in.
        epoch_id: Hash
        /// The next Epoch Id
        next_epoch_id: Hash
        /// State root across all shards, merklized tree to prove precense of the data.
        prev_state_root: MerkleRoot
        /// Merkle root of the transaction outcomes across all shards
        prev_outcome_root: MerkleRoot
        /// The timestamp (claimed by the block producer) of the block production
        timestamp: u64
        /// The hash of the next epoch block producers set
        next_bp_hash: Hash

    /// The hash of the `inner_rest` field of the actual block header. Only used to compute and verify the block hash
    inner_rest_hash: Hash

    /// The next block producers set
    next_bps: Option<Vec<BlockProducerStake>>

    /// The hash of (some) block from which perspective this block has a quorum pre-vote
    qv_hash: Hash

    /// The hashes of inner parts of the header (hash(hash(inner_lite), hash(inner_rest))) of a sufficient number of blocks in the future to validate approvals below
    future_inner_hashes: Vec<Hash>

    /// The approvals that are sufficient to show that the block has a quorum pre-vote from perspective of `qv_hash`
    qv_approvals: Vec<Option<LightClientApproval>>

    /// The approvals that are sufficient to show that the block has a quorum pre-commit
    qc_approvals: Vec<Option<LightClientApproval>>

    /// Hash of the previous block
    prev_hash: Hash
```

The `BlockHeader` that full client uses contains three data fields: `inner_lite`, `inner_rest` and `prev_hash`. The hash of the block is computed as first computing the hash of `inner_lite` and `inner_rest`, then combining them into a single hash, and then combining that hash with the `prev_hash`.

`LightClientApproval` doesn't have the `account_id`. Instead both `qv_approvals` and `qc_approvals` always have as many elements as there are block producers in the epoch, and thus each approval corresponds to the block producer with the same ordinal.

To validate the block, the light client performs the following pseudocode:

```
    fn validate_header(last_known_block, new_block):
        new_block_hash = hash(hash(hash(new_block.inner_lite), new_block.inner_rest_hash), new_block.prev_hash)

        // The epoch of the block must be either the same as the last known block, or the one that immediately follows
        if new_block.epoch_id not in [last_known_block.epoch_id, last_known_block.next_epoch_id]:
            return false

        let block_producers = get_block_producers(new_block.epoch_id)
        if len(qv_approvals) != len(block_producers) or len(qc_approvals) != len(block_producers):
            return false

        // There's an upper bound for the number of future hashes, to bound how expensive could the verification be
        if len(future_inner_hashes) > MAX_FUTURE_HASHES:
            return false

        // qv_blocks will contain all the blocks that are between the `new_block` and the block with hash `new_block.qv_hash`, both exclusive
        let qv_blocks = set()

        // qc_blocks will contain all the blocks in the progeny of `new_block.qv_hash`, including the block with hash `new_block.qv_hash` itself
        let qc_blocks = set()

        // Populate qv_blocks and qc_blocks. Since the hash of each block is hash(header_inner_hash, prev_hash), just knowning header_inner_hash
        // for each block is sufficient to compute all the hashes
        prev_hash = new_block_hash
        passed_qv = false
        for future_inner_hash in future_inner_hashes:
            cur_hash = hash(future_inner_hash, prev_hash)
            if cur_hash == new_block.qv_hash:
                passed_qv = true
            if passed_qv:
                qc_blocks.insert(cur_hash)
            else:
                qv_blocks.insert(cur_hash)

            prev_hash = cur_hash

        let total_stake = 0
        let qv_stake = 0
        let qc_stake = 0

        for (qv_approval, qc_approval, stake) in zip(qv_approvals, qc_approvals, block_producers):
            if qv_approval.is_some():
                qv_stake += stake.amount
                // each qv_approval must have the new_block or a block in the progeny of the new_block as parent block
                // and the new_block or a block in its ancestry as the reference block. qv_blocks has all the blocks
                // in the progeny of the new_block, excluding new_block itself
                if qv_approval.parent_hash not in qv_blocks and qv_approval.parent_hash != new_block_hash:
                    return false
                if qv_approval.reference_hash in qv_blocks:
                    return false
                if not validate_signature(qv_approval.signature, hash(qv_approval), stake.public_key):
                    return false

            if qc_approval.is_some():
                qc_stake += stake.amount
                if qc_qpproval.parent_hash not in qc_blocks:
                    return false
                // The reference hash of the qc_approval must be the new_block itself, or in its ancestry.
                // Since the parent_hash is in the qc_blocks, and a valid approval has the reference has in the ancestry
                // of the parent_hash, it is enough to check that the reference check is not in qv_blocks or qc_blocks
                if qc_qpproval.reference_hash in qc_blocks or qc_approval.reference_hash in qv_blocks:
                    return false
                if not validate_signature(qc_approval.signature, hash(qc_approval), stake.public_key):
                    return false

            total_stake += stake.

        let threshold = floor(total_stake * 2 / 3)
        if qv_stake <= threshold:
            return false
        if qc_stake <= threshold:
            return false

        // The first block in each epoch must have the next block producers set
        // Save it, and delete the block producers set for the previous epoch
        // This way at any point exactly two block producers sets are maintained
        if new_block.next_epoch_id = last_known_block.next_epoch_id:
            if new_block.next_bps.is_none():
                return false

            if hash(new_block.next_bps) != new_block.next_bps_hash:
                return false

            if len(new_block.next_bps) > MAX_BLOCK_PRODUCERS:
                return false

            set_block_producers(new_block.next_epoch_id, new_block.next_bps)
            delete_block_producers(last_known_block.epoch_id)

        return true
```

The interface through which the light client requests such `LightClientBlock`s is an RPC end point that takes the last hash known to the light client to be finalized.

```
http post http://127.0.0.1:3030/ jsonrpc=2.0 method=next_light_client_block params:="[<last known hash>]" id="dontcare"
```

The RPC returns the `LightClientBlock` for the block as far into the future from the last known hash as possible for the light client to still accept it. Specifically, it either returns the last block of the next epoch, or the last final known block. If there's no newer final block than the one the light client knows about, the RPC returns an empty result.

A standalone light client would bootstrap by requesting next blocks until it receives an empty result, and then periodically request the next light client block.

A smart contract-based light client that enables a bridge to NEAR on a different blockchain naturally cannot request blocks itself. Instead external oracles query the next light client block from one of the full nodes, and submit it to the light client smart contract. The smart contract-based light client performs the same checks described above, so the oracle doesn't need to be trusted.

