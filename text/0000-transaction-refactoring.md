- Proposal Name: Batched Transactions
- Start Date: 2019-07-22
- NEP PR: [nearprotocol/neps#0000](https://github.com/nearprotocol/neps/pull/0000)
- Issue(s): 

# Summary
[summary]: #summary

Refactor signed transactions and receipts to support batched atomic transactions.

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

# Guide-level explanation
[guide-level-explanation]: #guide-level-explanation

Previously, in the runtime to produce a block we first executed new signed transactions and then executed received receipts. It resulted in duplicated code that might be shared across similar actions, e.g. function calls for async calls, callbacks and self-calls.
It also increased the complexity of the runtime implementation.

This NEP proposes changing it by first converting all signed transactions into receipts and then either execute them immediately before received receipts, or put them into the list of the new receipts to be routed.
To achieve this, NEP introduces a new message `Action` that represents one of atomic actions, e.g. a function call.
`TransactionBody` is now called just `Transaction`. It contains the list of actions that needs to be performed in a single batch and the information shared across these actions.

The information consists of:
- `originator_id` and `public_key` to identify the account and the access key of the account which issues and signs the transaction.
- `nonce` is used to dedup transactions.
- `receiver_id` is where the transaction has to be routed.

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
- `originator_id` the account ID of the originator, who signed the transaction.
- `sender_id` the account ID of the immediate previous sender of this receipt. It can be different from the `originator_id` in some cases.
- `receiver_id` the account ID of the current account, on which we need to perform action(s).
- `nonce` is a hash of this receipt, that was generated from either the signed transaction or the parent receipt.
- `originator_public_key` the public key that the originator used to sign the original signed transaction.
- `refund_account_id` the account ID where to send the refund in case the transaction fails and/or there are remaining fees.
- `callback_info` the information where to send the result of the execution of this receipt. Each receipt would generate a callback result in case the callback info is provided.

    PublicKey originator_public_key = 5;
    string refund_account_id = 6;
    // Where to route the callback
    CallbackInfo callback_info = 7;

    oneof receipt {
        repeated Action action = 8;
        ReceiptAction receipt_action = 9;
    }
}

Explain the proposal as if it was already implemented and you were teaching it to another developer. That generally means:

- Introducing new named concepts.
- Explaining the feature largely in terms of examples.
- If feature introduces new abstractions, explaining how users and/or developers should *think* about it;
- If applicable, describe the differences between the existing functionality.

For user-facing NEPs this section should focus on user stories.

# Reference-level explanation
[reference-level-explanation]: #reference-level-explanation

### Updated protos

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
message CallbackInfo {
    bytes id = 1;
    string receiver_id = 2;
}

message ReceiptAction {
    message CallbackResult {
        CallbackInfo info = 1;
        bool success = 2;
        bytes result = 3;
    }

    message Refund {
        Uint128 amount = 1;
    }

    message CallbackDescription {
        // Ordered list of ID for callback results.
        repeated bytes callback_id = 1;
        TransactionBody.FunctionCall function_call = 2;
    }

    oneof action {
        CallbackDescription callback_description = 1;
        CallbackResult callback_result = 2;
        Refund refund = 3;
    }
}

message Receipt {
    string originator_id = 1;
    string sender_id = 2;
    string receiver_id = 3;
    bytes nonce = 4;

    PublicKey originator_public_key = 5;
    string refund_account_id = 6;
    // Where to route the callback
    CallbackInfo callback_info = 7;

    oneof receipt {
        repeated Action action = 8;
        ReceiptAction receipt_action = 9;
    }
}

```

This is the technical portion of the NEP. Explain the design in sufficient detail that:

- Its interaction with other features is clear.
- It is reasonably clear how the feature would be implemented.
- Corner cases are dissected by example.

The section should return to the examples given in the previous section, and explain more fully how the detailed proposal makes those examples work.

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
