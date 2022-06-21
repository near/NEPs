---
id: contracts
title: RPC Endpoints
sidebar_label: "Accounts / Contracts"
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';


## Accounts / Contracts {#accounts--contracts}

---

### View account {#view-account}

> Returns basic account information.

- method: `query`
- params:
  - `request_type`: `view_account`
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
    "request_type": "view_account",
    "finality": "final",
    "account_id": "nearkat.testnet"
  }
}
```

</TabItem>
<TabItem value="js" label="JavaScript">

```js
const response = await near.connection.provider.query({
  request_type: "view_account",
  finality: "final",
  account_id: "nearkat.testnet",
});
```

</TabItem>
<TabItem value="http" label="HTTPie">

```bash
http post https://rpc.testnet.near.org jsonrpc=2.0 id=dontcare method=query \
  params:='{
    "request_type": "view_account",
    "finality": "final",
    "account_id": "nearkat.testnet"
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
    "amount": "399992611103597728750000000",
    "locked": "0",
    "code_hash": "11111111111111111111111111111111",
    "storage_usage": 642,
    "storage_paid_at": 0,
    "block_height": 17795474,
    "block_hash": "9MjpcnwW3TSdzGweNfPbkx8M74q1XzUcT1PAN8G5bNDz"
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

Here is the exhaustive list of the error variants that can be returned by `view_account` request type:

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

### View account changes {#view-account-changes}

> Returns account changes from transactions in a given account.

- method: `EXPERIMENTAL_changes`
- params:
  - `changes_type`: `account_changes`
  - `account_ids`: [`"example.testnet"`]
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
    "changes_type": "account_changes",
    "account_ids": ["your_account.testnet"],
    "block_id": 19703467
  }
}
```

</TabItem>
<TabItem value="js" label="JavaScript">

```js
const response = await near.connection.provider.experimental_changes({
  changes_type: "account_changes",
  account_ids: ["nearkat.testnet"],
  block_id: 19703467,
});
```

</TabItem>
<TabItem value="http" label="HTTPie">

```bash
http post https://rpc.testnet.near.org jsonrpc=2.0 id=dontcare method=EXPERIMENTAL_changes \
  params:='{
    "changes_type": "account_changes",
    "account_ids": ["your_account.testnet"],
    "block_id": 19703467
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
    "block_hash": "6xsfPSG89s6fCMShxxxQTP6D4ZHM9xkGCgubayTDRzAP",
    "changes": [
      {
        "cause": {
          "type": "transaction_processing",
          "tx_hash": "HLvxLKFM7gohFSqXPp5SpyydNEVpAno352qJJbnddsz3"
        },
        "type": "account_update",
        "change": {
          "account_id": "your_account.testnet",
          "amount": "499999959035075000000000000",
          "locked": "0",
          "code_hash": "11111111111111111111111111111111",
          "storage_usage": 182,
          "storage_paid_at": 0
        }
      },
      {
        "cause": {
          "type": "receipt_processing",
          "receipt_hash": "CPenN1dp4DNKnb9LiL5hkPmu1WiKLMuM7msDjEZwDmwa"
        },
        "type": "account_update",
        "change": {
          "account_id": "your_account.testnet",
          "amount": "499999959035075000000000000",
          "locked": "0",
          "code_hash": "11111111111111111111111111111111",
          "storage_usage": 264,
          "storage_paid_at": 0
        }
      }
    ]
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

### View contract code {#view-contract-code}

> Returns the contract code (Wasm binary) deployed to the account. Please note that the returned code will be encoded in base64.

