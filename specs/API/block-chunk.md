---
id: block-chunk
title: RPC Endpoints
sidebar_label: "Block / Chunk"
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

## Block {#block}

---

### Block details {#block-details}

> Queries network and returns block for given height or hash. You can also use `finality` param to return latest block details.

**Note**: You may choose to search by a specific block _or_ finality, you can not choose both.

- method: `block`
- params:
  - [`finality`](/docs/api/rpc#using-finality-param) _OR_ [`block_id`](/docs/api/rpc#using-block_id-param)

`finality` example:


<Tabs>
<TabItem value="json" label="JSON" default>

```json
{
  "jsonrpc": "2.0",
  "id": "dontcare",
  "method": "block",
  "params": {
    "finality": "final"
  }
}
```

</TabItem>
<TabItem value="js" label="JavaScript">

```js
const response = await near.connection.provider.block({
  finality: "final",
});
```

</TabItem>
<TabItem value="http" label="HTTPie">

```bash
http post https://rpc.testnet.near.org jsonrpc=2.0 id=dontcare method=block \
  params:='{
    "finality": "final"
  }'
```

</TabItem>
</Tabs>

`[block_id]`


<Tabs>
<TabItem value="json" label="JSON" default>

```json
{
  "jsonrpc": "2.0",
  "id": "dontcare",
  "method": "block",
  "params": {
    "block_id": 17821130
  }
}
```

</TabItem>
<TabItem value="js" label="JavaScript">

```js
const response = await near.connection.provider.block(17821130);
```

</TabItem>
<TabItem value="http" label="HTTPie">

```bash
http post https://rpc.testnet.near.org jsonrpc=2.0 id=dontcare method=block \
  params:='{
    "block_id": 17821130
  }'
```

</TabItem>
</Tabs>

`[block_hash]`


<Tabs>
<TabItem value="json" label="JSON" default>

```json
{
  "jsonrpc": "2.0",
  "id": "dontcare",
  "method": "block",
  "params": {
    "block_id": "7nsuuitwS7xcdGnD9JgrE22cRB2vf2VS4yh1N9S71F4d"
  }
}
```

</TabItem>
<TabItem value="js" label="JavaScript">

```js
const response = await near.connection.provider.block(
  "7nsuuitwS7xcdGnD9JgrE22cRB2vf2VS4yh1N9S71F4d"
);
```

</TabItem>
<TabItem value="http" label="HTTPie">

```bash
http post https://rpc.testnet.near.org jsonrpc=2.0 id=dontcare method=block \
  params:='{
    "block_id": "7nsuuitwS7xcdGnD9JgrE22cRB2vf2VS4yh1N9S71F4d"
  }'
```

</TabItem>
</Tabs>

<details>
<summary>Example response:</summary>
<p>

```json
{
  "jsonrpc": "2.0",
  "result": {
    "author": "bitcat.pool.f863973.m0",
    "header": {
      "height": 17821130,
      "epoch_id": "7Wr3GFJkYeCxjVGz3gDaxvAMUzXuzG8MjFXTFoAXB6ZZ",
      "next_epoch_id": "A5AdnxEn7mfHieQ5fRxx9AagCkHNJz6wr61ppEXiWvvh",
      "hash": "CLo31YCUhzz8ZPtS5vXLFskyZgHV5qWgXinBQHgu9Pyd",
      "prev_hash": "2yUTTubrv1gJhTUVnHXh66JG3qxStBqySoN6wzRzgdVD",
      "prev_state_root": "5rSz37fySS8XkVgEy3FAZwUncX4X1thcSpuvCgA6xmec",
      "chunk_receipts_root": "9ETNjrt6MkwTgSVMMbpukfxRshSD1avBUUa4R4NuqwHv",
      "chunk_headers_root": "HMpEoBhPvThWZvppLwrXQSSfumVdaDW7WfZoCAPtjPfo",
      "chunk_tx_root": "7tkzFg8RHBmMw1ncRJZCCZAizgq4rwCftTKYLce8RU8t",
      "outcome_root": "7tkzFg8RHBmMw1ncRJZCCZAizgq4rwCftTKYLce8RU8t",
      "chunks_included": 1,
      "challenges_root": "11111111111111111111111111111111",
      "timestamp": 1601280114229875635,
      "timestamp_nanosec": "1601280114229875635",
      "random_value": "ACdUSF3nehbMTwT7qjUB6Mm4Ynck5TVAWbNH3DR1cjQ7",
      "validator_proposals": [],
      "chunk_mask": [true],
      "gas_price": "100000000",
      "rent_paid": "0",
      "validator_reward": "0",
      "total_supply": "1042339182040791154864822502764857",
      "challenges_result": [],
      "last_final_block": "AaxTqjYND5WAKbV2UZaFed6DH1DShN9fEemtnpTsv3eR",
      "last_ds_final_block": "2yUTTubrv1gJhTUVnHXh66JG3qxStBqySoN6wzRzgdVD",
      "next_bp_hash": "3ZNEoFYh2CQeJ9dc1pLBeUd1HWG8657j2c1v72ENE45Q",
      "block_merkle_root": "H3912Nkw6rtamfjsjmafe2uV2p1XmUKDou5ywgxb1gJr",
      "approvals": [
        "ed25519:4hNtc9vLhn2PQhktWtLKJV9g8SBfpm6NBT1w4syNFqoKE7ZMts2WwKA9x1ZUSBGVKYCuDGEqogLvwCF25G7e1UR3",
        "ed25519:2UNmbTqysMMevVPqJEKSq57hkcxVFcAMdGq7CFhpW65yBKFxYwpoziiWsAtARusLn9Sy1eXM7DkGTXwAqFiSooS6",
        "ed25519:4sumGoW9dnQCsJRpzkd4FQ5NSJypGQRCppWp7eQ9tpsEcJXjHZN8GVTCyeEk19WmbbMEJ5KBNypryyHzaH2gBxd4",
        "ed25519:3fP2dri6GjYkmHgEqQWWP9GcoQEgakbaUtfr3391tXtYBgxmiJUEymRe54m7D8bQrSJ3LhKD8gTFT7qqdemRnizR",
        "ed25519:3mwdqSWNm6RiuZAoZhD6pqsirC2cL48nEZAGoKixpqbrsBpAzqV3W2paH4KtQQ4JPLvk5pnzojaint2kNBCcUyq1",
        "ed25519:D4hMnxqLyQW4Wo29MRNMej887GH46yJXDKNN4es8UDSi9shJ9Y4FcGqkxdV4AZhn1yUjwN5LwfgAgY6fyczk5L3",
        null,
        "ed25519:4WCVm4dn88VJxTkUgcvdS7vs34diBqtQY4XWMRctSN1NpbgdkwwVyxg7d2SbGC22SuED7w4nrToMhcpJXrkhkDmF",
        "ed25519:JqtC7TFP7U14s7YhRKQEqwbc2RUxoctq75mrBdX91f7DuCWsPpe6ZTTnfHPmuJPjTzFHVZTsaQJWzwfSrrgNpnc",
        "ed25519:ngGUpWc2SyHmMCkWGTNNNfvZAJQ5z7P92JCmDqB7JW3j8fNH6LobvFFXb2zVdssibJKgnjwBj8CRe6qiZtuYQZM",
        "ed25519:5kzW6RbjukyJZiw9NTzTPPsQdoqN6EecafjVFEoWmTxQ4uSv1uSXhQYcHK2eq4m84oMmPABQDz2mm73Qx8mDdCQX",
        "ed25519:5wHnuuxwJJiZ4bXNq5cESnr4YovFU2yaUcuHRDUw3DnLoxkqc15CsegoyUSQKEwtCZ4yETv8Z9QcD6Wr9zHV4AUk",
        "ed25519:3F9XzWBxto31e8RAcBShAJBzJPgSJQsWbPXR38AfQnJn6AiveGz3JjebQm9Ye63BrnNA57QrPshwknxpzSrcNEZW",
        "ed25519:2g5s4SKsHt9PMdekkDqVtwwtz14v4edhqdBX1MYA8tB6nDpj3vDCDCTy9pEU8dX31PoQe5ygnf88aTZukMBMK1Yt",
        "ed25519:3Xz4jqhdyS3qs6xTmWdgjwt5gJraU5czMA89hPhmvbAN4aA7SUKL1HkevpmutRQqqxe7c7uCFeGiDHvDcxhhmD8W",
        null,
        "ed25519:55xs3vwPEys39egf9Z8SNyn1JsHPRMgj9HCX1GE7GJsVTcAuutQUCo91E12ZdXkuToYRXb9KzoT8n9XQRCNuLpwY",
        null,
        "ed25519:28JrFw7KnhnQPN89qZnnw17KDBjS6CDN7zB1hTg7KGg8qQPoCzakz9DNnaSnx39ji7e2fQSpZt4cNJaD7K7Yu7yo",
        "ed25519:41hAr5qhtvUYpdD2NK9qqTVnpG325ZoAiwrcmk1MJH7fdpxm7oSKXvXZqh7bTmPhv61hH2RpHnhcGuN4QqLzK2zt",
        "ed25519:4QacMsQ5FJgvecAYDFq8QBh19BBjh4qU8oeD5bV7p6Zhhu3e6r2iSHTvDBU2Q62RZAaWQQkkEwDUC9rsXdkGVhAt",
        "ed25519:27smtCZ3WobEvBuD5DggY6kkGxjB9qRVY6kPixgwqvBT1eKbRVoV8cLj1z51S8RTcp7YzAr1vhHJUHgksatR9Udz",
        "ed25519:4wspCWoAbhYxb3th2eX6ZXvKep1Fsco7mFP5zBodXBR8Wr344ANXSUCri3gUgNCCSoQ2CKSdqDEsvE6Y2jQ9hmbB",
        "ed25519:46XpYf9ZB9gjDfdnJLHqqhYJpQCuvCgB9tzKWS88GANMCb2j9BM3KXyjaEzynSsaPK8VrKFXQuTsTzgQSeo9cWGW",
        null,
        "ed25519:Y5ehsrhEpTRGjG6fHJHsEXj2NYPGMmKguiJHXP7TqsCWHBvNzaJbieR7UDp78hJ1ib7C18J5MB2kCzTXBCF9c3b",
        "ed25519:3P9363Dc8Kqvgjt3TsNRncUrncCHid7aSRnuySjF4JYmQbApkAxomyMu8xm9Rgo3mj9rqXb16PM7Xjn7hKP6TyVr",
        null,
        null,
        "ed25519:65ATjGsigZ3vMp7sGcp1c4ptxoqhHPkBeAaZ5GWJguVDLyrRLPJrtXhLGjH9DpXd7CZswjyMYq5aRtorLnmmJ7GW",
        null,
        "ed25519:5SvqSViXbtsLoFMdtCufyyDgZnrEK7LheFi38X5M2ic17gfV5cz37r85RyixjUv98MbAmgVdmkxVFDGfSbeoHW7X",
        null,
        null,
        "ed25519:2n3fQiBEiDKkB84biXWyQmvnupKX7B8faugY37jVi8hVXuWLggJmaEjqub511RCYwFnwW1RBxYpuJQ455KaniCd4",
        "ed25519:2K9xKFLJ2fW74tddXtghFGFurKWomAqaJmkKYVZKHQT6zHe5wNSYT3vzMotLQcez5JD1Ta57N9zQ4H1RysB2s5DZ",
        null,
        null,
        "ed25519:3qeCRtcLAqLtQ2YSQLcHDa26ykKX1BvAhP9jshLLYapxSEGGgZJY8sU72p9E78AkXwHP3X2Eq74jvts7gTRzNgMg",
        null,
        "ed25519:2czSQCF8wBDomEeSdDRH4gFoyJrp2ppZqR6JDaDGoYpaFkpWxZf2oGDkKfQLZMbfvU6LXkQjJssVHcLCJRMzG8co"
      ],
      "signature": "ed25519:58sdWd6kxzhQdCGvHzxqvdtDLJzqspe74f3gytnqdxDLHf4eesXi7B3nYq2YaosCHZJYmcR4HPHKSoFm3WE4MbxT",
      "latest_protocol_version": 35
    },
    "chunks": [
      {
        "chunk_hash": "EBM2qg5cGr47EjMPtH88uvmXHDHqmWPzKaQadbWhdw22",
        "prev_block_hash": "2yUTTubrv1gJhTUVnHXh66JG3qxStBqySoN6wzRzgdVD",
        "outcome_root": "11111111111111111111111111111111",
        "prev_state_root": "HqWDq3f5HJuWnsTfwZS6jdAUqDjGFSTvjhb846vV27dx",
        "encoded_merkle_root": "9zYue7drR1rhfzEEoc4WUXzaYRnRNihvRoGt1BgK7Lkk",
        "encoded_length": 8,
        "height_created": 17821130,
        "height_included": 17821130,
        "shard_id": 0,
        "gas_used": 0,
        "gas_limit": 1000000000000000,
        "rent_paid": "0",
        "validator_reward": "0",
        "balance_burnt": "0",
        "outgoing_receipts_root": "H4Rd6SGeEBTbxkitsCdzfu9xL9HtZ2eHoPCQXUeZ6bW4",
        "tx_root": "11111111111111111111111111111111",
        "validator_proposals": [],
        "signature": "ed25519:4iPgpYAcPztAvnRHjfpegN37Rd8dTJKCjSd1gKAPLDaLcHUySJHjexMSSfC5iJVy28vqF9VB4psz13x2nt92cbR7"
      }
    ]
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

Here is the exhaustive list of the error variants that can be returned by `block` method:

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

### Changes in Block {#changes-in-block}

> Returns changes in block for given block height or hash. You can also use `finality` param to return latest block details.

**Note**: You may choose to search by a specific block _or_ finality, you can not choose both.

- method: `EXPERIMENTAL_changes_in_block`
- params:
  - [`finality`](/docs/api/rpc#using-finality-param) _OR_ [`block_id`](/docs/api/rpc#using-block_id-param)

`finality`


<Tabs>
<TabItem value="json" label="JSON" default>

```json
{
  "jsonrpc": "2.0",
  "id": "dontcare",
  "method": "EXPERIMENTAL_changes_in_block",
  "params": {
    "finality": "final"
  }
}
```

</TabItem>
<TabItem value="js" label="JavaScript">

```js
const response = await near.connection.provider.experimental_changes_in_block({
  finality: "final",
});
```

</TabItem>
<TabItem value="http" label="HTTPie">

```bash
http post https://rpc.testnet.near.org jsonrpc=2.0 id=dontcare method=EXPERIMENTAL_changes_in_block \
  params:='{
    "finality": "final"
  }'
