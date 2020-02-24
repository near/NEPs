
## RuntimeConfig

The structure that holds the parameters of the runtime, mostly economics.

### storage_cost_byte_per_block

_type: Balance_

The cost to store one byte of storage per block.

### storage_cost_byte_per_block

_type: Balance_

Costs of different actions that need to be performed when sending and processing transaction
and receipts.

### poke_threshold

_type: BlockIndex_

The minimum number of blocks of storage rent an account has to maintain to prevent forced deletion.

### transaction_costs

_type: [RuntimeFeesConfig](RuntimeFeeConfig.md)_

Costs of different actions that need to be performed when sending and processing transaction and receipts.

### wasm_config

_type: [VMConfig](VMConfig.md),_

Config of wasm operations.

### account_length_baseline_cost_per_block

_type: Balance_

The baseline cost to store account_id of short length per block.
The original formula in NEP#0006 is `1,000 / (3 ^ (account_id.length - 2))` for cost per year.
This value represents `1,000` above adjusted to use per block