- method: `query`
- params:
  - `request_type`: `view_code`
  - [`finality`](/docs/api/rpc#using-finality-param) _OR_ [`block_id`](/docs/api/rpc#using-block_id-param)
  - `account_id`: `"guest-book.testnet"`,

Example:

<Tabs>
<TabItem value="json" label="JSON" default>

```json
{
  "jsonrpc": "2.0",
  "id": "dontcare",
  "method": "query",
  "params": {
    "request_type": "view_code",
    "finality": "final",
    "account_id": "guest-book.testnet"
  }
}
```

</TabItem>
<TabItem value="js" label="JavaScript">

```js
const response = await near.connection.provider.query({
  request_type: "view_code",
  finality: "final",
  account_id: "guest-book.testnet",
});
```

</TabItem>
<TabItem value="http" label="HTTPie">

```bash
http post https://rpc.testnet.near.org jsonrpc=2.0 id=dontcare method=query \
  params:='{
    "request_type": "view_code",
    "finality": "final",
    "account_id": "guest-book.testnet"
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
    "code_base64": "47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=",
    "hash": "7KoFshMQkdyo5iTx8P2LbLu9jQpxRn24d27FrKShNVXs",
    "block_height": 17814234,
    "block_hash": "GT1D8nweVQU1zyCUv399x8vDv2ogVq71w17MyR66hXBB"
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

Here is the exhaustive list of the error variants that can be returned by `view_code` request type:

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
      <td>NO_CONTRACT_CODE</td>
      <td>The account does not have any <code>contract</code> deployed on it</td>
      <td>
        <ul>
          <li>Use different account</li>
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

### View contract state {#view-contract-state}

> Returns the state (key value pairs) of a contract based on the key prefix (base64 encoded). Pass an empty string for `prefix_base64` if you would like to return the entire state. Please note that the returned state will be base64 encoded as well.

- method: `query`
- params:
  - `request_type`: `view_state`
  - [`finality`](/docs/api/rpc#using-finality-param) _OR_ [`block_id`](/docs/api/rpc#using-block_id-param)
  - `account_id`: `"guest-book.testnet"`,
  - `prefix_base64`: `""`

Example:

<Tabs>
<TabItem value="json" label="JSON" default>

```json
{
  "jsonrpc": "2.0",
  "id": "dontcare",
  "method": "query",
  "params": {
    "request_type": "view_state",
    "finality": "final",
    "account_id": "guest-book.testnet",
    "prefix_base64": ""
  }
}
```

</TabItem>
<TabItem value="js" label="JavaScript">

```js
const response = await near.connection.provider.query({
  request_type: "view_state",
  finality: "final",
  account_id: "guest-book.testnet",
  prefix_base64: "",
});
```

</TabItem>
<TabItem value="http" label="HTTPie">

```bash
http post https://rpc.testnet.near.org jsonrpc=2.0 id=dontcare method=query \
  params:='{
    "request_type": "view_state",
    "finality": "final",
    "account_id": "guest-book.testnet",
    "prefix_base64": ""
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
    "values": [
      {
        "key": "bTo6MA==",
        "value": "eyJwcmVtaXVtIjp0cnVlLCJzZW5kZXIiOiJqb3NoZm9yZC50ZXN0bmV0IiwidGV4dCI6ImhlbGxvIn0=",
        "proof": []
      },
      {
        "key": "bTo6MQ==",
        "value": "eyJwcmVtaXVtIjpmYWxzZSwic2VuZGVyIjoiY2hhZG9oIiwidGV4dCI6ImhlbGxvIGVyeWJvZHkifQ==",
        "proof": []
      },
      {
        "key": "bTo6MTA=",
        "value": "eyJwcmVtaXVtIjpmYWxzZSwic2VuZGVyIjoic2F0b3NoaWYudGVzdG5ldCIsInRleHQiOiJIaWxsbyEifQ==",
        "proof": []
      },
      {
        "key": "bTo6MTE=",
        "value": "eyJwcmVtaXVtIjpmYWxzZSwic2VuZGVyIjoidmFsZW50aW5lc29rb2wudGVzdG5ldCIsInRleHQiOiJIaSEifQ==",
        "proof": []
      },
      {
        "key": "bTo6MTI=",
        "value": "eyJwcmVtaXVtIjp0cnVlLCJzZW5kZXIiOiJobngudGVzdG5ldCIsInRleHQiOiJoZWxsbyJ9",
        "proof": []
      },
      {
        "key": "bTo6MTM=",
        "value": "eyJwcmVtaXVtIjp0cnVlLCJzZW5kZXIiOiJobngudGVzdG5ldCIsInRleHQiOiJzZCJ9",
        "proof": []
      },
      {
        "key": "bTo6MTQ=",
        "value": "eyJwcmVtaXVtIjpmYWxzZSwic2VuZGVyIjoiamdoZy50ZXN0bmV0IiwidGV4dCI6IktoZyJ9",
        "proof": []
      },
      {
        "key": "bTo6MTU=",
        "value": "eyJwcmVtaXVtIjpmYWxzZSwic2VuZGVyIjoiYWNjb3VudC50ZXN0bmV0IiwidGV4dCI6IldoZW4gSUNPPyJ9",
        "proof": []
      },
      {
        "key": "bTo6MTY=",
        "value": "eyJwcmVtaXVtIjpmYWxzZSwic2VuZGVyIjoiYWNjb3VudC50ZXN0bmV0IiwidGV4dCI6IlRlc3QgMiJ9",
        "proof": []
      },
      {
        "key": "bTo6MTc=",
        "value": "eyJwcmVtaXVtIjpmYWxzZSwic2VuZGVyIjoidGVzdC1kcm9wLTEwLnRlc3RuZXQiLCJ0ZXh0IjoiRnJlZSBtZXNzYWdlcyBhcmUgdGhlIGJlc3QifQ==",
        "proof": []
      },
      {
        "key": "bTo6MTg=",
        "value": "eyJwcmVtaXVtIjpmYWxzZSwic2VuZGVyIjoidGVzdC1kcm9wLTEwLnRlc3RuZXQiLCJ0ZXh0IjoiV2hlbiBJQ08/In0=",
        "proof": []
      },
      {
        "key": "bTo6MTk=",
        "value": "eyJwcmVtaXVtIjpmYWxzZSwic2VuZGVyIjoidGVzdC1kcm9wLTEwLnRlc3RuZXQiLCJ0ZXh0IjoiV2hlbiBJQ08/In0=",
        "proof": []
      },
      {
        "key": "bTo6Mg==",
        "value": "eyJwcmVtaXVtIjpmYWxzZSwic2VuZGVyIjoibnVsbCIsInRleHQiOiJ1bmRlZmluZWQifQ==",
        "proof": []
      },
      {
        "key": "bTo6MjA=",
        "value": "eyJwcmVtaXVtIjpmYWxzZSwic2VuZGVyIjoidGVzdC04NDEudGVzdG5ldCIsInRleHQiOiJXaGVuIElDTz8ifQ==",
        "proof": []
      },
      {
        "key": "bTo6MjE=",
        "value": "eyJwcmVtaXVtIjpmYWxzZSwic2VuZGVyIjoidGVzdC04NDEudGVzdG5ldCIsInRleHQiOiJoZXkgaGV5IGhleSJ9",
        "proof": []
      },
      {
        "key": "bTo6MjI=",
        "value": "eyJwcmVtaXVtIjpmYWxzZSwic2VuZGVyIjoiam9zaGZvcmQudGVzdG5ldCIsInRleHQiOiJoaSJ9",
        "proof": []
      },
      {
        "key": "bTo6MjM=",
        "value": "eyJwcmVtaXVtIjpmYWxzZSwic2VuZGVyIjoiam9zaGZvcmQudGVzdG5ldCIsInRleHQiOiJoaSB4MiJ9",
        "proof": []
      },
      {
        "key": "bTo6MjQ=",
        "value": "eyJwcmVtaXVtIjpmYWxzZSwic2VuZGVyIjoibWFzdGVydGh5c2VsZi50ZXN0bmV0IiwidGV4dCI6ImhhbmRzaGFrZS5oYWNrbWVkb21haW4vICJ9",
        "proof": []
      },
      {
        "key": "bTo6MjU=",
        "value": "eyJwcmVtaXVtIjp0cnVlLCJzZW5kZXIiOiJtYXN0ZXJ0aHlzZWxmLnRlc3RuZXQiLCJ0ZXh0IjoiSGVsbG8gQ29zbW9zLCBob21lLmNvc21hdHJpeGNvbm5lY3Rpb25zLyJ9",
        "proof": []
      },
      {
        "key": "bTo6MjY=",
        "value": "eyJwcmVtaXVtIjp0cnVlLCJzZW5kZXIiOiJtYXN0ZXJ0aHlzZWxmLnRlc3RuZXQiLCJ0ZXh0IjoiYnVpbGQsIGJ1aWxkLCBidWlsZCBpIGNhbWUgdG8gYnVpbGQgYSBicmlkZ2UgaW4gUEVBQ0UsIHNvIGNvbWUgbGV0cyBidWlsZC4uLnNvbmcgYnkgXCJOYWhrbyBCZWFyXCIgIn0=",
        "proof": []
      },
      {
        "key": "bTo6Mjc=",
        "value": "eyJwcmVtaXVtIjp0cnVlLCJzZW5kZXIiOiJtYXN0ZXJ0aHlzZWxmLnRlc3RuZXQiLCJ0ZXh0IjoiYnVpbGQgYSBicmlkZ2UgKGh0dHBzOi8vd3d3Lmdvb2dsZS5jb20vdXJsP3NhPXQmcmN0PWomcT0mZXNyYz1zJnNvdXJjZT13ZWImY2Q9JmNhZD1yamEmdWFjdD04JnZlZD0yYWhVS0V3ajA0ZGlnMTlqckFoV05tbGtLSGR5X0FnUVEzeXd3QUhvRUNBVVFBZyZ1cmw9aHR0cHMlM0ElMkYlMkZ3d3cueW91dHViZS5jb20lMkZ3YXRjaCUzRnYlM0Rlb1RYNWZmOVplMCZ1c2c9QU92VmF3MFoxZzFIMkZzeF85d3FJSmg5RTk2UCkifQ==",
        "proof": []
      },
      {
        "key": "bTo6Mjg=",
        "value": "eyJwcmVtaXVtIjp0cnVlLCJzZW5kZXIiOiJtYXN0ZXJ0aHlzZWxmLnRlc3RuZXQiLCJ0ZXh0IjoiaHR0cDovL3RyaXBweS7wn42EbWFnaWMvIn0=",
        "proof": []
      },
      {
        "key": "bTo6Mjk=",
        "value": "eyJwcmVtaXVtIjp0cnVlLCJzZW5kZXIiOiJtYXN0ZXJ0aHlzZWxmLnRlc3RuZXQiLCJ0ZXh0IjoiaHR0cDovL3VuaXRlLnJhaW5ib3d0cmliZXMvIn0=",
        "proof": []
      },
      {
        "key": "bTo6Mw==",
        "value": "eyJwcmVtaXVtIjpmYWxzZSwic2VuZGVyIjoiam9zaGZvcmQudGVzdG5ldCIsInRleHQiOiJobW1tbW1tIn0=",
        "proof": []
      },
      {
        "key": "bTo6MzA=",
        "value": "eyJwcmVtaXVtIjpmYWxzZSwic2VuZGVyIjoiZXhlbXBsYXJ5LnRlc3RuZXQiLCJ0ZXh0IjoiaGVsbG8ifQ==",
        "proof": []
      },
      {
        "key": "bTo6MzE=",
        "value": "eyJwcmVtaXVtIjpmYWxzZSwic2VuZGVyIjoiYWRpMjMudGVzdG5ldCIsInRleHQiOiJobW0ifQ==",
        "proof": []
      },
      {
        "key": "bTo6MzI=",
        "value": "eyJwcmVtaXVtIjpmYWxzZSwic2VuZGVyIjoiYWRpMjMudGVzdG5ldCIsInRleHQiOiJ3aGF0In0=",
        "proof": []
      },
      {
        "key": "bTo6MzM=",
        "value": "eyJwcmVtaXVtIjpmYWxzZSwic2VuZGVyIjoidmxhZGJhc2gudGVzdG5ldCIsInRleHQiOiJIaSJ9",
        "proof": []
      },
      {
        "key": "bTo6NA==",
        "value": "eyJwcmVtaXVtIjpmYWxzZSwic2VuZGVyIjoibnVsbCIsInRleHQiOiIgIn0=",
        "proof": []
      },
      {
        "key": "bTo6NQ==",
        "value": "eyJwcmVtaXVtIjp0cnVlLCJzZW5kZXIiOiJ0ZXN0YWNjb3VudDEudGVzdG5ldCIsInRleHQiOiJ0ZXN0In0=",
        "proof": []
      },
      {
        "key": "bTo6Ng==",
        "value": "eyJwcmVtaXVtIjpmYWxzZSwic2VuZGVyIjoiZXVnZW5ldGhlZHJlYW0iLCJ0ZXh0IjoibnVsbCJ9",
        "proof": []
      },
      {
        "key": "bTo6Nw==",
        "value": "eyJwcmVtaXVtIjpmYWxzZSwic2VuZGVyIjoiZGVtby50ZXN0bmV0IiwidGV4dCI6Ikkgb25seSB3cml0ZSBmcmVlIG1lc3NhZ2VzLiJ9",
        "proof": []
      },
      {
        "key": "bTo6OA==",
        "value": "eyJwcmVtaXVtIjp0cnVlLCJzZW5kZXIiOiJqb3NoZm9yZC50ZXN0bmV0IiwidGV4dCI6IkkgcHJlZmVyIHByZW1pdW0gbWVzc2FnZXMifQ==",
        "proof": []
      },
      {
        "key": "bTo6OQ==",
        "value": "eyJwcmVtaXVtIjp0cnVlLCJzZW5kZXIiOiJuZXdsZWRnZXIzLnRlc3RuZXQiLCJ0ZXh0IjoiTGVkZ2VyIn0=",
        "proof": []
      },
      {
        "key": "bTpsZW4=",
        "value": "MzQ=",
        "proof": []
      }
    ],
    "proof": [],
    "block_height": 17814234,
    "block_hash": "GT1D8nweVQU1zyCUv399x8vDv2ogVq71w17MyR66hXBB"
  },
  "id": "dontcare"
}
```

</p>
</details>

> **Heads up**
>
> There is a limitation on default RPC nodes. You won't be able to get the contract state if it is too big. The default limit of for contract state is 50kb of state size. You're able to change the limits if you [run your own RPC node](https://near-nodes.io/validator/compile-and-run-a-node) with adjusted `trie_viewer_state_size_limit` value in `config.json`

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

Here is the exhaustive list of the error variants that can be returned by `view_state` request type:

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
      <td rowspan="7">HANDLER_ERROR</td>
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
      <td>NO_CONTRACT_CODE</td>
      <td>The account does not have any <code>contract</code> deployed on it</td>
      <td>
        <ul>
          <li>Query and account with contract deployed</li>
          <li>Specify a different block or retry if you request the latest state</li>
        </ul>
      </td>
    </tr>
    <tr>
      <td>TOO_LARGE_CONTRACT_STATE</td>
      <td>The requested contract state is too large to be returned from this node (the default limit is 50kb of state size)</td>
      <td>
        <ul>
          <li>Send the request to a node with larger limits in order to view the requested state</li>
          <li>Spin up your own node where you can increase the limits to view state</li>
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

### View contract state changes {#view-contract-state-changes}

> Returns the state change details of a contract based on the key prefix (encoded to base64). Pass an empty string for this param if you would like to return all state changes.

- method: `EXPERIMENTAL_changes`
- params:
  - `changes_type`: `data_changes`
  - `account_ids`: `["example.testnet"]`,
  - `key_prefix_base64`: `"base64 encoded key value"`,
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
    "changes_type": "data_changes",
    "account_ids": ["guest-book.testnet"],
    "key_prefix_base64": "",
    "block_id": 19450732
  }
}
```

