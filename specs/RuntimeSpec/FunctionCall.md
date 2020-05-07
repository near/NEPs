# Function Call
In this section we provide an explanation how the `FunctionCall` action execution works, what are the inputs and what are the outputs. Suppose runtime received the following ActionReceipt:

```rust
ActionReceipt {
     id: "A1",
     signer_id: "alice",
     signer_public_key: "6934...e248",
     receiver_id: "dex",
     predecessor_id: "alice",
     input_data_ids: [],
     output_data_receivers: [],
     actions: [FunctionCall { gas: 100000, deposit: 100000u128, method_name: "exchange", args: "{arg1, arg2, ...}", ... }],
 }
```
### input_data_ids to PromiseResult's

`ActionReceipt.input_data_ids` must be satisfied before execution (see [Receipt Matching](#receipt-matching)). Each of `ActionReceipt.input_data_ids` will be converted to the `PromiseResult::Successful(Vec<u8>)` if `data_id.data` is `Some(Vec<u8>)` otherwise if `data_id.data` is `None` promise will be `PromiseResult::Failed`.

## Input
The `FunctionCall` executes in the `receiver_id` account environment.

- a vector of [Promise Results](#promise-results) which can be accessed by a `promise_result` import [PromisesAPI](Components/BindingsSpec/PromisesAPI.md) `promise_result`)
- the original Transaction `signer_id`, `signer_public_key` data from the ActionReceipt (e.g. `method_name`, `args`, `predecessor_id`, `deposit`, `prepaid_gas` (which is `gas` in FunctionCall))
- a general blockchain data (e.g. `block_index`, `block_timestamp`)
- read data from the account storage

A full list of the data available for the contract can be found in [Context API](Components/BindingsSpec/ContextAPI.md) and [Trie](Components/BindingsSpec/TrieAPI.md)


## Execution

First of all, runtime does prepare the Wasm binary to be executed:
- loads the contract code from the `receiver_id` [account](../Primitives/Account.md#account) storage
- deserializes and validates the `code` Wasm binary (see `prepare::prepare_contract`)
- injects the gas counting function `gas` which will charge gas on the beginning of the each code block
- instantiates [Bindings Spec](Components/BindingsSpec/BindingsSpec.md) with binary and calls the `FunctionCall.method_name` exported function

During execution, VM does the following:

- counts burnt gas on execution
- counts used gas (which is `burnt gas` + gas attached to the new created receipts)
- counts how accounts storage usage increased by the call
- collects logs produced by the contract
- sets the return data
- creates new receipts through [PromisesAPI](Components/BindingsSpec/PromisesAPI.md)

## Output

The output of the `FunctionCall`:

- storage updates - changes to the account trie storage which will be applied on a successful call
- `burnt_gas` - irreversible amount of gas witch was spent on computations
- `used_gas` - includes `burnt_gas` and gas attached to the new `ActionReceipt`s created during the method execution. In case of failure, created `ActionReceipt`s not going to be sent thus account will pay only for `burnt_gas`
- `balance` - unspent account balance (account balance could be spent on deposits of newly created `FunctionCall`s or [`TransferAction`s](Actions.md#transferaction) to other contracts)
- `storage_usage` - storage_usage after ActionReceipt application
- `logs` - during contract execution, utf8/16 string log records could be created. Logs are not persistent currently.
- `new_receipts` - new `ActionReceipts` created during the execution. These receipts are going to be sent to the respective `receiver_id`s (see [Receipt Matching explanation](#receipt-matching))
- result could be either [`ReturnData::Value(Vec<u8>)`](#value-result) or [`ReturnData::ReceiptIndex(u64)`](#receiptindex-result)`


### Value Result

If applied `ActionReceipt` contains [`output_data_receivers`](Receitps.md#output_data_receivers), runtime will create `DataReceipt` for each of `data_id` and `receiver_id` and `data` equals returned value. Eventually, these `DataReceipt` will be delivered to the corresponding receivers.

### ReceiptIndex Result

Successful result could not return any Value, but generates a bunch of new ActionReceipts instead. One example could be a callback. In this case, we assume the the new Receipt will send its Value Result to the [`output_data_receivers`](Receitps.md#output_data_receivers) of the current `ActionReceipt`.
