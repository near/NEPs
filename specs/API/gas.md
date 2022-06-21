---
id: gas
title: RPC Endpoints
sidebar_label: Gas
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';


## Gas {#gas}

---

### Gas Price {#gas-price}

> Returns gas price for a specific `block_height` or `block_hash`.
>
> - Using `[null]` will return the most recent block's gas price.

- method: `gas_price`
- params: `[block_height]`, `["block_hash"]`, or `[null]`

`[block_height]`

<Tabs>
<TabItem value="json" label="JSON" default>

```json
{
  "jsonrpc": "2.0",
  "id": "dontcare",
  "method": "gas_price",
  "params": [17824600]
}
```

</TabItem>
<TabItem value="js" label="JavaScript">

```js
const response = await near.connection.provider.gasPrice(17824600);
```

</TabItem>
<TabItem value="http" label="HTTPie">

```bash
http post https://rpc.testnet.near.org jsonrpc=2.0 method=gas_price params:='[17824600]' id=dontcare
```

</TabItem>
</Tabs>

`["block_hash"]`

<Tabs>
<TabItem value="json" label="JSON" default>

```json
{
  "jsonrpc": "2.0",
  "id": "dontcare",
  "method": "gas_price",
  "params": ["AXa8CHDQSA8RdFCt12rtpFraVq4fDUgJbLPxwbaZcZrj"]
}
```

</TabItem>
<TabItem value="js" label="JavaScript">

```js
const response = await near.connection.provider.gasPrice(
  "AXa8CHDQSA8RdFCt12rtpFraVq4fDUgJbLPxwbaZcZrj"
);
```

</TabItem>
<TabItem value="http" label="HTTPie">

```bash
http post https://rpc.testnet.near.org jsonrpc=2.0 method=gas_price params:='["AXa8CHDQSA8RdFCt12rtpFraVq4fDUgJbLPxwbaZcZrj"]' id=dontcare
```

</TabItem>
</Tabs>

`[null]`

<Tabs>
<TabItem value="json" label="JSON" default>

```json
{
  "jsonrpc": "2.0",
  "id": "dontcare",
  "method": "gas_price",
  "params": [null]
}
```

</TabItem>
<TabItem value="js" label="JavaScript">

```js
const response = await near.connection.provider.gasPrice(null);
```

</TabItem>
<TabItem value="http" label="HTTPie">

```bash
http post https://rpc.testnet.near.org jsonrpc=2.0 method=gas_price params:='[null]' id=dontcare
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
    "gas_price": "100000000"
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

Here is the exhaustive list of the error variants that can be returned by `gas_price` method:

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
          <li>If the block had been produced more than 5 epochs ago, try to send your request to an archival node</li>
        </ul>
      </td>
    </tr>
    <tr>
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