</TabItem>
<TabItem value="js" label="JavaScript">

```js
const response = await near.connection.provider.experimental_changes({
  changes_type: "data_changes",
  account_ids: ["guest-book.testnet"],
  key_prefix_base64: "",
  block_id: 19450732,
});
```

</TabItem>
<TabItem value="http" label="HTTPie">

```bash
http post https://rpc.testnet.near.org jsonrpc=2.0 id=dontcare method=EXPERIMENTAL_changes \
  params:='{
    "changes_type": "data_changes",
    "account_ids": ["guest-book.testnet"],
    "key_prefix_base64": "",
    "block_id": 19450732
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
    "block_hash": "6U8Yd4JFZwJUNfqkD4KaKgTKmpNSmVRTSggpjmsRWdKY",
    "changes": [
      {
        "cause": {
          "type": "receipt_processing",
          "receipt_hash": "9ewznXgs2t7vRCssxW4thgaiwggnMagKybZ7ryLNTT2z"
        },
        "type": "data_update",
        "change": {
          "account_id": "guest-book.testnet",
          "key_base64": "bTo6Mzk=",
          "value_base64": "eyJwcmVtaXVtIjpmYWxzZSwic2VuZGVyIjoiZmhyLnRlc3RuZXQiLCJ0ZXh0IjoiSGkifQ=="
        }
      },
      {
        "cause": {
          "type": "receipt_processing",
          "receipt_hash": "9ewznXgs2t7vRCssxW4thgaiwggnMagKybZ7ryLNTT2z"
        },
        "type": "data_update",
        "change": {
          "account_id": "guest-book.testnet",
          "key_base64": "bTpsZW4=",
          "value_base64": "NDA="
        }
      }
    ]
  },
  "id": "dontcare"
}
```

