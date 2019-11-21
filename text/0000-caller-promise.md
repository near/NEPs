- Proposal Name: caller-promise
- Start Date: 2019-11-20
- NEP PR: [nearprotocol/neps#0000](https://github.com/nearprotocol/neps/pull/0000)
- Issue(s): [neps#23](https://github.com/nearprotocol/neps/pull/23)

# Summary
[summary]: #summary

Caller promise allows to schedule a promise as a callback to the caller.

# Motivation
[motivation]: #motivation

// From NEP#23

In async environment it is easy to start using locks on data and "yank" data, but this can lead to dead locks or lost data. 
This can be due to logical flaw in the developers code, error in someone else's code or attack.

An important thing for any contract writer, is that no third party contract should be able to violate the invariants / make state inconsistent. Currently it's very hard to write a contract like this and we want to make sure developers don't need to worry about this.

For example if you are building a fungible token contract `fun_token` with locks, if someone calls:
```
fun_token.lock(account_id, amount).then(|| {
  assert(some_reason);
})
```

This will lead to lock forever, because `fun_token` doesn't receive callback of failure of it's own callback.

# Guide-level explanation
[guide-level-explanation]: #guide-level-explanation

The proposed idea is to be able to attach a callback to the caller's callback.

### Example:

User `alice` calls exchange `dex` to swap token `fun` with token `nai` 

Here is how it works now:
- `alice` calls `dex`
- `dex` calls `fun` and `nai` to lock corresponding balances. Attaches a callback back to `dex` to call `on_locks`
- `fun` and `nai` locks balances within their contracts
- `on_locks` on `dex` is called.
    - If both locks succeeded, `dex` calls `fun` and `nai` to transfer funds.
    - If one of the locks failed, `dex` calls the a token contract with the successful lock to unlock funds.
   
The issue is if the callback on `dex` fails for some reason, the tokens might remain locked.

The proposal is:
- `alice` calls `dex`
- `dex` calls `fun` and `nai` to lock corresponding balances. Attaches a callback back to `dex` to call `on_locks`
- `fun` and `nai` locks balances within their contracts.
And each attaches a caller callback to unlock themselves by calling `promise_caller_create` with a similar interface to
[`promise_batch_create`](https://nomicon.io/Runtime/Components/BindingsSpec/PromisesAPI.html).
This will attach a new promise to the result of `dex`'s callback (for each token).
- `on_locks` on `dex` is called. `dex` can assert both locks succeeded.
`dex` calls `fun` and `nai` to transfer funds. Attaches a new callback back to `dex`.
- a new callback on `dex` is called. It can be noop.

Two things to notice:
1. `dex` no longer need to unlock tokens in case of lock failures, instead it can assert them.
2. `dex` has to attach a callback to token transfer.

### No need to unlock

`dex` doesn't need to explicitly unlock tokens, because tokens can now attach a callback to unlock themselves.
This callback going to executed when `on_locks` on `dex` finishes.
So if `on_locks` method fails early on asserts, the unlock callbacks are going to be called. But only for successful locks.

### Need to depend on token transfers

This is a little more complicated. The reason `dex` needs to wait and depend on the token transfers is to avoid
tokens from being unlocked before transfers are completed.

If `dex` doesn't depend on transfers, the `unlock` might be executed before transfers, and someone might try to front-run it, so one of the transfers might fail.
To avoid this `dex` has to attach another callback towards transfer calls, this will delay `unlock` execution until transfers are executed.


# Reference-level explanation
[reference-level-explanation]: #reference-level-explanation

This change doesn't require complicated changes on runtime. The economics of this change also work, since caller promises are prepaid, there are no additional unexpected fees.
It also reuses the limitation that we have right now with the existing `promise_return`, it can't return a joint promise (a promise created with `promise_and`).

## How Runtime works now

To understand how this change works, we need to explain how promises works with more details:

### Receipts

Each receipt has a `predecessor_id` (who sent it) and `receiver_id` the current account.

Receipts are one of 2 types: action receipts or data receipts.

Action Receipts are receipts that contain actions. For this explanation let's assume each receipt contains only 1 action and this action is a `FunctionCall`.
This action calls given `method_name` with the given `arguments`. It also has `prepaid_gas` and `attached_deposit`.   

Data Receipts are receipts that contains some data for some `ActionReceipt` with the same `receiver_id`.
Data Receipts has 2 fields: the unique data identifier `data_id` and `data` the received result.
`data` is an `Option` field and it indicates whether the result was a success or a failure. If it's `Some`, then it means
the remote execution was successful and it contains the vector of bytes of the result.

Each `ActionReceipt` also contains fields related to data:
- `input_data_ids` - a vector of input data with the `data_id`s required for the execution of this receipt.
- `output_data_receivers` - a vector of output data receivers. It indicates where to send outgoing data.
Each `DataReceiver` consists of `data_id` and `receiver_id` for routing.

Before any action receipt is executed, all input data dependencies need to be satisfied.
Which means all corresponding data receipts has to be received.
If any of the data dependencies is missing, the action receipt is postponed until all missing data dependency arrives.

Because Chain and Runtime guarantees that no receipts are missing, we can rely that every action receipt will be executed eventually.

### Promises API

When a promise is created inside the VM logic, it calls externalities to create a corresponding action receipt.

When a `promise_then` is called, it depends one promise ID. This promise ID can either be a regular promise or a joint promise.
Joint promise is created by joining multiple promises using `promise_and`. We can think about them as a vector of regular promises.

`promise_then` creates a new promise by calling externalities and passing a list of regular promises.
Each regular promise corresponds to some action receipt that was created before.
For each of these action receipts externalities adds a new output data receiver towards the new receipt.
The new receipt has an input data dependency for each of the action receipts with corresponding `data_id`.

This way we can construct almost any promise graph with different receivers.

### Data generation

The function execution completes with one of the few options:
- Success with Value or Failure.
When a function call finishes either successfully and returns some value or fails during execution, the Runtime
still generates outgoing `DataReceipt` for every `output_data_receivers` within the action receipt.
- Success with awaited promise.
We call this API `promise_return`, but it's more like `promise_return_await`.
If the execution successfully completes and returns a promise ID, then the Runtime doesn't generate data receipts.
Instead the Runtime modifies the corresponding to promise ID `ActionReceipt` by appending the list of old `output_data_receivers` towards the existing `output_data_receivers` of this receipt.
Now when the new returned receipt executes, it will also generate data receipts for the current receipt.

Example:
- `A` calls `B`. Attaches a callback back to `A`. Returns callback `A`.
- `B` calls `C` and `D`. Attaches a callback from `C` to `D`. And returns promise `C`.

Now receipt to `C` has 2 outgoing data dependencies: one to `A` and one `D`.
Here the receipts that were created:
```rust
//////// Original receipt
ActionReceipt {
    id: "R1",
    receiver_id: "A",
    predecessor_id: "USER",
    input_data_ids: [],
    output: [],
}


//////// Executing R1

// `A` calls `B`. (R2 is created)
ActionReceipt {
    id: "R2",
    receiver_id: "B",
    predecessor_id: "A",
    input_data_ids: [],
    output: [],
}

// Attaches a callback back to `A`. (R2 is modified, R3 is created)
ActionReceipt {
    id: "R2",
    receiver_id: "B",
    predecessor_id: "A",
    input_data_ids: [],
    output: [
        DataReceiver {receiver_id: "A", data: "D1"}
    ]
}
ActionReceipt {
    id: "R3",
    receiver_id: "A",
    predecessor_id: "A",
    input_data_ids: ["D1"],
    output: []
}

// Returns callback `A`. (Doesn't change anything, cause R1 doesn't have output)


//////// Executing R2

// `B` calls `C` and `D`. (R4 and R5 are created)
ActionReceipt {
    id: "R4",
    receiver_id: "C",
    predecessor_id: "B",
    input_data_ids: [],
    output: [],
}
ActionReceipt {
    id: "R5",
    receiver_id: "D",
    predecessor_id: "B",
    input_data_ids: [],
    output: [],
}

// Attaches a callback from `C` to `D`. (R4 and R5 are modified)
ActionReceipt {
    id: "R4",
    receiver_id: "C",
    predecessor_id: "B",
    input_data_ids: [],
    output: [
        DataReceiver {receiver_id: "D", data: "D2"},
    ],
}
ActionReceipt {
    id: "R5",
    receiver_id: "D",
    predecessor_id: "B",
    input_data_ids: ["D2"],
    output: [],
}
// And returns promise `C`. (R4 is modified)
ActionReceipt {
    id: "R4",
    receiver_id: "C",
    predecessor_id: "B",
    input_data_ids: [],
    output: [
        DataReceiver {receiver_id: "A", data: "D1"},
        DataReceiver {receiver_id: "D", data: "D2"},
     ],
}
```

So now when `R4` is executed, it will send 2 data receipts.

Let's now discuss how to implement the proposed change.

## Proposed change

In order to create a promise on the caller, we need to pass it through the data 

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
