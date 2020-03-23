# VMConfig

Config of wasm operations.

## ext_costs:

_type: [ExtCostsConfig](ExtCostsConfig.md)_

Costs for runtime externals

## grow_mem_cost

_type: u32_

Gas cost of a growing memory by single page.

## regular_op_cost

_type: u32_

Gas cost of a regular operation.

## max_gas_burnt
_type: Gas_

Max amount of gas that can be used, excluding gas attached to promises.

## max_stack_height
_type: u32_

How tall the stack is allowed to grow?

## initial_memory_pages
_type: u32_

## max_memory_pages
_type: u32_

The initial number of memory pages.
What is the maximal memory pages amount is allowed to have for
a contract.

## registers_memory_limit
_type: u64_

Limit of memory used by registers.

## max_register_size
_type: u64_

Maximum number of bytes that can be stored in a single register.

## max_number_registers
_type: u64_

Maximum number of registers that can be used simultaneously.

## max_number_logs
_type: u64_

Maximum number of log entries.

## max_log_len
_type: u64_

Maximum length of a single log, in bytes.