</p>
</details>

#### What could go wrong? {#what-could-go-wrong-4}

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

### View contract code changes {#view-contract-code-changes}

> Returns code changes made when deploying a contract. Change is returned is a base64 encoded WASM file.

- method: `EXPERIMENTAL_changes`
- params:
  - `changes_type`: `contract_code_changes`
  - `account_ids`: `["example.testnet"]`,
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
    "changes_type": "contract_code_changes",
    "account_ids": ["dev-1602714453032-7566969"],
    "block_id": 20046655
  }
}
```

</TabItem>
<TabItem value="js" label="JavaScript">

```js
const response = await near.connection.provider.experimental_changes({
  changes_type: "contract_code_changes",
  account_ids: ["dev-1602714453032-7566969"],
  block_id: 20046655,
});
```

</TabItem>
<TabItem value="http" label="HTTPie">

```bash
http post https://rpc.testnet.near.org jsonrpc=2.0 id=dontcare method=EXPERIMENTAL_changes \
  params:='{
    "changes_type": "contract_code_changes",
    "account_ids": ["dev-1602714453032-7566969"],
    "block_id": 20046655
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
    "block_hash": "3yLNV5zdpzRJ8HP5xTXcF7jdFxuHnmKNUwWcok4616WZ",
    "changes": [
      {
        "cause": {
          "type": "receipt_processing",
          "receipt_hash": "CEm3NNaNdu9cijh9NvZMM1srbtEYSsBVwGbZxFQYKt5B"
        },
        "type": "contract_code_update",
        "change": {
          "account_id": "dev-1602714453032-7566969",
          "code_base64": "AGFzbQEAAAABpAM3YAF/AGAAAX9gAn9+AGADf35+AGAEf35+fgF+YAZ/fn5+fn4BfmADf35+AX5gAn9+AX5gAn9/AX9gAn9/AGADf39/AX9gAX8BfmACfn4AYAF+AX5gAX4AYAABfmADfn5+AGAAAGAIfn5+fn5+fn4BfmAJfn5+fn5+fn5+AX5gAn5+AX5gA35+fgF+YAd+fn5+fn5+AGAEfn5+fgBgCX5+fn5+fn5+fgBgBX5+fn5+AX5gA39/fwBgAX8Bf2ACf3wAYAR/f39+AGAFf39/fn8AYAV/f39/fwBgBH9/f38AYAN/f38BfmADf39+AGACf38BfmAFf39/f38Bf2AEf39/fwF/YAZ/f39/f38AYAV/f35/fwBgBH9+f38Bf2ACf34Bf2AHf35+f39+fwBgBX9/f39+AGAEf35+fgBgCX9+fn5+fn5+fgF+YAp/fn5+fn5+fn5+AX5gCH9+fn5+fn5+AGAFf35+fn4AYAp/fn5+fn5+fn5+AGAHf39/f39/fwBgBH98f38Bf2AGf39/f39..."
        }
      }
    ]
  },
  "id": "dontcare"
}
```

</p>
</details>

#### What could go wrong? {#what-could-go-wrong-5}

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

### Call a contract function {#call-a-contract-function}

> Allows you to call a contract method as a [view function](/docs/develop/contracts/as/intro#view-and-change-functions).

- method: `query`
- params:
  - `request_type`: `call_function`
  - [`finality`](/docs/api/rpc#using-finality-param) _OR_ [`block_id`](/docs/api/rpc#using-block_id-param)
  - `account_id`: _`"example.testnet"`_
  - `method_name`: `name_of_a_example.testnet_method`
  - `args_base64`: `method_arguments_base_64_encoded`

Example:

<Tabs>
<TabItem value="json" label="JSON" default>

```json
{
  "jsonrpc": "2.0",
  "id": "dontcare",
  "method": "query",
  "params": {
    "request_type": "call_function",
    "finality": "final",
    "account_id": "dev-1588039999690",
    "method_name": "get_num",
    "args_base64": "e30="
  }
}
```

</TabItem>
<TabItem value="js" label="JavaScript">

```js
const response = await near.connection.provider.query({
  request_type: "call_function",
  finality: "final",
  account_id: "dev-1588039999690",
  method_name: "get_num",
  args_base64: "e30=",
});
```

</TabItem>
<TabItem value="http" label="HTTPie">

```bash
http post https://rpc.testnet.near.org jsonrpc=2.0 id=dontcare method=query \
  params:='{
    "request_type": "call_function",
    "finality": "final",
    "account_id": "dev-1588039999690",
    "method_name": "get_num",
    "args_base64": "e30="
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
    "result": [48],
    "logs": [],
    "block_height": 17817336,
    "block_hash": "4qkA4sUUG8opjH5Q9bL5mWJTnfR4ech879Db1BZXbx6P"
  },
  "id": "dontcare"
}
```

**Note**: `[48]` is an array of bytes, to be specific it is an ASCII code of `0`.`near-sdk-rs` and `near-sdk-as` return JSON-serialized results.

</p>
</details>

#### What could go wrong? {#what-could-go-wrong-6}

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

Here is the exhaustive list of the error variants that can be returned by `call_function` request type:

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
      <td rowspan="7">HANDLER_ERROR</td>
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
      <td>NO_CONTRACT_CODE</td>
      <td>The requested <code>contract_code</code> has not been found while viewing</td>
      <td>
        <ul>
          <li>Check the <code>public_key</code></li>
          <li>Specify a different block or retry if you request the latest state</li>
        </ul>
      </td>
    </tr>
    <tr>
      <td>CONTRACT_EXECUTION_ERROR</td>
      <td>The execution of the view method call failed (crashed, run out of the default 200 TGas limit, etc)</td>
      <td>
        <ul>
          <li>Check <code>error.cause.info</code> for more details</li>
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
