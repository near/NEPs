# Selecting Block Producers

## Background

Near is intended to be a permissionless proof-of-stake blockchain, however during each epoch a specific set of block producers must be chosen (and held accountable for producing the blocks during that epoch). To this end, we specify the algorithm by which the block producers are selected, and the schedule in which they should produce blocks is determined, based on the stake proposals from nodes in the network. Additionally, because Near is a sharded system, we also give the algorithm assigning block producers to shards and the schedule for them to produce "chunks" for that shard.

There are several desiderata for this algorithm:
* Larger stakes should be preferred (more staked tokens means more security)
* The frequency with which a given block producer is selected to produce a particular block is proportional to that producer’s stake
* All validators selected as block producers should be selected to produce at least one block during the epoch
* It should be possible to determine which block producer is supposed to produce the block at height \\( h \\), for any \\( h \\) within the epoch, in constant time
* The block producer chosen at height h should have been a chunk producer for some shard at height \\( h - 1 \\), this minimizes network communication between chunk producers and block producers
* The number of distinct block producers should be as large as is allowed by the scalability in the consensus algorithm (too large and the system would be too slow, too small and the system would be too centralized)\\( ^{\dagger} \\)

> \\( \dagger \\) Note: By “distinct block producers” we mean the number of different signing keys. We recognize it is possible for a single “logical entity” to split their stake into two or more proposals (Sybil attack), however steps to prevent this kind of attack against centralization are out of scope for this document.

## Assumptions

* The maximum number of distinct block producers supported by the consensus algorithm is a fixed constant. This will be a parameter of the protocol itself (i.e. all nodes must agree on the constant). In this document, we will denote the maximum number of block producers by `MAX_NUM_VALIDATORS`.
* The minimum number of blocks in the epoch is known at the time of block producer selection. This minimum does not need to be incredibly accurate, but we will assume it is within a factor of 2 of the actual number of blocks in the epoch. In this document we will refer to this as the “length of the epoch”, denoted by `epoch_length`.
* To meet the requirement that any chosen validator will be selected to produce at least one block in the epoch, we assume it is acceptable for the probability of this *not* happening to be sufficiently low. Let `PROBABILITY_NEVER_SELECTED` be a protocol constant which gives the maximum allowable probability that the block producer with the least stake will never be selected to produce a block during the epoch. We will additionally assume the block producer assigned to make each block is chosen independently, and in proportion to the block producers’ stakes. Therefore, the probability that the block producer with least stake is never chosen is given by the expression \\( (1 - (s_\text{min} / S))^\text{epoch_length} \\), where \\( s_\text{min} \\) is the least stake of any block producer and \\( S \\) is the sum of stakes of all block producers. Hence, the algorithm will enforce the condition \\( (1 - (s_\text{min} / S))^\text{epoch_length} < \text{PROBABILITY_NEVER_SELECTED} \\).
* In the live network there will be fewer shards than block producers. Therefore we will optimize assigning block producers to shards (to act as chunk producers) with this assumption. However, we know some tests of the code break this assumption, therefore the assignment must still work when there are more shards than block producers, though it is allowed to be sub-optimal (e.g. uneven distribution of stakes / validators between shards).

## Algorithm for selecting block producers

### Input

