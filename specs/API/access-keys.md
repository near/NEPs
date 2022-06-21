---
id: access-keys
title: RPC Endpoints
sidebar_label: Access Keys
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';


## Access Keys {#access-keys}

---

### View access key {#view-access-key}

> Returns information about a single access key for given account.
>
> If `permission` of the key is `FunctionCall`, it will return more details such as the `allowance`, `receiver_id`, and `method_names`.

- method: `query`
- params:
  - `request_type`: `view_access_key`
  - [`finality`](/docs/api/rpc#using-finality-param) _OR_ [`block_id`](/docs/api/rpc#using-block_id-param)
  - `account_id`: _`"example.testnet"`_
  - `public_key`: _`"example.testnet's public key"`_

Example:


<Tabs>
<TabItem value="json" label="JSON" default>

```json
{
  "jsonrpc": "2.0",
  "id": "dontcare",
  "method": "query",
  "params": {
    "request_type": "view_access_key",
    "finality": "final",
    "account_id": "client.chainlink.testnet",
    "public_key": "ed25519:H9k5eiU4xXS3M4z8HzKJSLaZdqGdGwBG49o7orNC4eZW"
  }
}
```

</TabItem>
<TabItem value="js" label="JavaScript">


```js
const response = await near.connection.provider.query({
  request_type: "view_access_key",
  finality: "final",
  account_id: "client.chainlink.testnet",
  public_key: "ed25519:H9k5eiU4xXS3M4z8HzKJSLaZdqGdGwBG49o7orNC4eZW",
});
```

</TabItem>
<TabItem value="http" label="HTTPie">

```bash
http post https://rpc.testnet.near.org jsonrpc=2.0 id=dontcare method=query \
  params:='{
    "request_type": "view_access_key",
    "finality": "final",
    "account_id": "client.chainlink.testnet",
    "public_key": "ed25519:H9k5eiU4xXS3M4z8HzKJSLaZdqGdGwBG49o7orNC4eZW"
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
    "nonce": 85,
    "permission": {
      "FunctionCall": {
        "allowance": "18501534631167209000000000",
        "receiver_id": "client.chainlink.testnet",
        "method_names": ["get_token_price"]
      }
    },
    "block_height": 19884918,
    "block_hash": "GGJQ8yjmo7aEoj8ZpAhGehnq9BSWFx4xswHYzDwwAP2n"
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

Here is the exhaustive list of the error variants that can be returned by `view_access_key` request type:

<table class="custom-stripe">
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
      <td rowspan="6">HANDLER_ERROR</td>
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
      <td>INVALID_ACCOUNT</td>
      <td>The requested <code>account_id</code> is invalid</td>
      <td>
        <ul>
          <li>Provide a valid <code>account_id</code></li>
        </ul>
      </td>
    </tr>
    <tr>
      <td>UNKNOWN_ACCOUNT</td>
      <td>The requested <code>account_id</code> has not been found while viewing since the account has not been created or has been already deleted</td>
      <td>
        <ul>
          <li>Check the <code>account_id</code></li>
          <li>Specify a different block or retry if you request the latest state</li>
        </ul>
      </td>
    </tr>
    <tr>
      <td>UNKNOWN_ACCESS_KEY</td>
      <td>The requested <code>public_key</code> has not been found while viewing since the public key has not been created or has been already deleted</td>
      <td>
        <ul>
          <li>Check the <code>public_key</code></li>
          <li>Specify a different block or retry if you request the latest state</li>
        </ul>
      </td>
    </tr>
    <tr>
      <td>UNAVAILABLE_SHARD</td>
      <td>The node was unable to found the requested data because it does not track the shard where data is present</td>
      <td>
        <ul>
          <li>Send a request to a different node which might track the shard</li>
        </ul>
      </td>
    </tr>
    <tr>
      <td>NO_SYNCED_BLOCKS</td>
      <td>The node is still syncing and the requested block is not in the database yet</td>
      <td>
        <ul>
          <li>Wait until the node finish syncing</li>
          <li>Send a request to a different node which is synced</li>
        </ul>
      </td>
    </tr>
    <tr class="stripe">
      <td>REQUEST_VALIDATION_ERROR</td>
      <td>PARSE_ERROR</td>
      <td>Passed arguments can't be parsed by JSON RPC server (missing arguments, wrong format, etc.)</td>
      <td>
        <ul>
          <li>Check the arguments passed and pass the correct ones</li>
          <li>Check <code>error.cause.info</code> for more details</li>
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

### View access key list {#view-access-key-list}

> Returns <strong>all</strong> access keys for a given account.

- method: `query`
- params:
  - `request_type`: `view_access_key_list`
  - [`finality`](/docs/api/rpc#using-finality-param) _OR_ [`block_id`](/docs/api/rpc#using-block_id-param)
  - `account_id`: _`"example.testnet"`_

Example:

<Tabs>
<TabItem value="json" label="JSON" default>

```json
{
  "jsonrpc": "2.0",
  "id": "dontcare",
  "method": "query",
  "params": {
    "request_type": "view_access_key_list",
    "finality": "final",
    "account_id": "example.testnet"
  }
}
```

</TabItem>
<TabItem value="js" label="JavaScript">

```js
const response = await near.connection.provider.query({
  request_type: "view_access_key_list",
  finality: "final",
  account_id: "example.testnet",
});
```

</TabItem>
<TabItem value="http" label="HTTPie">

```bash
http post https://rpc.testnet.near.org jsonrpc=2.0 id=dontcare method=query \
  params:='{
    "request_type": "view_access_key_list",
    "finality": "final",
    "account_id": "example.testnet"
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
    "keys": [
      {
        "public_key": "ed25519:2j6qujbkPFuTstQLLTxKZUw63D5Wu3SG79Gop5JQrNJY",
        "access_key": {
          "nonce": 17,
          "permission": {
            "FunctionCall": {
              "allowance": "9999203942481156415000",
              "receiver_id": "place.meta",
              "method_names": []
            }
          }
        }
      },
      {
        "public_key": "ed25519:46etzhzZHN4NSQ8JEQtbHCX7sT8WByS3vmSEb3fbmSgf",
        "access_key": {
          "nonce": 2,
          "permission": {
            "FunctionCall": {
              "allowance": "9999930655034196535000",
              "receiver_id": "dev-1596616186817-8588944",
              "method_names": []
            }
          }
        }
      },
      {
        "public_key": "ed25519:4F9TwuSqWwvoyu7JVZDsupPhC7oYbYNsisBV2yQvyXFn",
        "access_key": {
          "nonce": 0,
          "permission": "FullAccess"
        }
      },
      {
        "public_key": "ed25519:4bZqp6nm1btr92UfKbyADDzJ4oPK9JetHXqEYqbYZmkD",
        "access_key": {
          "nonce": 2,
          "permission": "FullAccess"
        }
      },
      {
        "public_key": "ed25519:6ZPzX7hS37jiU9dRxbV1Waf8HSyKKFypJbrnZXzNhqjs",
        "access_key": {
          "nonce": 2,
          "permission": {
            "FunctionCall": {
              "allowance": "9999922083697042955000",
              "receiver_id": "example.testnet",
              "method_names": []
            }
          }
        }
      },
      {
        "public_key": "ed25519:81RKfuo7mBbsaviTmBsq18t6Eq4YLnSi3ye2CBLcKFUX",
        "access_key": {
          "nonce": 8,
          "permission": "FullAccess"
        }
      },
      {
        "public_key": "ed25519:B4W1oAYTcG8GxwKev8jQtsYWkGwGdqP24W7eZ6Fmpyzc",
        "access_key": {
          "nonce": 0,
          "permission": {
            "FunctionCall": {
              "allowance": "10000000000000000000000",
              "receiver_id": "dev-1594144238344",
              "method_names": []
            }
          }
        }
      },
      {
        "public_key": "ed25519:BA3AZbACoEzAsxKeToFd36AVpPXFSNhSMW2R6UYeGRwM",
        "access_key": {
          "nonce": 0,
          "permission": {
            "FunctionCall": {
              "allowance": "10000000000000000000000",
              "receiver_id": "new-corgis",
              "method_names": []
            }
          }
        }
      },
      {
        "public_key": "ed25519:BRyHUGAJjRKVTc9ZqXTTSJnFmSca8WLj8TuVe1wXK3LZ",
        "access_key": {
          "nonce": 17,
          "permission": "FullAccess"
        }
      },
      {
        "public_key": "ed25519:DjytaZ1HZ5ZFmH3YeJeMCiC886K1XPYeGsbz2E1AZj2J",
        "access_key": {
          "nonce": 31,
          "permission": "FullAccess"
        }
      },
      {
        "public_key": "ed25519:DqJn5UCq6vdNAvfhnbpdAeuui9a6Hv9DKYDxeRACPUDP",
        "access_key": {
          "nonce": 0,
          "permission": "FullAccess"
        }
      },
      {
        "public_key": "ed25519:FFxG8x6cDDyiErFtRsdw4dBNtCmCtap4tMTjuq3umvSq",
        "access_key": {
          "nonce": 0,
          "permission": "FullAccess"
        }
      }
    ],
    "block_height": 17798231,
    "block_hash": "Gm7YSdx22wPuciW1jTTeRGP9mFqmon69ErFQvgcFyEEB"
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

Here is the exhaustive list of the error variants that can be returned by `view_access_key_list` request type:

<table class="custom-stripe">
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
      <td rowspan="5">HANDLER_ERROR</td>
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
      <td>INVALID_ACCOUNT</td>
      <td>The requested <code>account_id</code> is invalid</td>
      <td>
        <ul>
          <li>Provide a valid <code>account_id</code></li>
        </ul>
      </td>
    </tr>
    <tr>
      <td>UNKNOWN_ACCOUNT</td>
      <td>The requested <code>account_id</code> has not been found while viewing since the account has not been created or has been already deleted</td>
      <td>
        <ul>
          <li>Check the <code>account_id</code></li>
          <li>Specify a different block or retry if you request the latest state</li>
        </ul>
      </td>
    </tr>
    <tr>
      <td>UNAVAILABLE_SHARD</td>
      <td>The node was unable to find the requested data because it does not track the shard where data is present</td>
      <td>
        <ul>
          <li>Send a request to a different node which might track the shard</li>
        </ul>
      </td>
    </tr>
    <tr>
      <td>NO_SYNCED_BLOCKS</td>
      <td>The node is still syncing and the requested block is not in the database yet</td>
      <td>
        <ul>
          <li>Wait until the node finish syncing</li>
          <li>Send a request to a different node which is synced</li>
        </ul>
      </td>
    </tr>
    <tr class="stripe">
      <td>REQUEST_VALIDATION_ERROR</td>
      <td>PARSE_ERROR</td>
      <td>Passed arguments can't be parsed by JSON RPC server (missing arguments, wrong format, etc.)</td>
      <td>
        <ul>
          <li>Check the arguments passed and pass the correct ones</li>
          <li>Check <code>error.cause.info</code> for more details</li>
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

### View access key changes (single) {#view-access-key-changes-single}

> Returns individual access key changes in a specific block. You can query multiple keys by passing an array of objects containing the `account_id` and `public_key`.

- method: `EXPERIMENTAL_changes`
- params:
  - `changes_type`: `single_access_key_changes`
  - `keys`: `[{ account_id, public_key }]`
  - [`finality`](/docs/api/rpc#using-finality-param) _OR_ [`block_id`](/docs/api/rpc#using-block_id-param)

Example:

<Tabs>
<TabItem value="json" label="JSON" default>

```json
{
  "jsonrpc": "2.0",
  "id": "dontcare",
  "method": "EXPERIMENTAL_changes",
  "params": {
    "changes_type": "single_access_key_changes",
    "keys": [
      {
        "account_id": "example-acct.testnet",
        "public_key": "ed25519:25KEc7t7MQohAJ4EDThd2vkksKkwangnuJFzcoiXj9oM"
      }
    ],
    "finality": "final"
  }
}
```

</TabItem>
<TabItem value="js" label="JavaScript">

```js
const response = await near.connection.provider.experimental_changes({
  changes_type: "single_access_key_changes",
  keys: [
    {
      account_id: "example-acct.testnet",
      public_key: "ed25519:25KEc7t7MQohAJ4EDThd2vkksKkwangnuJFzcoiXj9oM",
    },
  ],
  finality: "final",
});
```

</TabItem>
<TabItem value="http" label="HTTPie">

```bash
http post https://rpc.testnet.near.org jsonrpc=2.0 id=dontcare method=EXPERIMENTAL_changes \
  params:='{
    "changes_type": "single_access_key_changes",
    "keys": [
      {
        "account_id": "example-acct.testnet",
        "public_key": "ed25519:25KEc7t7MQohAJ4EDThd2vkksKkwangnuJFzcoiXj9oM"
      }
    ],
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
    "block_hash": "4kvqE1PsA6ic1LG7S5SqymSEhvjqGqumKjAxnVdNN3ZH",
    "changes": [
      {
        "cause": {
          "type": "transaction_processing",
          "tx_hash": "HshPyqddLxsganFxHHeH9LtkGekXDCuAt6axVgJLboXV"
        },
        "type": "access_key_update",
        "change": {
          "account_id": "example-acct.testnet",
          "public_key": "ed25519:25KEc7t7MQohAJ4EDThd2vkksKkwangnuJFzcoiXj9oM",
          "access_key": {
            "nonce": 1,
            "permission": "FullAccess"
          }
        }
      }
    ]
  },
  "id": "dontcare"
}
```

</p>
</details>

#### What could go wrong? {#what-could-go-wrong-2}

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

Here is the exhaustive list of the error variants that can be returned by `EXPERIMENTAL_changes_in_block` method:

<table class="custom-stripe">
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
      <td rowspan="2">HANDLER_ERROR</td>
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
      <td>NOT_SYNCED_YET</td>
      <td>The node is still syncing and the requested block is not in the database yet</td>
      <td>
        <ul>
          <li>Wait until the node finish syncing</li>
          <li>Send a request to a different node which is synced</li>
        </ul>
      </td>
    </tr>
    <tr class="stripe">
      <td>REQUEST_VALIDATION_ERROR</td>
      <td>PARSE_ERROR</td>
      <td>Passed arguments can't be parsed by JSON RPC server (missing arguments, wrong format, etc.)</td>
      <td>
        <ul>
          <li>Check the arguments passed and pass the correct ones</li>
          <li>Check <code>error.cause.info</code> for more details</li>
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

### View access key changes (all) {#view-access-key-changes-all}

> Returns changes to <strong>all</strong> access keys of a specific block. Multiple accounts can be quereied by passing an array of `account_ids`.

- method: `EXPERIMENTAL_changes`
- params:
  - `changes_type`: `all_access_key_changes`
  - `account_ids`: `[ "example.testnet", "example2.testnet"]`
  - [`finality`](/docs/api/rpc#using-finality-param) _OR_ [`block_id`](/docs/api/rpc#using-block_id-param)

Example:

<Tabs>
<TabItem value="json" label="JSON" default>

```json
{
  "jsonrpc": "2.0",
  "id": "dontcare",
  "method": "EXPERIMENTAL_changes",
  "params": {
    "changes_type": "all_access_key_changes",
    "account_ids": ["example-acct.testnet"],
    "block_id": "4kvqE1PsA6ic1LG7S5SqymSEhvjqGqumKjAxnVdNN3ZH"
  }
}
```

</TabItem>
<TabItem value="js" label="JavaScript">

```js
const response = await near.connection.provider.experimental_changes({
  changes_type: "all_access_key_changes",
  account_ids: "example-acct.testnet",
  finality: "final",
});
```

</TabItem>
<TabItem value="http" label="HTTPie">

```bash
http post https://rpc.testnet.near.org jsonrpc=2.0 id=dontcare method=EXPERIMENTAL_changes \
  params:='{
    "changes_type": "all_access_key_changes",
    "account_ids": ["example-acct.testnet"],
    "block_id": "4kvqE1PsA6ic1LG7S5SqymSEhvjqGqumKjAxnVdNN3ZH"
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
    "block_hash": "4kvqE1PsA6ic1LG7S5SqymSEhvjqGqumKjAxnVdNN3ZH",
    "changes": [
      {
        "cause": {
          "type": "transaction_processing",
          "tx_hash": "HshPyqddLxsganFxHHeH9LtkGekXDCuAt6axVgJLboXV"
        },
        "type": "access_key_update",
        "change": {
          "account_id": "example-acct.testnet",
          "public_key": "ed25519:25KEc7t7MQohAJ4EDThd2vkksKkwangnuJFzcoiXj9oM",
          "access_key": {
            "nonce": 1,
            "permission": "FullAccess"
          }
        }
      },
      {
        "cause": {
          "type": "receipt_processing",
          "receipt_hash": "CetXstu7bdqyUyweRqpY9op5U1Kqzd8pq8T1kqfcgBv2"
        },
        "type": "access_key_update",
        "change": {
          "account_id": "example-acct.testnet",
          "public_key": "ed25519:96pj2aVJH9njmAxakjvUMnNvdB3YUeSAMjbz9aRNU6XY",
          "access_key": {
            "nonce": 0,
            "permission": "FullAccess"
          }
        }
      }
    ]
  },
  "id": "dontcare"
}
```

</p>
</details>

#### What could go wrong? {#what-could-go-wrong-3}

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

Here is the exhaustive list of the error variants that can be returned by `EXPERIMENTAL_changes` method:

<table class="custom-stripe">
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
      <td rowspan="2">HANDLER_ERROR</td>
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
      <td>NOT_SYNCED_YET</td>
      <td>The node is still syncing and the requested block is not in the database yet</td>
      <td>
        <ul>
          <li>Wait until the node finish syncing</li>
          <li>Send a request to a different node which is synced</li>
        </ul>
      </td>
    </tr>
    <tr class="stripe">
      <td>REQUEST_VALIDATION_ERROR</td>
      <td>PARSE_ERROR</td>
      <td>Passed arguments can't be parsed by JSON RPC server (missing arguments, wrong format, etc.)</td>
      <td>
        <ul>
          <li>Check the arguments passed and pass the correct ones</li>
          <li>Check <code>error.cause.info</code> for more details</li>
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
