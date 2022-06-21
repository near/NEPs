---
id: protocol
title: RPC Endpoints
sidebar_label: Protocol
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';


## Protocol {#protocol}

---

### Genesis Config {#genesis-config}

> Returns current genesis configuration.

- method: `EXPERIMENTAL_genesis_config`
- params: _none_

Example:

<Tabs>
<TabItem value="json" label="JSON" default>

```json
{
  "jsonrpc": "2.0",
  "id": "dontcare",
  "method": "EXPERIMENTAL_genesis_config"
}
```

</TabItem>
<TabItem value="js" label="JavaScript">

```js
const response = await near.connection.provider.experimental_genesisConfig();
```

</TabItem>
<TabItem value="http" label="HTTPie">

```bash
http post https://rpc.testnet.near.org jsonrpc=2.0 id=dontcare method=EXPERIMENTAL_genesis_config
```

</TabItem>
</Tabs>

<details>
<summary>Example response: </summary>
<p>

```json
{
  "jsonrpc": "2.0",
  "result": {
    "protocol_version": 29,
    "genesis_time": "2020-07-31T03:39:42.911378Z",
    "chain_id": "testnet",
    "genesis_height": 10885359,
    "num_block_producer_seats": 100,
    "num_block_producer_seats_per_shard": [100],
    "avg_hidden_validator_seats_per_shard": [0],
    "dynamic_resharding": false,
    "protocol_upgrade_stake_threshold": [4, 5],
    "protocol_upgrade_num_epochs": 2,
    "epoch_length": 43200,
    "gas_limit": 1000000000000000,
    "min_gas_price": "5000",
    "max_gas_price": "10000000000000000000000",
    "block_producer_kickout_threshold": 80,
    "chunk_producer_kickout_threshold": 90,
    "online_min_threshold": [90, 100],
    "online_max_threshold": [99, 100],
    "gas_price_adjustment_rate": [1, 100],
    "runtime_config": {
      "storage_amount_per_byte": "90949470177292823791",
      "transaction_costs": {
        "action_receipt_creation_config": {
          "send_sir": 108059500000,
          "send_not_sir": 108059500000,
          "execution": 108059500000
        },
        "data_receipt_creation_config": {
          "base_cost": {
            "send_sir": 4697339419375,
            "send_not_sir": 4697339419375,
            "execution": 4697339419375
          },
          "cost_per_byte": {
            "send_sir": 59357464,
            "send_not_sir": 59357464,
            "execution": 59357464
          }
        },
        "action_creation_config": {
          "create_account_cost": {
            "send_sir": 99607375000,
            "send_not_sir": 99607375000,
            "execution": 99607375000
          },
          "deploy_contract_cost": {
            "send_sir": 184765750000,
            "send_not_sir": 184765750000,
            "execution": 184765750000
          },
          "deploy_contract_cost_per_byte": {
            "send_sir": 6812999,
            "send_not_sir": 6812999,
            "execution": 6812999
          },
          "function_call_cost": {
            "send_sir": 2319861500000,
            "send_not_sir": 2319861500000,
            "execution": 2319861500000
          },
          "function_call_cost_per_byte": {
            "send_sir": 2235934,
            "send_not_sir": 2235934,
            "execution": 2235934
          },
          "transfer_cost": {
            "send_sir": 115123062500,
            "send_not_sir": 115123062500,
            "execution": 115123062500
          },
          "stake_cost": {
            "send_sir": 141715687500,
            "send_not_sir": 141715687500,
            "execution": 102217625000
          },
          "add_key_cost": {
            "full_access_cost": {
              "send_sir": 101765125000,
              "send_not_sir": 101765125000,
              "execution": 101765125000
            },
            "function_call_cost": {
              "send_sir": 102217625000,
              "send_not_sir": 102217625000,
              "execution": 102217625000
            },
            "function_call_cost_per_byte": {
              "send_sir": 1925331,
              "send_not_sir": 1925331,
              "execution": 1925331
            }
          },
          "delete_key_cost": {
            "send_sir": 94946625000,
            "send_not_sir": 94946625000,
            "execution": 94946625000
          },
          "delete_account_cost": {
            "send_sir": 147489000000,
            "send_not_sir": 147489000000,
            "execution": 147489000000
          }
        },
        "storage_usage_config": {
          "num_bytes_account": 100,
          "num_extra_bytes_record": 40
        },
        "burnt_gas_reward": [3, 10],
        "pessimistic_gas_price_inflation_ratio": [103, 100]
      },
      "wasm_config": {
        "ext_costs": {
          "base": 264768111,
          "contract_compile_base": 35445963,
          "contract_compile_bytes": 216750,
          "read_memory_base": 2609863200,
          "read_memory_byte": 3801333,
          "write_memory_base": 2803794861,
          "write_memory_byte": 2723772,
          "read_register_base": 2517165186,
          "read_register_byte": 98562,
          "write_register_base": 2865522486,
          "write_register_byte": 3801564,
          "utf8_decoding_base": 3111779061,
          "utf8_decoding_byte": 291580479,
          "utf16_decoding_base": 3543313050,
          "utf16_decoding_byte": 163577493,
          "sha256_base": 4540970250,
          "sha256_byte": 24117351,
          "keccak256_base": 5879491275,
          "keccak256_byte": 21471105,
          "keccak512_base": 5811388236,
          "keccak512_byte": 36649701,
          "log_base": 3543313050,
          "log_byte": 13198791,
          "storage_write_base": 64196736000,
          "storage_write_key_byte": 70482867,
          "storage_write_value_byte": 31018539,
          "storage_write_evicted_byte": 32117307,
          "storage_read_base": 56356845750,
          "storage_read_key_byte": 30952533,
          "storage_read_value_byte": 5611005,
          "storage_remove_base": 53473030500,
          "storage_remove_key_byte": 38220384,
          "storage_remove_ret_value_byte": 11531556,
          "storage_has_key_base": 54039896625,
          "storage_has_key_byte": 30790845,
          "storage_iter_create_prefix_base": 0,
          "storage_iter_create_prefix_byte": 0,
          "storage_iter_create_range_base": 0,
          "storage_iter_create_from_byte": 0,
          "storage_iter_create_to_byte": 0,
          "storage_iter_next_base": 0,
          "storage_iter_next_key_byte": 0,
          "storage_iter_next_value_byte": 0,
          "touching_trie_node": 16101955926,
          "promise_and_base": 1465013400,
          "promise_and_per_promise": 5452176,
          "promise_return": 560152386,
          "validator_stake_base": 911834726400,
          "validator_total_stake_base": 911834726400
        },
        "grow_mem_cost": 1,
        "regular_op_cost": 3856371,
        "limit_config": {
          "max_gas_burnt": 200000000000000,
          "max_gas_burnt_view": 200000000000000,
          "max_stack_height": 16384,
          "initial_memory_pages": 1024,
          "max_memory_pages": 2048,
          "registers_memory_limit": 1073741824,
          "max_register_size": 104857600,
          "max_number_registers": 100,
          "max_number_logs": 100,
          "max_total_log_length": 16384,
          "max_total_prepaid_gas": 300000000000000,
          "max_actions_per_receipt": 100,
          "max_number_bytes_method_names": 2000,
          "max_length_method_name": 256,
          "max_arguments_length": 4194304,
          "max_length_returned_data": 4194304,
          "max_contract_size": 4194304,
          "max_length_storage_key": 4194304,
          "max_length_storage_value": 4194304,
          "max_promises_per_function_call_action": 1024,
          "max_number_input_data_dependencies": 128
        }
      },
      "account_creation_config": {
        "min_allowed_top_level_account_length": 0,
        "registrar_account_id": "registrar"
      }
    },
    "validators": [
      {
        "account_id": "node0",
        "public_key": "ed25519:7PGseFbWxvYVgZ89K1uTJKYoKetWs7BJtbyXDzfbAcqX",
        "amount": "1000000000000000000000000000000"
      },
      {
        "account_id": "node1",
        "public_key": "ed25519:6DSjZ8mvsRZDvFqFxo8tCKePG96omXW7eVYVSySmDk8e",
        "amount": "1000000000000000000000000000000"
      },
      {
        "account_id": "node2",
        "public_key": "ed25519:GkDv7nSMS3xcqA45cpMvFmfV1o4fRF6zYo1JRR6mNqg5",
        "amount": "1000000000000000000000000000000"
      },
      {
        "account_id": "node3",
        "public_key": "ed25519:ydgzeXHJ5Xyt7M1gXLxqLBW1Ejx6scNV5Nx2pxFM8su",
        "amount": "1000000000000000000000000000000"
      }
    ],
    "transaction_validity_period": 86400,
    "protocol_reward_rate": [1, 10],
    "max_inflation_rate": [1, 20],
    "total_supply": "1031467299046044096035532756810080",
    "num_blocks_per_year": 31536000,
    "protocol_treasury_account": "near",
    "fishermen_threshold": "10000000000000000000",
    "minimum_stake_divisor": 10
  },
  "id": "dontcare"
}
```

