# GenesisConfig

## protocol_version

_type: u32_

Protocol version that this genesis works with.

## genesis_time

_type: DateTime_

Official time of blockchain start.

## genesis_height

_type: u64_

Height of the genesis block. Note that genesis height is not necessarily 0. 
For example, mainnet genesis height is `9820210`.

## chain_id

_type: String_

ID of the blockchain. This must be unique for every blockchain.
If your testnet blockchains do not have unique chain IDs, you will have a bad time.

## num_block_producers

_type: u32_

Number of block producer seats at genesis.

## block_producers_per_shard

_type: [ValidatorId]_

Defines number of shards and number of validators per each shard at genesis.

## avg_fisherman_per_shard

_type: [ValidatorId]_

Expected number of fisherman per shard.

## dynamic_resharding

_type: bool_

Enable dynamic re-sharding.

## epoch_length

_type: BlockIndex,_

Epoch length counted in blocks.

## gas_limit

_type: Gas,_

Initial gas limit for a block

## gas_price

_type: Balance,_

Initial gas price

## block_producer_kickout_threshold

_type: u8_

Criterion for kicking out block producers (this is a number between 0 and 100)

## chunk_producer_kickout_threshold

_type: u8_

Criterion for kicking out chunk producers (this is a number between 0 and 100)

## gas_price_adjustment_rate

_type: Fraction_

Gas price adjustment rate

## runtime_config

_type: [RuntimeConfig](RuntimeConfig.md)_

Runtime configuration (mostly economics constants).

## validators

_type: [AccountInfo]_

List of initial validators.

## records

_type: Vec\<[StateRecord](StateRecord.md)\>_

Records in storage at genesis (get split into shards at genesis creation).

## transaction_validity_period

_type: u64_

Number of blocks for which a given transaction is valid

## developer_reward_percentage

_type: Fraction_

Developer reward percentage.

## protocol_reward_percentage

_type: Fraction_

Protocol treasury percentage.

## max_inflation_rate

_type: Fraction_

Maximum inflation on the total supply every epoch.

## total_supply

_type: Balance_

Total supply of tokens at genesis.

## num_blocks_per_year

_type: u64_

Expected number of blocks per year

## protocol_treasury_account

_type: AccountId_

Protocol treasury account

## protocol economics

> For the specific economic specs, refer to [Economics Section](../Economics/Economic.md).

