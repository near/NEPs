# RuntimeFeesConfig

Economic parameters for runtime

## action_receipt_creation_config

_type: Fee_

Describes the cost of creating an action receipt, `ActionReceipt`, excluding the actual cost
of actions.

## data_receipt_creation_config

_type: [DataReceiptCreationConfig](RuntimeFeeConfig/DataReceiptCreationConfig.md)_

Describes the cost of creating a data receipt, `DataReceipt`.

## action_creation_config

_type: [ActionCreationConfig](RuntimeFeeConfig/ActionCreationConfig.md)_

Describes the cost of creating a certain action, `Action`. Includes all variants.

## storage_usage_config

_type: [StorageUsageConfig](RuntimeFeeConfig/StorageUsageConfig.md)_

Describes fees for storage rent

## burnt_gas_reward
_type: [Fraction](RuntimeFeeConfig/Fraction.md)_

Fraction of the burnt gas to reward to the contract account for execution.