```

</TabItem>
</Tabs>

`[block_id]`


<Tabs>
<TabItem value="json" label="JSON" default>

```json
{
  "jsonrpc": "2.0",
  "id": "dontcare",
  "method": "EXPERIMENTAL_changes_in_block",
  "params": {
    "block_id": 17821135
  }
}
```

</TabItem>
<TabItem value="js" label="JavaScript">

```js
const response = await near.connection.provider.experimental_changes_in_block(
  17821135
);
```

</TabItem>
<TabItem value="http" label="HTTPie">

```bash
http post https://rpc.testnet.near.org jsonrpc=2.0 id=dontcare method=EXPERIMENTAL_changes_in_block \
  params:='{
    "block_id": 17821135
  }'
```

</TabItem>
</Tabs>

`block_hash`


<Tabs>
<TabItem value="json" label="JSON" default>

```json
{
  "jsonrpc": "2.0",
  "id": "dontcare",
  "method": "EXPERIMENTAL_changes_in_block",
  "params": {
    "block_id": "81k9ked5s34zh13EjJt26mxw5npa485SY4UNoPi6yYLo"
  }
}
```

</TabItem>
<TabItem value="js" label="JavaScript">

```js
const response = await near.connection.provider.experimental_changes_in_block(
  "81k9ked5s34zh13EjJt26mxw5npa485SY4UNoPi6yYLo"
);
```

</TabItem>
<TabItem value="http" label="HTTPie">

```bash
http post https://rpc.testnet.near.org jsonrpc=2.0 id=dontcare method=EXPERIMENTAL_changes_in_block \
  params:='{
    "block_id": "81k9ked5s34zh13EjJt26mxw5npa485SY4UNoPi6yYLo"
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
    "block_hash": "81k9ked5s34zh13EjJt26mxw5npa485SY4UNoPi6yYLo",
    "changes": [
      {
        "type": "account_touched",
        "account_id": "lee.testnet"
      },
      {
        "type": "contract_code_touched",
        "account_id": "lee.testnet"
      },
      {
        "type": "access_key_touched",
        "account_id": "lee.testnet"
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

## Chunk {#chunk}

---

### Chunk Details {#chunk-details}

> Returns details of a specific chunk. You can run a [block details](/docs/api/rpc#block-details) query to get a valid chunk hash.

- method: `chunk`
- params:
  - `chunk_id` _OR_ [`block_id`, `shard_id`](/docs/api/rpc#using-block_id-param)

`chunk_id` example:


<Tabs>
<TabItem value="json" label="JSON" default>

```json
{
  "jsonrpc": "2.0",
  "id": "dontcare",
  "method": "chunk",
  "params": {"chunk_id": "EBM2qg5cGr47EjMPtH88uvmXHDHqmWPzKaQadbWhdw22"}
}
```

</TabItem>
<TabItem value="js" label="JavaScript">

```js
const response = await near.connection.provider.chunk({
  chunk_id: "EBM2qg5cGr47EjMPtH88uvmXHDHqmWPzKaQadbWhdw22"
});
```

</TabItem>
<TabItem value="http" label="HTTPie">

```bash
http post https://rpc.testnet.near.org jsonrpc=2.0 method=chunk params:='{"chunk_id": "EBM2qg5cGr47EjMPtH88uvmXHDHqmWPzKaQadbWhdw22"}' id=dontcare
```

</TabItem>
</Tabs>

`block_id`, `shard_id` example:


<Tabs>
<TabItem value="json" label="JSON" default>

```json
{
  "jsonrpc": "2.0",
  "id": "dontcare",
  "method": "chunk",
  "params": {"block_id": 58934027, "shard_id": 0}
}
```

</TabItem>
<TabItem value="js" label="JavaScript">

```js
const response = await near.connection.provider.chunk({
  block_id: 58934027, shard_id: 0
});
```

</TabItem>
<TabItem value="http" label="HTTPie">

```bash
http post https://rpc.testnet.near.org jsonrpc=2.0 method=chunk params:='{"block_id": 58934027, "shard_id": 0}' id=dontcare
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
    "author": "bitcat.pool.f863973.m0",
    "header": {
      "chunk_hash": "EBM2qg5cGr47EjMPtH88uvmXHDHqmWPzKaQadbWhdw22",
      "prev_block_hash": "2yUTTubrv1gJhTUVnHXh66JG3qxStBqySoN6wzRzgdVD",
      "outcome_root": "11111111111111111111111111111111",
      "prev_state_root": "HqWDq3f5HJuWnsTfwZS6jdAUqDjGFSTvjhb846vV27dx",
      "encoded_merkle_root": "9zYue7drR1rhfzEEoc4WUXzaYRnRNihvRoGt1BgK7Lkk",
      "encoded_length": 8,
      "height_created": 17821130,
      "height_included": 17821130,
      "shard_id": 0,
      "gas_used": 0,
      "gas_limit": 1000000000000000,
      "rent_paid": "0",
      "validator_reward": "0",
      "balance_burnt": "0",
      "outgoing_receipts_root": "H4Rd6SGeEBTbxkitsCdzfu9xL9HtZ2eHoPCQXUeZ6bW4",
      "tx_root": "11111111111111111111111111111111",
      "validator_proposals": [],
      "signature": "ed25519:4iPgpYAcPztAvnRHjfpegN37Rd8dTJKCjSd1gKAPLDaLcHUySJHjexMSSfC5iJVy28vqF9VB4psz13x2nt92cbR7"
    },
    "transactions": [],
    "receipts": []
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

Here is the exhaustive list of the error variants that can be returned by `chunk` method:

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
      <td rowspan="4">HANDLER_ERROR</td>
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
      <td>UNKNOWN_CHUNK</td>
      <td>The requested chunk can't be found in a database</td>
      <td>
        <ul>
          <li>Check that the requested chunk is legit</li>
          <li>If the chunk had been produced more than 5 epochs ago, try to send your request to an archival node</li>
        </ul>
      </td>
    </tr>
    <tr>
      <td>INVALID_SHARD_ID</td>
      <td>Provided <code>shard_id</code> does not exist</td>
      <td>
        <ul>
          <li>Provide <code>shard_id</code> for an existing shard</li>
        </ul>
      </td>
    </tr>
    <tr>
      <td>NOT_SYNCED_YET</td>
      <td>The node is still syncing and the requested chunk is not in the database yet</td>
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
