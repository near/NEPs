- Proposal Name: Batched Transactions
- Start Date: 2019-07-22
- NEP PR: [nearprotocol/neps#0000](https://github.com/nearprotocol/neps/pull/0000)
- Issue(s): 

# Summary
[summary]: #summary

Refactor signed transactions and receipts to support batched atomic transactions and data dependency.

# Motivation
[motivation]: #motivation

It simplifies account creation, by supporting batching of multiple transactions together instead of
creating more complicated transaction types.

For example, we want to create a new account with some account balance and one or many access keys, deploy a contract code on it and run an initialization method to restrict access keys permissions for a `proxy` function.

To be able to do this now, we need to have a `CreateAccount` transaction with all the parameters of a new account.
Then we need to handle it in one operation in a runtime code, which might have duplicated code for executing some WASM code with the rollback conditions.

Alternative to this is to execute multiple simple transactions in a batch within the same block.
It has to be done in a raw without any commits to the state until the entire batch is completed.
We propose to support this type of transaction batching to simplify the runtime.

This change

# Guide-level explanation
[guide-level-explanation]: #guide-level-explanation

### New transaction and receipts

Previously, in the runtime to produce a block we first executed new signed transactions and then executed received receipts. It resulted in duplicated code that might be shared across similar actions, e.g. function calls for async calls, callbacks and self-calls.
It also increased the complexity of the runtime implementation.

This NEP proposes changing it by first converting all signed transactions into receipts and then either execute them immediately before received receipts, or put them into the list of the new receipts to be routed.
To achieve this, NEP introduces a new message `Action` that represents one of atomic actions, e.g. a function call.
`TransactionBody` is now called just `Transaction`. It contains the list of actions that needs to be performed in a single batch and the information shared across these actions.

`Transaction` contains the following fields
- `originator_id` is an account ID of the transaction originator.
- `public_key` is to identify the access key used to signs the transaction.
- `nonce` is used to deduplicate and order transactions.
- `receiver_id` is where the transaction has to be routed.
- `action` is the list of actions to perform.

An `Action` can be of the following:
- `CreateAccount` creates a new account. It has to be the first action, and the receiver has to be a new account. The action will fail if the account already exists.
`CreateAccount` also grants permission for all subsequent batched action for the newly created account. For example, deploying code on the new account.
- `DeployContract` deploys given binary wasm code on the account. Either the `receiver_id` equals to the `originator_id`, or the batch of actions has started with `CreateAccount`, which granted that permission.
- `FunctionCall` executes a function call on the last deployed contract. E.g. if the previous action was `DeployContract`, then the code to execute will be the new deployed contract. `FunctionCall` has `method_name` and `args` to identify method with arguments to call. It also has `fee` and the `amount`. `fee` is the transaction fee that is prepaid for this call to be spent on gas. `amount` is the attached amount of NEAR tokens that the contract can spend, e.g. 10 tokens to pay for a crypto-corgi.
- `Transfer` transfers the given amount of tokens from the originator to the receiver.
- `Stake` stakes the new total amount which is given in the `amount` field with the given `public_key`. The difference in stake is taken from the account's balance at the moment when this action is executed, so it's not prepaid. There is no particular reason to stake on behalf of a newly created account, so we may disallow it.
- `DeleteKey` deletes an old `AccessKey` identified by the given `public_key` from the account. Fails if the access key with the given public key doesn't exist. All next batched actions will continue to execute, even if the public key that authorized that transaction was removed.
- `AddKey` adds a new given `AccessKey` identified by a new given `public_key` to the account. Fails if an access key with the given public key already exists. We removed `SwapKeyTransaction`, because it can be replaced with 2 batched actions - delete an old key and add a new key.

The new `Receipt` contains the shared information and either one of the receipt actions or a list of actions:
- `sender_id` the account ID of the immediate previous sender of this receipt. It can be different from the `originator_id` in some cases.
- `receiver_id` the account ID of the current account, on which we need to perform action(s).
- `receipt_id` is a hash of this receipt (previously was called `nonce`). It's generated from either the signed transaction or the parent receipt.
- `receipt` is can be one of 2 types:
  - `ActionReceipt` is used to perform some actions on the receiver.
  - `DataReceipt` is used when some data needs to be passed from the sender to the receiver, e.g. an execution result.

To support promises and callbacks we introduce a concept of cross-shard data sharing with dependencies. Each `ActionReceipt` may have a list of input `data_id`. The execution will not start until all required inputs are received. Once the execution completes and if there is `output_data_id`, it produces a `DataReceipt` that will be routed to the `output_receiver_id`.
 
`ActionReceipt` contains the following fields:
- `originator_id` the account ID of the originator, who signed the transaction.
- `originator_public_key` the public key that the originator used to sign the original signed transaction.
- `refund_account_id` the account ID where to send the refund in case the transaction fails and/or there are remaining fees.
- `output_data_id` is the data ID to create DataReceipt. If it's absent, then the `DataReceipt` is not created.
- `output_receiver_id` is the account ID of the data receiver. It's needed to route `DataReceipt`. It's absent if the DataReceipt is not needed.
- `input_data_id` is the list of data IDs that are required for the execution of the `ActionReceipt`. If some of data IDs is not available when the receipt is received, then the `ActionReceipt` is postponed until all data is available. Once the last `DataReceipt` for the required input data arrives, the action receipt execution is triggered.
- `action` is the list of actions to execute. The execution doesn't need to validate permissions of the actions, but need to fail in some cases. E.g. when the receiver's account doesn't exist and the action acts on the account, or when the action is a function call and the code is not present.

`DataReceipt` contains the following fields:
- `data_id` is the data ID to be used as an input.
- `success` is true if the `ActionReceipt` that generated this `DataReceipt` finished the execution without any failures.
- `data` is the binary data that is returned from the last action of the `ActionReceipt`. Right now, it's empty for all actions except for function calls. For function calls the data is the result of the code execution. But in the future we might introduce non-contract state reads.

Data should be stored at the same shard as the receiver's account, even if the receiver's account doesn't exist.

### Examples

#### Account Creation

To create a new account we can create a new `Transaction`:

```json
{
    originator_id: "vasya.near",
    public_key: ...,
    nonce: 42,
    receiver_id: "vitalik.vasya.near",

    action: [
        {
            create_account: {
            }
        },
        {
            transfer: {
                amount: "19231293123"
            }
        },
        {
            deploy_contract: {
                code: ...
            }
        },
        {
            add_key: {
                public_key: ...,
                access_key: ...
            }
        },
        {
            function_call: {
                method_name: "init",
                args: ...,
                fee: "100010101",
                amount: "0"
            }
        }
    ]
}
```

This transaction is sent from `vasya.near` signed with a `public_key`.
The receiver is `vitalik.vasya.near`, which is a new account id.
The transaction contains a batch of actions.
First we create the account, then we transaction a few tokens on the new account, then we deploy code on the new account, add a new access key with some given public key, and as a final action initializing the deployed code by calling a method `init` with some arguments.

For this transaction to work `vasya.near` needs to have enough balance to cover all actions at once.
Every action has some associated transaction fee with it, plus `transfer` and `function_call` needs additional amounts and fees.

Once we validated and subtracted the total fees+amounts from `vasya.near` account, this transaction will be transformed into a `Receipt`:

```json
{
    sender_id: "vasya.near",
    receiver_id: "vitalik.vasya.near",
    receipt_id: ...,

    action: {
        originator_id: "vasya.near",
        originator_public_key: ...,
        refund_account_id: "vasya.near",
        
        output_data_id: null,
        output_receiver_id: null,

        input_data_id: [],
        
        action: [...]
    }
}
```

This receipt will be sent to `vitalik.vasya.near`'s shard to be executed.
In case the `vitalik.vasya.near` account already exists, the execution will fail and some amount will be refunded back to `vasya.near` account with a new `ActionReceipt` with a single transfer action.
BTW, if the refund fails (e.g. if `vasya.near` deletes his account in between), then the next `refund_account_id` will be `system`, which means the tokens are going to be burned and no receipts are generated.
If the account creation receipt succeeds, it wouldn't create a `DataReceipt`, because `output_data_id` is `null`.
But it will generate a refund receipt for the unused portion of function call `fee`. 

#### TODO: Deploy code example

#### TODO: Promises and callbacks

#### TODO: Swap Key example


# Reference-level explanation
[reference-level-explanation]: #reference-level-explanation


### Updated protobufs

signed_transaction.proto
```
message Action {
    message CreateAccount {
        // empty
    }

    message DeployContract {
        // Binary wasm code
        bytes code = 1;
    }

    message FunctionCall {
        string method_name = 1;
        bytes args = 2;
        Uint128 fee = 3;
        Uint128 amount = 4;
    }

    message Transfer {
        Uint128 amount = 1;
    }

    message Stake {
        // New total stake amount
        Uint128 amount = 1;
        PublicKey public_key = 2;
    }

    message DeleteKey {
        PublicKey public_key = 1;
    }

    message AddKey {
        PublicKey public_key = 1;
        AccessKey access_key = 2;
    }

    oneof action {
        CreateAccount create_account = 1;
        DeployContract deploy_contract = 2;
        FunctionCall function_call = 3;
        Transfer transfer = 4;
        Stake stake = 5;
        AddKey add_key = 6;
        DeleteKey delete_key = 7;
    }
}

message Transaction {
    string originator_id = 1;
    PublicKey public_key = 2;
    uint64 nonce = 3;
    string receiver_id = 4;

    repeated Action action = 5;
}

message SignedTransaction {
    bytes signature = 1;

    Transaction transaction = 2;
}
```

receipt.proto
```
message DataReceipt {
    bytes data_id = 1;
    bool success = 2;
    bytes data = 3;
 }

message ActionReceipt {
    string originator_id = 1;
    PublicKey originator_public_key = 2;
    string refund_account_id = 3;

    bytes output_data_id = 4;
    string output_receiver_id = 5;

    // Ordered list of data ID to provide as input results.
    repeated bytes input_data_id = 6;

    repeated Action action = 7;
}

message Receipt {
    string sender_id = 1;
    string receiver_id = 2;
    bytes receipt_id = 3;

    oneof receipt {
        ActionReceipt action = 4;
        DataReceipt data = 5;
    }
}

```

TODO: How to generate DataReceipt

TODO: Data storage

TODO: Batch verification in a transaction

TODO: Security considerations

# THE REST BELOW IS TODO

# Drawbacks
[drawbacks]: #drawbacks

Why should we *not* do this?

# Rationale and alternatives
[rationale-and-alternatives]: #rationale-and-alternatives

- Why is this design the best in the space of possible designs?
- What other designs have been considered and what is the rationale for not choosing them?
- What is the impact of not doing this?

# Unresolved questions
[unresolved-questions]: #unresolved-questions

- What parts of the design do you expect to resolve through the NEP process before this gets merged?
- What parts of the design do you expect to resolve through the implementation of this feature before stabilization?
- What related issues do you consider out of scope for this NEP that could be addressed in the future independently of the solution that comes out of this NEP?

# Future possibilities
[future-possibilities]: #future-possibilities

Think about what the natural extension and evolution of your proposal would
be and how it would affect the project as a whole in a holistic
way. Try to use this section as a tool to more fully consider all possible
interactions with the project in your proposal.
Also consider how the this all fits into the roadmap for the project
and of the relevant sub-team.

This is also a good place to "dump ideas", if they are out of scope for the
NEP you are writing but otherwise related.

If you have tried and cannot think of any future possibilities,
you may simply state that you cannot think of anything.

Note that having something written down in the future-possibilities section
is not a reason to accept the current or a future NEP. Such notes should be
in the section on motivation or rationale in this or subsequent NEPs.
The section merely provides additional information.
