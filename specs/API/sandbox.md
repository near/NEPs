---
id: sandbox
title: RPC Endpoints
sidebar_label: Sandbox
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';


## Sandbox {#sandbox}

<blockquote class="warning">
<strong>heads up</strong><br /><br />

RPC endpoints in this section are ***only*** available on the local sandbox node.

</blockquote>

---

### Patch State {#patch-state}

> Patch account, access keys, contract code, or contract state. Only additions and mutations are supported. No deletions.
Account, access keys, contract code, and contract states have different formats. See the example for details about their format.
- method: `sandbox_patch_state`
- params:
  - `records`: an array of state records to patch. Every state record can be one of `Account`, `AccessKey`, `Contract` (for contract code), or `Data` (for contract state).

Example:

<Tabs>
<TabItem value="json" label="JSON" default>

```json
{
  "jsonrpc": "2.0",
  "id": "dontcare",
  "method": "sandbox_patch_state",
  "params": {
    "records": [
      {
        "Account": {
          "account_id": "abcdef.test.near",
          "account": {
            "amount": "100000000000",
            "locked": "0",
            "code_hash": "7KoFshMQkdyo5iTx8P2LbLu9jQpxRn24d27FrKShNVXs",
            "storage_usage": 200000
          }
        }
      },
      {
        "Contract": {
          "account_id": "abcdef.test.near",
          "code": "47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU="
        }
      },
      {
        "AccessKey": {
          "account_id": "abcdef.test.near",
          "public_key": "ed25519:CngrirkGDwSS75EKczcsUsciRtMmHd9iicrrYxz4uckD",
          "access_key": {
            "nonce": 0,
            "permission": "FullAccess"
          }
        }
      },
      {
        "Data": {
          "account_id": "abcdef.test.near",
          "data_key": "U1RBVEU=",
          "value": "AwAAAA8AAABhbGljZS50ZXN0Lm5lYXIFAAAAaGVsbG8NAAAAYm9iLnRlc3QubmVhcgUAAAB3b3JsZAoAAABhbGljZS5uZWFyCwAAAGhlbGxvIHdvcmxk"
        }
      }
    ]
  }
}
```

</TabItem>
</Tabs>

<details><summary>Example response:</summary>
<p>

```json
{
  "id": "dontcare",
  "jsonrpc": "2.0",
  "result": {}
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

Here is the exhaustive list of the error variants that can be returned by `sandbox_patch_state` method:

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