</p>
</details>

#### What could go wrong? {#what-could-go-wrong}

When API request fails, RPC server returns a structured error response with a limited number of well-defined error variants, so client code can exhaustively handle all the possible error cases. Our JSON-RPC errors follow [verror](https://github.com/joyent/node-verror) convention for structuring the error response:


```json
{
    "error": {
        "name": <ERROR_TYPE>,
        "cause": {
            "info": {..},
            "name": <ERROR_CAUSE>
        },
        "code": -32000,
        "data": String,
        "message": "Server error",
    },
    "id": "dontcare",
    "jsonrpc": "2.0"
}
```

> **Heads up**
>
> The fields `code`, `data`, and `message` in the structure above are considered legacy ones and might be deprecated in the future. Please, don't rely on them.

Here is the exhaustive list of the error variants that can be returned by `EXPERIMENTAL_genesis_config` method:

<table>
  <thead>
    <tr>
      <th>
        ERROR_TYPE<br />
        <code>error.name</code>
      </th>
      <th>ERROR_CAUSE<br /><code>error.cause.name</code></th>
      <th>Reason</th>
      <th>Solution</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>INTERNAL_ERROR</td>
      <td>INTERNAL_ERROR</td>
      <td>Something went wrong with the node itself or overloaded</td>
      <td>
        <ul>
          <li>Try again later</li>
          <li>Send a request to a different node</li>
          <li>Check <code>error.cause.info</code> for more details</li>
        </ul>
      </td>
    </tr>
  </tbody>
</table>

---

### Protocol Config {#protocol-config}

> Returns most recent protocol configuration or a specific queried block. Useful for finding current storage and transaction costs.

- method: `EXPERIMENTAL_protocol_config`
- params:
  - [`finality`](/docs/api/rpc#using-finality-param) _OR_ [`block_id`](/docs/api/rpc#using-block_id-param)

Example:

<Tabs>
<TabItem value="json" label="JSON" default>

```json
{
  "jsonrpc": "2.0",
  "id": "dontcare",
  "method": "EXPERIMENTAL_protocol_config",
  "params": {
    "finality": "final"
  }
}
```

</TabItem>
<TabItem value="http" label="HTTPie">

```bash
http post https://rpc.testnet.near.org jsonrpc=2.0 id=dontcare method=EXPERIMENTAL_protocol_config \
  params:='{
    "finality": "final"
  }'
```

</TabItem>
</Tabs>

<details>
<summary>Example response: </summary>
<p>

```json
{
  "jsonrpc": "2.0",
  "result": {
    "protocol_version": 45,
    "genesis_time": "2020-07-31T03:39:42.911378Z",
    "chain_id": "testnet",
    "genesis_height": 42376888,
    "num_block_producer_seats": 200,
    "num_block_producer_seats_per_shard": [200],
    "avg_hidden_validator_seats_per_shard": [0],
    "dynamic_resharding": false,
    "protocol_upgrade_stake_threshold": [4, 5],
    "epoch_length": 43200,
    "gas_limit": 1000000000000000,
    "min_gas_price": "5000",
    "max_gas_price": "10000000000000000000000",
    "block_producer_kickout_threshold": 80,
    "chunk_producer_kickout_threshold": 90,
    "online_min_threshold": [90, 100],
    "online_max_threshold": [99, 100],
    "gas_price_adjustment_rate": [1, 100],
    "runtime_config": {
      "storage_amount_per_byte": "10000000000000000000",
      "transaction_costs": {
        "action_receipt_creation_config": {
          "send_sir": 108059500000,
          "send_not_sir": 108059500000,
          "execution": 108059500000
        },
        "data_receipt_creation_config": {
          "base_cost": {
            "send_sir": 4697339419375,
            "send_not_sir": 4697339419375,
            "execution": 4697339419375
          },
          "cost_per_byte": {
            "send_sir": 59357464,
            "send_not_sir": 59357464,
            "execution": 59357464
          }
        },
        "action_creation_config": {
          "create_account_cost": {
            "send_sir": 99607375000,
            "send_not_sir": 99607375000,
            "execution": 99607375000
          },
          "deploy_contract_cost": {
            "send_sir": 184765750000,
            "send_not_sir": 184765750000,
            "execution": 184765750000
          },
          "deploy_contract_cost_per_byte": {
            "send_sir": 6812999,
            "send_not_sir": 6812999,
            "execution": 6812999
          },
          "function_call_cost": {
            "send_sir": 2319861500000,
            "send_not_sir": 2319861500000,
            "execution": 2319861500000
          },
          "function_call_cost_per_byte": {
            "send_sir": 2235934,
            "send_not_sir": 2235934,
            "execution": 2235934
          },
          "transfer_cost": {
            "send_sir": 115123062500,
            "send_not_sir": 115123062500,
            "execution": 115123062500
          },
          "stake_cost": {
            "send_sir": 141715687500,
            "send_not_sir": 141715687500,
            "execution": 102217625000
          },
          "add_key_cost": {
            "full_access_cost": {
              "send_sir": 101765125000,
              "send_not_sir": 101765125000,
              "execution": 101765125000
            },
            "function_call_cost": {
              "send_sir": 102217625000,
              "send_not_sir": 102217625000,
              "execution": 102217625000
            },
            "function_call_cost_per_byte": {
              "send_sir": 1925331,
              "send_not_sir": 1925331,
              "execution": 1925331
            }
          },
          "delete_key_cost": {
            "send_sir": 94946625000,
            "send_not_sir": 94946625000,
            "execution": 94946625000
          },
          "delete_account_cost": {
            "send_sir": 147489000000,
            "send_not_sir": 147489000000,
            "execution": 147489000000
          }
        },
        "storage_usage_config": {
          "num_bytes_account": 100,
          "num_extra_bytes_record": 40
        },
        "burnt_gas_reward": [3, 10],
        "pessimistic_gas_price_inflation_ratio": [103, 100]
      },
      "wasm_config": {
        "ext_costs": {
          "base": 264768111,
          "contract_compile_base": 35445963,
          "contract_compile_bytes": 216750,
          "read_memory_base": 2609863200,
          "read_memory_byte": 3801333,
          "write_memory_base": 2803794861,
          "write_memory_byte": 2723772,
          "read_register_base": 2517165186,
          "read_register_byte": 98562,
          "write_register_base": 2865522486,
          "write_register_byte": 3801564,
          "utf8_decoding_base": 3111779061,
          "utf8_decoding_byte": 291580479,
          "utf16_decoding_base": 3543313050,
          "utf16_decoding_byte": 163577493,
          "sha256_base": 4540970250,
          "sha256_byte": 24117351,
          "keccak256_base": 5879491275,
          "keccak256_byte": 21471105,
          "keccak512_base": 5811388236,
          "keccak512_byte": 36649701,
          "log_base": 3543313050,
          "log_byte": 13198791,
          "storage_write_base": 64196736000,
          "storage_write_key_byte": 70482867,
          "storage_write_value_byte": 31018539,
          "storage_write_evicted_byte": 32117307,
          "storage_read_base": 56356845750,
          "storage_read_key_byte": 30952533,
          "storage_read_value_byte": 5611005,
          "storage_remove_base": 53473030500,
          "storage_remove_key_byte": 38220384,
          "storage_remove_ret_value_byte": 11531556,
          "storage_has_key_base": 54039896625,
          "storage_has_key_byte": 30790845,
          "storage_iter_create_prefix_base": 0,
          "storage_iter_create_prefix_byte": 0,
          "storage_iter_create_range_base": 0,
          "storage_iter_create_from_byte": 0,
          "storage_iter_create_to_byte": 0,
          "storage_iter_next_base": 0,
          "storage_iter_next_key_byte": 0,
          "storage_iter_next_value_byte": 0,
          "touching_trie_node": 16101955926,
          "promise_and_base": 1465013400,
          "promise_and_per_promise": 5452176,
          "promise_return": 560152386,
          "validator_stake_base": 911834726400,
          "validator_total_stake_base": 911834726400
        },
        "grow_mem_cost": 1,
        "regular_op_cost": 3856371,
        "limit_config": {
          "max_gas_burnt": 200000000000000,
          "max_gas_burnt_view": 200000000000000,
          "max_stack_height": 16384,
          "initial_memory_pages": 1024,
          "max_memory_pages": 2048,
          "registers_memory_limit": 1073741824,
          "max_register_size": 104857600,
          "max_number_registers": 100,
          "max_number_logs": 100,
          "max_total_log_length": 16384,
          "max_total_prepaid_gas": 300000000000000,
          "max_actions_per_receipt": 100,
          "max_number_bytes_method_names": 2000,
          "max_length_method_name": 256,
          "max_arguments_length": 4194304,
          "max_length_returned_data": 4194304,
          "max_contract_size": 4194304,
          "max_length_storage_key": 4194304,
          "max_length_storage_value": 4194304,
          "max_promises_per_function_call_action": 1024,
          "max_number_input_data_dependencies": 128
        }
      },
      "account_creation_config": {
        "min_allowed_top_level_account_length": 0,
        "registrar_account_id": "registrar"
      }
    },
    "transaction_validity_period": 86400,
    "protocol_reward_rate": [1, 10],
    "max_inflation_rate": [1, 20],
    "num_blocks_per_year": 31536000,
    "protocol_treasury_account": "near",
    "fishermen_threshold": "340282366920938463463374607431768211455",
    "minimum_stake_divisor": 10
  },
  "id": "dontcare"
}
```

</p>
</details>

#### What could go wrong? {#what-could-go-wrong-1}

When API request fails, RPC server returns a structured error response with a limited number of well-defined error variants, so client code can exhaustively handle all the possible error cases. Our JSON-RPC errors follow [verror](https://github.com/joyent/node-verror) convention for structuring the error response:


```json
{
    "error": {
        "name": <ERROR_TYPE>,
        "cause": {
            "info": {..},
            "name": <ERROR_CAUSE>
        },
        "code": -32000,
        "data": String,
        "message": "Server error",
    },
    "id": "dontcare",
    "jsonrpc": "2.0"
}
```

> **Heads up**
>
> The fields `code`, `data`, and `message` in the structure above are considered legacy ones and might be deprecated in the future. Please, don't rely on them.

Here is the exhaustive list of the error variants that can be returned by `EXPERIMENTAL_protocol_config` method:

<table>
  <thead>
    <tr>
      <th>
        ERROR_TYPE<br />
        <code>error.name</code>
      </th>
      <th>ERROR_CAUSE<br /><code>error.cause.name</code></th>
      <th>Reason</th>
      <th>Solution</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>HANDLER_ERROR</td>
      <td>UNKNOWN_BLOCK</td>
      <td>The requested block has not been produced yet or it has been garbage-collected (cleaned up to save space on the RPC node)</td>
      <td>
        <ul>
          <li>Check that the requested block is legit</li>
          <li>If the block had been produced more than 5 epochs ago, try to send your request to <a href="https://near-nodes.io/intro/node-types#archival-node">an archival node</a></li>
        </ul>
      </td>
    </tr>
    <tr>
      <td>INTERNAL_ERROR</td>
      <td>INTERNAL_ERROR</td>
      <td>Something went wrong with the node itself or overloaded</td>
      <td>
        <ul>
          <li>Try again later</li>
          <li>Send a request to a different node</li>
          <li>Check <code>error.cause.info</code> for more details</li>
        </ul>
      </td>
    </tr>
  </tbody>
</table>

---