* `MAX_NUM_VALIDATORS: u16` (see Assumptions above for definition)
* `epoch_length: u64`
* `PROBABILITY_NEVER_SELECTED: Ratio<u128>` ([Ratio](https://docs.rs/num-rational/0.2.4/num_rational/struct.Ratio.html) is defined in a rust library)
* `validator_proposals: Vec<ValidatorStake>` (proposed stakes for the next epoch from nodes sending staking transactions)

### Output

* `block_producers: Vec<ValidatorStake>` (chosen block producers for the next epoch)
* `block_producer_sampler: WeightedIndex`
  - Data structure to allow \\( O(1) \\) sampling from the block producers with probability proportional to their stake
  - This structure will be based on the [WeightedIndex](https://rust-random.github.io/rand/rand/distributions/weighted/alias_method/struct.WeightedIndex.html) implementation (see a description of [Vose's Alias Method](https://en.wikipedia.org/wiki/Alias_method) for details)

### Steps

```rust
let sorted_proposals =
    validator_proposals.sort_by_descending(|v| (v.stake, v.account_id));

// smallest value of s_min / S such that
// (1 - (s_min / S))^epoch_length < PROBABILITY_NEVER_SELECTED
let min_stake_fraction: Ratio<u128> =
    1 - exp(ln(PROBABILITY_NEVER_SELECTED) / epoch_length );

let mut total_stake = 0;

let block_producers = 
    sorted_proposals
        .iter()
        .take(MAX_NUM_VALIDATORS)
        .take_while(|v| {
            total_stake += v.stake;
            (v.stake / total_stake) > min_stake_fraction
        })
        .collect();

let block_producer_sampler =
    WeightedIndex::new(block_producers.iter().map(|v| v.stake).collect());

return (block_producers, block_producer_sampler);
```

## Algorithm for selecting producer of block at height \\( h \\)

### Input

* `h: BlockHeight`
  - Height to compute the block producer for
  - Only heights within the epoch corresponding to the given block producers make sense as input
* `block_producers: Vec<ValidatorStake>` (output from above])
* `block_producer_sampler: WeightedIndex`
* `epoch_rng_seed: [u8; 32]`
  - Fixed seed for the epoch determined from Verified Random Function (VRF) output of last block in the previous epoch

### Output

* `block_producer: ValidatorStake`

### Steps

```rust
// Concatenates the bytes of the epoch seed with the height,
// then computes the sha256 hash.
let block_seed: [u8; 32] = combine(epoch_rng_seed, h);

// The hash is used as an entropy source for the random numbers.
// The first 8 bytes select a block producer uniformly.
let uniform_index = block_seed[0..8].as_usize() % block_producers.len();

// The next 16 bytes uniformly pick some weight between 0 and the total
// weight (i.e. stake) of all block producers.
let uniform_weight =
    block_seed[8..24].as_u128() % block_producer_sampler.weight_sum();

// Return either the uniformly selected block producer, or its "alias"
// depending on the uniformly selected weight.
let index =
    if uniform_weight  < block_producer_sampler.no_alias_odds[uniform_index] {
        uniform_index
    } else {
        block_producer_sampler.aliases[uniform_index]
    };

return block_producers[index];
```

## Algorithm for assigning block producers to shards

### Input

* `block_producers: Vec<ValidatorStake>`
* `num_shards: usize`
* `min_validators_per_shard: usize`

### Output

* `validator_shard_assignments: Vec<Vec<ValidatorStake>>`
  - \\( i \\)-th element gives the validators assigned to shard \\( i \\)

### Steps

This algorithm is more complex than the others, so we do not present the pseudo-code here. Instead we have a [proof-of-concept (PoC) on GitHub](https://github.com/birchmd/bp-shard-assign-poc). What follows is only a high level summary of the algorithm.

1. Assign validators to shards, prioritizing keeping the number of validators in each shard equal (picking the one with less stake in the case of a tie), until all shards have the minimum number of validators.
2. If some validators have not yet been assigned then assign validators to shards prioritizing keeping the stakes equal.

The algorithm also ensures a validator is not assigned to the same shard twice (could happen in the case there are more shards than validators).

## Algorithm for selection of chunk producer at height `h` for shard `shard_id`

### Input

* (same inputs as selection of block producer at height h)
* `validator_shard_assignments: Vec<Vec<ValidatorStake>>` (output from above)
* `shard_id: ShardId`

### Output

* `chunk_producer: ValidatorStake`

### Steps

```rust
let bp = block_producer_at_height(
    h + 1,
    block_producers,
    block_producer_sampler,
    epoch_rng_seed,
);

if validator_shard_assignments[shard_id].contains(bp) {
    // ensure a block producer at height h + 1 is a chunk producer at height h
    return bp;
}

// otherwise, select a chunk producer by cycling through
let candidates = validator_shard_assignments[shard_id];
let index = h % candidates.len();
return candidates[index];
```
