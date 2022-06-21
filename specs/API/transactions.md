---
id: transactions
title: RPC Endpoints
sidebar_label: Transactions
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';


## Transactions {#transactions}

---

### Send transaction (async) {#send-transaction-async}

> Sends a transaction and immediately returns transaction hash.

- method: `broadcast_tx_async`
- params: [SignedTransaction encoded in base64]

Example:

<Tabs>
<TabItem value="json" label="JSON" default>

```json
{
  "jsonrpc": "2.0",
  "id": "dontcare",
  "method": "broadcast_tx_async",
  "params": [
    "DgAAAHNlbmRlci50ZXN0bmV0AOrmAai64SZOv9e/naX4W15pJx0GAap35wTT1T/DwcbbDwAAAAAAAAAQAAAAcmVjZWl2ZXIudGVzdG5ldNMnL7URB1cxPOu3G8jTqlEwlcasagIbKlAJlF5ywVFLAQAAAAMAAACh7czOG8LTAAAAAAAAAGQcOG03xVSFQFjoagOb4NBBqWhERnnz45LY4+52JgZhm1iQKz7qAdPByrGFDQhQ2Mfga8RlbysuQ8D8LlA6bQE="
  ]
}
```

</TabItem>
<TabItem value="http" label="HTTPie">

```bash
http post https://rpc.testnet.near.org jsonrpc=2.0 id=dontcare method=broadcast_tx_async \
    params:='[
        "DgAAAHNlbmRlci50ZXN0bmV0AOrmAai64SZOv9e/naX4W15pJx0GAap35wTT1T/DwcbbDwAAAAAAAAAQAAAAcmVjZWl2ZXIudGVzdG5ldNMnL7URB1cxPOu3G8jTqlEwlcasagIbKlAJlF5ywVFLAQAAAAMAAACh7czOG8LTAAAAAAAAAGQcOG03xVSFQFjoagOb4NBBqWhERnnz45LY4+52JgZhm1iQKz7qAdPByrGFDQhQ2Mfga8RlbysuQ8D8LlA6bQE="
    ]'
```

</TabItem>
</Tabs>

Example response:

```json
{
  "jsonrpc": "2.0",
  "result": "6zgh2u9DqHHiXzdy9ouTP7oGky2T4nugqzqt9wJZwNFm",
  "id": "dontcare"
}
```

Final transaction results can be queried using [Transaction Status](/docs/api/rpc/transactions#transaction-status)
or [NEAR Explorer](https://explorer.testnet.near.org/) using the above `result` hash returning a result similar to the example below.

![NEAR-Explorer-transactionHash](/images/NEAR-Explorer-transactionHash.png)

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

Here is the exhaustive list of the error variants that can be returned by `broadcast_tx_async` method:

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
  </tbody>
</table>

---

### Send transaction (await) {#send-transaction-await}

> Sends a transaction and waits until transaction is fully complete. _(Has a 10 second timeout)_

- method: `broadcast_tx_commit`
- params: `[SignedTransaction encoded in base64]`

Example:

<Tabs>
<TabItem value="json" label="JSON" default>

```json
{
  "jsonrpc": "2.0",
  "id": "dontcare",
  "method": "broadcast_tx_commit",
  "params": [
    "DgAAAHNlbmRlci50ZXN0bmV0AOrmAai64SZOv9e/naX4W15pJx0GAap35wTT1T/DwcbbDQAAAAAAAAAQAAAAcmVjZWl2ZXIudGVzdG5ldIODI4YfV/QS++blXpQYT+bOsRblTRW4f547y/LkvMQ9AQAAAAMAAACh7czOG8LTAAAAAAAAAAXcaTJzu9GviPT7AD4mNJGY79jxTrjFLoyPBiLGHgBi8JK1AnhK8QknJ1ourxlvOYJA2xEZE8UR24THmSJcLQw="
  ]
}
```

</TabItem>
<TabItem value="http" label="HTTPie">

```bash
http post https://rpc.testnet.near.org jsonrpc=2.0 id=dontcare method=broadcast_tx_commit \
    params:='[
        "DwAAAG5lYXJrYXQudGVzdG5ldABuTi5L1rwnlb35hc9tn5WELkxfiGfGh1Q5aeGNQDejo0QAAAAAAAAAEAAAAGpvc2hmb3JkLnRlc3RuZXSiWAc6W9KlqXS5fK+vjFRDV5pAxHRKU0srKX/cmdRTBgEAAAADAAAAoe3MzhvC0wAAAAAAAAB9rOE9zc5zQYLL1j6VTh3I4fQbERs6I07gJfrAC6jo8DB4HolR9Xps3v4qrZxkgZjwv6wB0QOROM4UEbeOaBoB"
    ]'
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
    "status": {
      "SuccessValue": ""
    },
    "transaction": {
      "signer_id": "sender.testnet",
      "public_key": "ed25519:Gowpa4kXNyTMRKgt5W7147pmcc2PxiFic8UHW9rsNvJ6",
      "nonce": 13,
      "receiver_id": "receiver.testnet",
      "actions": [
        {
          "Transfer": {
            "deposit": "1000000000000000000000000"
          }
        }
      ],
      "signature": "ed25519:7oCBMfSHrZkT7tzPDBxxCd3tWFhTES38eks3MCZMpYPJRfPWKxJsvmwQiVBBxRLoxPTnXVaMU2jPV3MdFKZTobH",
      "hash": "ASS7oYwGiem9HaNwJe6vS2kznx2CxueKDvU9BAYJRjNR"
    },
    "transaction_outcome": {
      "proof": [],
      "block_hash": "9MzuZrRPW1BGpFnZJUJg6SzCrixPpJDfjsNeUobRXsLe",
      "id": "ASS7oYwGiem9HaNwJe6vS2kznx2CxueKDvU9BAYJRjNR",
      "outcome": {
        "logs": [],
        "receipt_ids": ["BLV2q6p8DX7pVgXRtGtBkyUNrnqkNyU7iSksXG7BjVZh"],
        "gas_burnt": 223182562500,
        "tokens_burnt": "22318256250000000000",
        "executor_id": "sender.testnet",
        "status": {
          "SuccessReceiptId": "BLV2q6p8DX7pVgXRtGtBkyUNrnqkNyU7iSksXG7BjVZh"
        }
      }
    },
    "receipts_outcome": [
      {
        "proof": [],
        "block_hash": "5Hpj1PeCi32ZkNXgiD1DrW4wvW4Xtic74DJKfyJ9XL3a",
        "id": "BLV2q6p8DX7pVgXRtGtBkyUNrnqkNyU7iSksXG7BjVZh",
        "outcome": {
          "logs": [],
          "receipt_ids": ["3sawynPNP8UkeCviGqJGwiwEacfPyxDKRxsEWPpaUqtR"],
          "gas_burnt": 223182562500,
          "tokens_burnt": "22318256250000000000",
          "executor_id": "receiver.testnet",
          "status": {
            "SuccessValue": ""
          }
        }
      },
      {
        "proof": [],
        "block_hash": "CbwEqMpPcu6KwqVpBM3Ry83k6M4H1FrJjES9kBXThcRd",
        "id": "3sawynPNP8UkeCviGqJGwiwEacfPyxDKRxsEWPpaUqtR",
        "outcome": {
          "logs": [],
          "receipt_ids": [],
          "gas_burnt": 0,
          "tokens_burnt": "0",
          "executor_id": "sender.testnet",
          "status": {
            "SuccessValue": ""
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

Here is the exhaustive list of the error variants that can be returned by `broadcast_tx_commit` method:

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
      <td>INVALID_TRANSACTION</td>
      <td>An error happened during transaction execution</td>
      <td>
        <ul>
          <li>See <code>error.cause.info</code> for details</li>
        </ul>
      </td>
    </tr>
    <tr>
      <td>TIMEOUT_ERROR</td>
      <td>Transaction was routed, but has not been recorded on chain in 10 seconds.</td>
      <td>
        <ul>
          <li> Re-submit the request with the identical transaction (in NEAR Protocol unique transactions apply exactly once, so if the previously sent transaction gets applied, this request will just return the known result, otherwise, it will route the transaction to the chain once again)</li>
          <li>Check that your transaction is valid</li>
          <li>Check that the signer account id has enough tokens to cover the transaction fees (keep in mind that some tokens on each account are locked to cover the storage cost)</li>
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

### Transaction Status {#transaction-status}

> Queries status of a transaction by hash and returns the final transaction result.

- method: `tx`
- params:
  - `transaction hash` _(see [NEAR Explorer](https://explorer.testnet.near.org) for a valid transaction hash)_
  - `sender account id`

Example:

<Tabs>
<TabItem value="json" label="JSON" default>

```json
{
  "jsonrpc": "2.0",
  "id": "dontcare",
  "method": "tx",
  "params": ["6zgh2u9DqHHiXzdy9ouTP7oGky2T4nugqzqt9wJZwNFm", "sender.testnet"]
}
```

</TabItem>
<TabItem value="js" label="JavaScript">

```js
const response = await near.connection.provider.txStatus(
  "6zgh2u9DqHHiXzdy9ouTP7oGky2T4nugqzqt9wJZwNFm",
  "sender.testnet"
);
```

</TabItem>
<TabItem value="http" label="HTTPie">

```bash
http post https://rpc.testnet.near.org jsonrpc=2.0 id=dontcare method=tx \
    params:='[ "6zgh2u9DqHHiXzdy9ouTP7oGky2T4nugqzqt9wJZwNFm", "sender.testnet"]'
```

</TabItem>
</Tabs>

<details>
<summary>Example Result:</summary>
<p>

```json
{
  "jsonrpc": "2.0",
  "result": {
    "status": {
      "SuccessValue": ""
    },
    "transaction": {
      "signer_id": "sender.testnet",
      "public_key": "ed25519:Gowpa4kXNyTMRKgt5W7147pmcc2PxiFic8UHW9rsNvJ6",
      "nonce": 15,
      "receiver_id": "receiver.testnet",
      "actions": [
        {
          "Transfer": {
            "deposit": "1000000000000000000000000"
          }
        }
      ],
      "signature": "ed25519:3168QMdTpcwHvM1dmMYBc8hg9J3Wn8n7MWBSE9WrEpns6P5CaY87RM6k4uzyBkQuML38CZhU18HzmQEevPG1zCvk",
      "hash": "6zgh2u9DqHHiXzdy9ouTP7oGky2T4nugqzqt9wJZwNFm"
    },
    "transaction_outcome": {
      "proof": [
        {
          "hash": "F7mL76CMdfbdZ3xCehVGNh1fCyaR37gr3MeGX3EZkiVf",
          "direction": "Right"
        }
      ],
      "block_hash": "ADTMLVtkhsvzUxuf6m87Pt1dnF5vi1yY7ftxmNpFx7y",
      "id": "6zgh2u9DqHHiXzdy9ouTP7oGky2T4nugqzqt9wJZwNFm",
      "outcome": {
        "logs": [],
        "receipt_ids": ["3dMfwczW5GQqXbD9GMTnmf8jy5uACxG6FC5dWxm3KcXT"],
        "gas_burnt": 223182562500,
        "tokens_burnt": "22318256250000000000",
        "executor_id": "sender.testnet",
        "status": {
          "SuccessReceiptId": "3dMfwczW5GQqXbD9GMTnmf8jy5uACxG6FC5dWxm3KcXT"
        }
      }
    },
    "receipts_outcome": [
      {
        "proof": [
          {
            "hash": "6h95oEd7ih62KXfyPT4zsZYont4qy9sWEXc5VQVDhqtG",
            "direction": "Right"
          },
          {
            "hash": "6DnibgZk1T669ZprcehUy1GpCSPw1kjzXRGu69nSaUNn",
            "direction": "Right"
          }
        ],
        "block_hash": "GgFTVr33r4MrpAiHc9mr8TZqLnpZAX1BaZTNvhBnciy2",
        "id": "3dMfwczW5GQqXbD9GMTnmf8jy5uACxG6FC5dWxm3KcXT",
        "outcome": {
          "logs": [],
          "receipt_ids": ["46KYgN8ddxs4Qy8C7BDQH49XUfcYZsaQmAvdU1nfcL9V"],
          "gas_burnt": 223182562500,
          "tokens_burnt": "22318256250000000000",
          "executor_id": "receiver.testnet",
          "status": {
            "SuccessValue": ""
          }
        }
      },
      {
        "proof": [
          {
            "hash": "CD9Y7Bw3MSFgaPZzpc1yP51ajhGDCAsR61qXcMNcRoHf",
            "direction": "Left"
          }
        ],
        "block_hash": "EGAgKuW6Bd6QKYSaxAkx2pPGmnjrjAcq4UpoUiqMXvPH",
        "id": "46KYgN8ddxs4Qy8C7BDQH49XUfcYZsaQmAvdU1nfcL9V",
        "outcome": {
          "logs": [],
          "receipt_ids": [],
          "gas_burnt": 0,
          "tokens_burnt": "0",
          "executor_id": "sender.testnet",
          "status": {
            "SuccessValue": ""
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

<blockquote class="warning">
<strong>heads up</strong><br /><br />

In the case of function call transactions, this query will not wait for **all** receipts generated by this transaction to finish before returning a result. Rather, it will only wait for its return value to finish before returning; _which could be a promise_.

Let's say a transaction only contains a "function call" action that calls a `transfer()` method like the one below _(written in [Rust](https://www.rust-lang.org/))_. It will only wait for the "function call" receipt, not necessarily the receipt from the actual transfer of funds to finish before returning a result.

```rust
pub fn transfer(receiver_id: String) {
    Promise::new(receiver_id).transfer(10);
}
```

However, if we slightly modify the function to have the promise as a return value, then the `tx` status query will wait for this promise to finish _before_ returning results.

```rust
pub fn transfer_promise(receiver_id: String) -> Promise {
    Promise::new(receiver_id).transfer(10)
}
```

Despite such design, the `tx` endpoint can be used to check whether all receipts have finished.

Instead of looking at the main result `status`, we can check all of the receipts
returned `status` and see if any are `Unknown`. If none of the receipts statuses are unknown, we can be certain that all receipts generated have finished.

In addition, `tx` endpoint does not provide finality guarantees. To make sure that the entire execution is final, it suffices to ensure every `block_hash` in every outcome is `final`.

</blockquote>

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

Here is the exhaustive list of the error variants that can be returned by `tx` method:

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
      <td rowspan="3">HANDLER_ERROR</td>
      <td>INVALID_TRANSACTION</td>
      <td>An error happened during transaction execution</td>
      <td>
        <ul>
          <li>See <code>error.cause.info</code> for details</li>
        </ul>
      </td>
    </tr>
    <tr>
      <td>UNKNOWN_TRANSACTION</td>
      <td>The requested transaction is not available on the node since it might have not been recorded on the chain yet or has been garbage-collected</td>
      <td>
        <ul>
          <li>Try again later</li>
          <li>If the transaction had been submitted more than 5 epochs ago, try to send your request to <a href="https://near-nodes.io/intro/node-types#archival-node">an archival node</a></li>
          <li>Check the transaction hash</li>
        </ul>
      </td>
    </tr>
    <tr>
      <td>TIMEOUT_ERROR</td>
      <td>It was unable to wait for the transaction status for reasonable time</td>
      <td>
        <ul>
          <li>Send a request to a different node</li>
          <li>Try again later</li>
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

### Transaction Status with Receipts {#transaction-status-with-receipts}

> Queries status of a transaction by hash, returning the final transaction result _and_ details of all receipts.

- method: `EXPERIMENTAL_tx_status`
- params:
  - `transaction hash` _(see [NEAR Explorer](https://explorer.testnet.near.org) for a valid transaction hash)_
  - `sender account id` _(used to determine which shard to query for transaction)_

Example:

<Tabs>
<TabItem value="json" label="JSON" default>

```json
{
  "jsonrpc": "2.0",
  "id": "dontcare",
  "method": "EXPERIMENTAL_tx_status",
  "params": ["HEgnVQZfs9uJzrqTob4g2Xmebqodq9waZvApSkrbcAhd", "bowen"]
}
```

</TabItem>
<TabItem value="js" label="JavaScript">

```js
const response = await near.connection.provider.experimental_txStatus(
  "HEgnVQZfs9uJzrqTob4g2Xmebqodq9waZvApSkrbcAhd",
  "bowen"
);
```

</TabItem>
<TabItem value="http" label="HTTPie">

```bash
http post https://rpc.testnet.near.org jsonrpc=2.0 method=EXPERIMENTAL_tx_status params:='["HEgnVQZfs9uJzrqTob4g2Xmebqodq9waZvApSkrbcAhd", "bowen"]' id=dontcare
```

</TabItem>
</Tabs>

<details><summary>Example response:</summary>
<p>

```json
{
  "id": "123",
  "jsonrpc": "2.0",
  "result": {
    "receipts": [
      {
        "predecessor_id": "bowen",
        "receipt": {
          "Action": {
            "actions": [
              {
                "FunctionCall": {
                  "args": "eyJhbW91bnQiOiIxMDAwIiwicmVjZWl2ZXJfaWQiOiJib3dlbiJ9",
                  "deposit": "0",
                  "gas": 100000000000000,
                  "method_name": "transfer"
                }
              }
            ],
            "gas_price": "186029458",
            "input_data_ids": [],
            "output_data_receivers": [],
            "signer_id": "bowen",
            "signer_public_key": "ed25519:2f9Zv5kuyuPM5DCyEP5pSqg58NQ8Ct9uSRerZXnCS9fK"
          }
        },
        "receipt_id": "FXMVxdhSUZaZftbmPJWaoqhEB9GrKB2oqg9Wgvuyvom8",
        "receiver_id": "evgeny.lockup.m0"
      },
      {
        "predecessor_id": "evgeny.lockup.m0",
        "receipt": {
          "Action": {
            "actions": [
              {
                "Transfer": {
                  "deposit": "1000"
                }
              }
            ],
            "gas_price": "186029458",
            "input_data_ids": [],
            "output_data_receivers": [],
            "signer_id": "bowen",
            "signer_public_key": "ed25519:2f9Zv5kuyuPM5DCyEP5pSqg58NQ8Ct9uSRerZXnCS9fK"
          }
        },
        "receipt_id": "3Ad7pUygUegMUWUb1rEazfjnTaHfptXCABqKQ6WNq6Wa",
        "receiver_id": "bowen"
      },
      {
        "predecessor_id": "system",
        "receipt": {
          "Action": {
            "actions": [
              {
                "Transfer": {
                  "deposit": "19200274886926125000"
                }
              }
            ],
            "gas_price": "0",
            "input_data_ids": [],
            "output_data_receivers": [],
            "signer_id": "bowen",
            "signer_public_key": "ed25519:2f9Zv5kuyuPM5DCyEP5pSqg58NQ8Ct9uSRerZXnCS9fK"
          }
        },
        "receipt_id": "5DdQg9pfoJMX1q6bvhsjyyRihzA3sb9Uq5K1J7vK43Ze",
        "receiver_id": "bowen"
      },
      {
        "predecessor_id": "system",
        "receipt": {
          "Action": {
            "actions": [
              {
                "Transfer": {
                  "deposit": "18663792669276228632284"
                }
              }
            ],
            "gas_price": "0",
            "input_data_ids": [],
            "output_data_receivers": [],
            "signer_id": "bowen",
            "signer_public_key": "ed25519:2f9Zv5kuyuPM5DCyEP5pSqg58NQ8Ct9uSRerZXnCS9fK"
          }
        },
        "receipt_id": "FDp8ovTf5uJYDFemW5op6ebjCT2n4CPExHYie3S1h4qp",
        "receiver_id": "bowen"
      }
    ],
    "receipts_outcome": [
      {
        "block_hash": "HuqYrYsC7h2VERFMgFkqaNqSiFuTH9CA3uJr3BkyNxhF",
        "id": "FXMVxdhSUZaZftbmPJWaoqhEB9GrKB2oqg9Wgvuyvom8",
        "outcome": {
          "executor_id": "evgeny.lockup.m0",
          "gas_burnt": 3493189769144,
          "logs": ["Transferring 1000 to account @bowen"],
          "receipt_ids": [
            "3Ad7pUygUegMUWUb1rEazfjnTaHfptXCABqKQ6WNq6Wa",
            "FDp8ovTf5uJYDFemW5op6ebjCT2n4CPExHYie3S1h4qp"
          ],
          "status": {
            "SuccessReceiptId": "3Ad7pUygUegMUWUb1rEazfjnTaHfptXCABqKQ6WNq6Wa"
          },
          "tokens_burnt": "349318976914400000000"
        },
        "proof": [
          {
            "direction": "Right",
            "hash": "5WwHEszBcpfrHnt2VTvVDVnEEACNq5EpQdjz1aW9gTAa"
          }
        ]
      },
      {
        "block_hash": "DJ6oK5FtPPSwksS6pKdEjFvHWAaSVocnVNLoyi8aYk1k",
        "id": "3Ad7pUygUegMUWUb1rEazfjnTaHfptXCABqKQ6WNq6Wa",
        "outcome": {
          "executor_id": "bowen",
          "gas_burnt": 223182562500,
          "logs": [],
          "receipt_ids": ["5DdQg9pfoJMX1q6bvhsjyyRihzA3sb9Uq5K1J7vK43Ze"],
          "status": {
            "SuccessValue": ""
          },
          "tokens_burnt": "22318256250000000000"
        },
        "proof": [
          {
            "direction": "Right",
            "hash": "CXSXmKpDU8R3UUrBAsffWMeGfKanKqEHCQrHeZkR3RKT"
          },
          {
            "direction": "Right",
            "hash": "2dNo7A1VHKBmMA86m1k3Z9DVXwWgQJGkKGRg8wUR3co9"
          }
        ]
      },
      {
        "block_hash": "9cjUoqAksMbs7ZJ4CXiuwm8vppz9QctTwGmgwZ5mDmUA",
        "id": "5DdQg9pfoJMX1q6bvhsjyyRihzA3sb9Uq5K1J7vK43Ze",
        "outcome": {
          "executor_id": "bowen",
          "gas_burnt": 0,
          "logs": [],
          "receipt_ids": [],
          "status": {
            "SuccessValue": ""
          },
          "tokens_burnt": "0"
        },
        "proof": []
      },
      {
        "block_hash": "DJ6oK5FtPPSwksS6pKdEjFvHWAaSVocnVNLoyi8aYk1k",
        "id": "FDp8ovTf5uJYDFemW5op6ebjCT2n4CPExHYie3S1h4qp",
        "outcome": {
          "executor_id": "bowen",
          "gas_burnt": 0,
          "logs": [],
          "receipt_ids": [],
          "status": {
            "SuccessValue": ""
          },
          "tokens_burnt": "0"
        },
        "proof": [
          {
            "direction": "Left",
            "hash": "A2Ry6NCeuK8WhRCWc41hy6uddadc5nLJ1NBX5wVYo3Yb"
          },
          {
            "direction": "Right",
            "hash": "2dNo7A1VHKBmMA86m1k3Z9DVXwWgQJGkKGRg8wUR3co9"
          }
        ]
      }
    ],
    "status": {
      "SuccessValue": ""
    },
    "transaction": {
      "actions": [
        {
          "FunctionCall": {
            "args": "eyJhbW91bnQiOiIxMDAwIiwicmVjZWl2ZXJfaWQiOiJib3dlbiJ9",
            "deposit": "0",
            "gas": 100000000000000,
            "method_name": "transfer"
          }
        }
      ],
      "hash": "HEgnVQZfs9uJzrqTob4g2Xmebqodq9waZvApSkrbcAhd",
      "nonce": 77,
      "public_key": "ed25519:2f9Zv5kuyuPM5DCyEP5pSqg58NQ8Ct9uSRerZXnCS9fK",
      "receiver_id": "evgeny.lockup.m0",
      "signature": "ed25519:5v1hJuw5RppKGezJHBFU6z3hwmmdferETud9rUbwxVf6xSBAWyiod93Lezaq4Zdcp4zbukDusQY9PjhV47JVCgBx",
      "signer_id": "bowen"
    },
    "transaction_outcome": {
      "block_hash": "9RX2pefXKw8M4EYjLznDF3AMvbkf9asAjN8ACK7gxKsa",
      "id": "HEgnVQZfs9uJzrqTob4g2Xmebqodq9waZvApSkrbcAhd",
      "outcome": {
        "executor_id": "bowen",
        "gas_burnt": 2428026088898,
        "logs": [],
        "receipt_ids": ["FXMVxdhSUZaZftbmPJWaoqhEB9GrKB2oqg9Wgvuyvom8"],
        "status": {
          "SuccessReceiptId": "FXMVxdhSUZaZftbmPJWaoqhEB9GrKB2oqg9Wgvuyvom8"
        },
        "tokens_burnt": "242802608889800000000"
      },
      "proof": [
        {
          "direction": "Right",
          "hash": "DXf4XVmAF5jnjZhcxi1CYxGPuuQrcAmayq9X5inSAYvJ"
        }
      ]
    }
  }
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

Here is the exhaustive list of the error variants that can be returned by `EXPERIMENTAL_tx_status` method:

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
      <td rowspan="3">HANDLER_ERROR</td>
      <td>INVALID_TRANSACTION</td>
      <td>An error happened during transaction execution</td>
      <td>
        <ul>
          <li>See <code>error.cause.info</code> for details</li>
        </ul>
      </td>
    </tr>
    <tr>
      <td>UNKNOWN_TRANSACTION</td>
      <td>The requested transaction is not available on the node since it might have not been recorded on the chain yet or has been garbage-collected</td>
      <td>
        <ul>
          <li>Try again later</li>
          <li>If the transaction had been submitted more than 5 epochs ago, try to send your request to <a href="https://near-nodes.io/intro/node-types#archival-node">an archival node</a></li>
          <li>Check the transaction hash</li>
        </ul>
      </td>
    </tr>
    <tr>
      <td>TIMEOUT_ERROR</td>
      <td>It was unable to wait for the transaction status for reasonable time</td>
      <td>
        <ul>
          <li>Send a request to a different node</li>
          <li>Try again later</li>
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

### Receipt by ID {#receipt-by-id}

> Fetches a receipt by it's ID (as is, without a status or execution outcome)

- method: `EXPERIMENTAL_receipt`
- params:
  - `receipt_id` _(see [NEAR Explorer](https://explorer.testnet.near.org) for a valid receipt id)_

Example:

<Tabs>
<TabItem value="json" label="JSON" default>

```json
{
  "jsonrpc": "2.0",
  "id": "dontcare",
  "method": "EXPERIMENTAL_receipt",
  "params": { "receipt_id": "2EbembRPJhREPtmHCrGv3Xtdm3xoc5BMVYHm3b2kjvMY" }
}
```

</TabItem>
<TabItem value="http" label="HTTPie">

```bash
http post https://rpc.testnet.near.org jsonrpc=2.0 method=EXPERIMENTAL_receipt params:='{"receipt_id": "2EbembRPJhREPtmHCrGv3Xtdm3xoc5BMVYHm3b2kjvMY"}' id=dontcare
```

</TabItem>
</Tabs>

<details><summary>Example response:</summary>
<p>

```json
{
  "id": "dontcare",
  "jsonrpc": "2.0",
  "result": {
    "predecessor_id": "bohdan.testnet",
    "receipt": {
      "Action": {
        "actions": [
          {
            "Transfer": {
              "deposit": "1000000000000000000000000"
            }
          }
        ],
        "gas_price": "103000000",
        "input_data_ids": [],
        "output_data_receivers": [],
        "signer_id": "bohdan.testnet",
        "signer_public_key": "ed25519:DhC7rPNTBwWJtmVXs1U1SqJztkn9AWbj6jCmQtkrg3TA"
      }
    },
    "receipt_id": "2EbembRPJhREPtmHCrGv3Xtdm3xoc5BMVYHm3b2kjvMY",
    "receiver_id": "frol.testnet"
  }
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

Here is the exhaustive list of the error variants that can be returned by `EXPERIMENTAL_receipt` method:

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
      <td>UNKNOWN_RECEIPT</td>
      <td>The receipt with the given <code>receipt_id</code> was never observed on the node</td>
      <td>
        <ul>
          <li>Check the provided <code>receipt_id</code> is correct</li>
          <li>Send a request on a different node</li>
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
