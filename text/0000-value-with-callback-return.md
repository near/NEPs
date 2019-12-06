- Proposal Name: value-with-callback-return
- Start Date: 2019-11-20
- NEP PR: [nearprotocol/neps#0024](https://github.com/nearprotocol/neps/pull/24)
- Issue(s): [neps#23](https://github.com/nearprotocol/neps/pull/23)

# Summary
[summary]: #summary

Add a new API to schedule callbacks on the output dependencies. It allows to implement simple automatic unlocks.

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

User `alice` calls exchange `dex` to swap token `fun` with token `nai` 

### Current version

- `alice` calls `dex`
- `dex` calls `fun` and `nai` to lock corresponding balances.
    - `dex` creates a callback back to `dex` to call `on_locks`.
    - `dex` attaches this callback to joint promises for `fun` and `nai`.
    - `dex` returns this callback using `return_promise`.
- Scenario 1. Both locks succeeded. 
    - `fun` and `nai` locks balances within their contracts. 
        - `fun` returns lock ID
        - `nai` returns lock ID
    - `on_locks` on `dex` is called.
        - `dex` calls `fun` and `nai` to transfer funds.
        - `transferFrom` called on `fun` and `nai`
            - `fun` and `nai` transfers locked balances to the new owner.
            - `fun` and `nai` removes the locks internally.
- Scenario 2. `nai` lock failed
    - `fun` and `nai` locks balances within their contracts. 
        - `fun` returns lock ID
        - `nai` lock fails
    - `on_locks` on `dex` is called.
        - `dex` calls the a token contract with the successful lock to unlock funds.
            - `dex` calls method `unlock` on `fun`
        - `unlock` on `fun` is called.
            - unlocks funds with the corresponding lock.
- Scenario 3. Houston, we have a problem.
    - `fun` and `nai` locks balances within their contracts. 
        - `fun` returns lock ID
        - `nai` lock fails
    - `on_locks` on `dex` is called.
        - `dex` asserts both locks succeeded.
        - `dex` on_locks fails
    - Funds on `fun` remain locked for a while. Unless there is timed auto-unlock, funds are locked forever. This is a problem.

#### Current version - Diagrams

##### Current version - Scenario 1. Both locks succeeded

<!--
object alice dex fun nai

alice->dex: exchange(fun, bob, dai)
dex->fun: lock(alice)
dex->nai: lock(bob)
note left of dex: add callback on_locks(fun, dai)

fun->dex: Data: "fun-lock-id-1"
nai->dex: Data: "nai-lock-id-1"

dex->dex: on_locks(fun, dai) with data ["fun-lock-id-1", "nai-lock-id-1"]
dex->fun: transferFrom(fun-lock-id-1, alice, bob)
dex->nai: transferFrom(nai-lock-id-1, bob, alice)

dex->alice: Probably OK
-->

```text
+-------+                             +-----+                                                              +-----+ +-----+
| alice |                             | dex |                                                              | fun | | nai |
+-------+                             +-----+                                                              +-----+ +-----+
    |                                    |                                                                    |       |
    | exchange(fun, bob, dai)            |                                                                    |       |
    |----------------------------------->|                                                                    |       |
    |                                    |                                                                    |       |
    |                                    | lock(alice)                                                        |       |
    |                                    |------------------------------------------------------------------->|       |
    |                                    |                                                                    |       |
    |                                    | lock(bob)                                                          |       |
    |                                    |--------------------------------------------------------------------------->|
    |----------------------------------\ |                                                                    |       |
    || add callback on_locks(fun, dai) |-|                                                                    |       |
    ||---------------------------------| |                                                                    |       |
    |                                    |                                                                    |       |
    |                                    |                                              Data: "fun-lock-id-1" |       |
    |                                    |<-------------------------------------------------------------------|       |
    |                                    |                                                                    |       |
    |                                    |                                                      Data: "nai-lock-id-1" |
    |                                    |<---------------------------------------------------------------------------|
    |                                    |                                                                    |       |
    |                                    | on_locks(fun, dai) with data ["fun-lock-id-1", "nai-lock-id-1"]    |       |
    |                                    |----------------------------------------------------------------    |       |
    |                                    |                                                               |    |       |
    |                                    |<---------------------------------------------------------------    |       |
    |                                    |                                                                    |       |
    |                                    | transferFrom(fun-lock-id-1, alice, bob)                            |       |
    |                                    |------------------------------------------------------------------->|       |
    |                                    |                                                                    |       |
    |                                    | transferFrom(nai-lock-id-1, bob, alice)                            |       |
    |                                    |--------------------------------------------------------------------------->|
    |                                    |                                                                    |       |
    |                        Probably OK |                                                                    |       |
    |<-----------------------------------|                                                                    |       |
    |                                    |                                                                    |       |
```

##### Current version - Scenario 2. `nai` lock failed

<!--
object alice dex fun nai

alice->dex: exchange(fun, bob, dai)
dex->fun: lock(alice)
dex->nai: lock(bob)
note left of dex: add callback on_locks(fun, dai)

fun->dex: Data: "fun-lock-id-1"
nai->dex: FAIL

dex->dex: on_locks(fun, dai) with data ["fun-lock-id-1", FAIL]
dex->fun: unlock(fun-lock-id-1)

dex->alice: Sorry
-->

```text
+-------+                             +-----+                                                   +-----+ +-----+
| alice |                             | dex |                                                   | fun | | nai |
+-------+                             +-----+                                                   +-----+ +-----+
    |                                    |                                                         |       |
    | exchange(fun, bob, dai)            |                                                         |       |
    |----------------------------------->|                                                         |       |
    |                                    |                                                         |       |
    |                                    | lock(alice)                                             |       |
    |                                    |-------------------------------------------------------->|       |
    |                                    |                                                         |       |
    |                                    | lock(bob)                                               |       |
    |                                    |---------------------------------------------------------------->|
    |----------------------------------\ |                                                         |       |
    || add callback on_locks(fun, dai) |-|                                                         |       |
    ||---------------------------------| |                                                         |       |
    |                                    |                                                         |       |
    |                                    |                                   Data: "fun-lock-id-1" |       |
    |                                    |<--------------------------------------------------------|       |
    |                                    |                                                         |       |
    |                                    |                                                         |  FAIL |
    |                                    |<----------------------------------------------------------------|
    |                                    |                                                         |       |
    |                                    | on_locks(fun, dai) with data ["fun-lock-id-1", FAIL]    |       |
    |                                    |-----------------------------------------------------    |       |
    |                                    |                                                    |    |       |
    |                                    |<----------------------------------------------------    |       |
    |                                    |                                                         |       |
    |                                    | unlock(fun-lock-id-1)                                   |       |
    |                                    |-------------------------------------------------------->|       |
    |                                    |                                                         |       |
    |                              Sorry |                                                         |       |
    |<-----------------------------------|                                                         |       |
    |                                    |                                                         |       |
```


##### Current version - Scenario 3. Houston, we have a problem.

<!--
object alice dex fun nai

alice->dex: exchange(fun, bob, dai)
dex->fun: lock(alice)
dex->nai: lock(bob)
note left of dex: add callback on_locks(fun, dai)

fun->dex: Data: "fun-lock-id-1"
nai->dex: FAIL

dex->dex: on_locks(fun, dai) with data ["fun-lock-id-1", FAIL]
dex->dex: FAIL
note right of fun: Funds are still locked :(

note right of alice: Alice looks for a different blockchain :(
-->

```text
+-------+                                         +-----+                                                   +-----+                          +-----+
| alice |                                         | dex |                                                   | fun |                          | nai |
+-------+                                         +-----+                                                   +-----+                          +-----+
    |                                                |                                                         |                                |
    | exchange(fun, bob, dai)                        |                                                         |                                |
    |----------------------------------------------->|                                                         |                                |
    |                                                |                                                         |                                |
    |                                                | lock(alice)                                             |                                |
    |                                                |-------------------------------------------------------->|                                |
    |                                                |                                                         |                                |
    |                                                | lock(bob)                                               |                                |
    |                                                |----------------------------------------------------------------------------------------->|
    |            ----------------------------------\ |                                                         |                                |
    |            | add callback on_locks(fun, dai) |-|                                                         |                                |
    |            |---------------------------------| |                                                         |                                |
    |                                                |                                                         |                                |
    |                                                |                                   Data: "fun-lock-id-1" |                                |
    |                                                |<--------------------------------------------------------|                                |
    |                                                |                                                         |                                |
    |                                                |                                                         |                           FAIL |
    |                                                |<-----------------------------------------------------------------------------------------|
    |                                                |                                                         |                                |
    |                                                | on_locks(fun, dai) with data ["fun-lock-id-1", FAIL]    |                                |
    |                                                |-----------------------------------------------------    |                                |
    |                                                |                                                    |    |                                |
    |                                                |<----------------------------------------------------    |                                |
    |                                                |                                                         |                                |
    |                                                | FAIL                                                    |                                |
    |                                                |-----                                                    |                                |
    |                                                |    |                                                    |                                |
    |                                                |<----                                                    |                                |
    |                                                |                                                         | ----------------------------\  |
    |                                                |                                                         |-| Funds are still locked :( |  |
    |                                                |                                                         | |---------------------------|  |
    | --------------------------------------------\  |                                                         |                                |
    |-| Alice looks for a different blockchain :( |  |                                                         |                                |
    | |-------------------------------------------|  |                                                         |                                |
    |                                                |                                                         |                                |
```

#### Current version - Receipts

Let's look at receipts (See [How runtime works](#how-runtime-work)):

```rust
/// `alice` calls `dex`
//////// Original receipt
ActionReceipt {
    id: "A1",
    receiver_id: "dex",
    predecessor_id: "alice",
    input_data_ids: [],
    output_data_receivers: [],
    actions: [FunctionCall { method_name: "exchange", ... }],
}


/// `dex` calls `fun` and `nai` to lock corresponding balances.
//////// Executing A1
ActionReceipt {
    id: "A2",
    receiver_id: "fun",
    predecessor_id: "dex",
    input_data_ids: [],
    output_data_receivers: [],
    actions: [FunctionCall { method_name: "lock", ... }],
}
ActionReceipt {
    id: "A3",
    receiver_id: "nai",
    predecessor_id: "dex",
    input_data_ids: [],
    output_data_receivers: [],
    actions: [FunctionCall { method_name: "lock", ... }],
}

/// `dex` creates a callback back to `dex` to call `on_locks`.
ActionReceipt {
    id: "A4",
    receiver_id: "dex",
    predecessor_id: "dex",
    input_data_ids: [],
    output_data_receivers: [],
    actions: [FunctionCall { method_name: "on_locks", ... }],
}

/// `dex` attaches this callback to joint promises for `fun` and `nai`. (Modifies A2, A3, A4)
ActionReceipt {
    id: "A2",
    receiver_id: "fun",
    predecessor_id: "dex",
    input_data_ids: [],
    output_data_receivers: [
        DataReceiver {receiver_id: "dex", data_id: "data-id-1"}
    ],
    actions: [FunctionCall { method_name: "lock", ... }],
}
ActionReceipt {
    id: "A3",
    receiver_id: "nai",
    predecessor_id: "dex",
    input_data_ids: [],
    output_data_receivers: [
        DataReceiver {receiver_id: "dex", data_id: "data-id-2"}
    ],
    actions: [FunctionCall { method_name: "lock", ... }],
}
ActionReceipt {
    id: "A4",
    receiver_id: "dex",
    predecessor_id: "dex",
    input_data_ids: ["data-id-1", "data-id-2"],
    output_data_receivers: [],
    actions: [FunctionCall { method_name: "on_locks", ... }],
}

/// `dex` returns this callback using `return_promise`.
// No receipts are modified, but execution outcome for A1 changes to reflect to wait for A4.

```

##### Current version - Scenario 1. Both locks succeeded

```rust
/// `fun` and `nai` locks balances within their contracts

/// `fun` returns lock ID
//////// Executing A2 (Generates D1)
DataReceipt {
    id: "D1",
    receiver_id: "dex",
    predecessor_id: "fun",
    data_id: "data-id-1",
    data: Some(b"fun-lock-id-1"),
}

/// `nai` returns lock ID
//////// Executing A3 (Generates D2)
DataReceipt {
    id: "D2",
    receiver_id: "dex",
    predecessor_id: "nai",
    data_id: "data-id-2",
    data: Some(b"nai-lock-id-1"),
}

/// `on_locks` on `dex` is called.
//////// Executing A4

/// `dex` calls `fun` and `nai` to transfer funds.
// Generates 2 receipts A5 and A6, passes lock ids
ActionReceipt {
    id: "A5",
    receiver_id: "fun",
    predecessor_id: "dex",
    input_data_ids: [],
    output_data_receivers: [],
    actions: [FunctionCall { method_name: "trasnferFrom", ... }],
}

ActionReceipt {
    id: "A6",
    receiver_id: "nai",
    predecessor_id: "dex",
    input_data_ids: [],
    output_data_receivers: [],
    actions: [FunctionCall { method_name: "trasnferFrom", ... }],
}

/// `transferFrom` called on `fun` and `nai`.
/// `fun` and `nai` transfers locked balances to the new owner.
/// `fun` and `nai` removes the locks internally.

//////// Executing A5 and A6
....
```

##### Current version - Scenario 2. `nai` lock failed

```rust
/// `fun` and `nai` locks balances within their contracts
/// `fun` returns lock ID
//////// Executing A2 (Generates D1)
DataReceipt {
    id: "D1",
    receiver_id: "dex",
    predecessor_id: "fun",
    data_id: "data-id-1",
    data: Some(b"fun-lock-id-1"),
}

/// `nai` lock fails
//////// Executing A3 (Generates D2)
DataReceipt {
    id: "D2",
    receiver_id: "dex",
    predecessor_id: "nai",
    data_id: "data-id-2",
    data: None,
}

/// `on_locks` on `dex` is called.
//////// Executing A4

/// `dex` calls the a token contract with the successful lock to unlock funds
/// `dex` calls method `unlock` on `fun`
// Generates A5, passes lock id to unlock

ActionReceipt {
    id: "A5",
    receiver_id: "fun",
    predecessor_id: "dex",
    input_data_ids: [],
    output_data_receivers: [],
    actions: [FunctionCall { method_name: "unlock", args: b"{\"lock_id\": \"fun-lock-id-1\"}", ... }],
}

/// `unlock` on `fun` is called.
/// unlocks funds with the corresponding lock.
 
//////// Executing A5
....
```

##### Current version - Scenario 3. Houston, we have a problem.
    
```rust
/// `fun` and `nai` locks balances within their contracts
/// `fun` and `nai` locks balances within their contracts
/// `fun` returns lock ID
//////// Executing A2 (Generates D1)
DataReceipt {
    id: "D1",
    receiver_id: "dex",
    predecessor_id: "fun",
    data_id: "data-id-1",
    data: Some(b"fun-lock-id-1"),
}

/// `nai` lock fails
//////// Executing A3 (Generates D2)
DataReceipt {
    id: "D2",
    receiver_id: "dex",
    predecessor_id: "nai",
    data_id: "data-id-2",
    data: None,
}

/// `on_locks` on `dex` is called.
//////// Executing A4

/// `dex` asserts both locks succeeded.
/// `dex` on_locks fails
/// Funds on `fun` remain locked for a while.
/// Unless there is timed auto-unlock, funds are locked forever.

/// This is a problem.

```

### The proposal

- `alice` calls `dex`
- `dex` calls `fun` and `nai` to lock corresponding balances.
    - `dex` creates a callback back to `dex` to call `on_locks`.
    - `dex` attaches this callback to joint promises for `fun` and `nai`.
    - `dex` returns this callback using `return_promise`.
- Scenario 1. Both locks succeeded
    - `fun` and `nai` locks balances within their contracts. Explaining for `fun` only, `nai` is similar.
        - `fun` creates a new promise to `fun` to call `unlock`.
        - `fun` returns new lock ID and a callback using `value_with_callback_return` (debatable name).
    - `on_locks` on `dex` is called.
        - `dex` asserts both locks succeeded.
        - `dex` calls `fun` and `nai` to transfer funds.
        - `dex` creates a callback back to `dex` to call `on_transfers`.
        - `dex` attaches this callback to joint promises on `transfer` for `fun` and `nai`.
        - `dex` returns this callback using `return_promise`.
    - `transferFrom` called on `fun` and `nai`
        - `fun` transfers locked balances to the new owner.
        - `fun` removes the locks internally, so the following `unlock` for this lock ID will be noop.
    - `on_transfers` on `dex` is called. It can be noop.
        - returns `true`.
    - `unlock` is called on `fun` and `nai`.
        - Because transfers removed the locks, it's noop. 
- Scenario 2. `nai` lock failed.
    - `fun` and `nai` locks balances within their contracts, but `nai` fails.
        - `fun` creates a new promise to `fun` to call `unlock`.
        - `fun` returns new lock ID and a callback using `value_with_callback_return` (debatable name).
        - `nai` fails
    - `on_locks` on `dex` is called.
        - `dex` asserts both locks succeeded.
        - `on_locks` fails.
    - `unlock` is called on `fun`.
        - `fun` unlocks locked funds.

Two things to notice:
1. `dex` no longer need to unlock tokens in case of lock failures, instead it can assert success of locks.
2. `dex` has to attach a callback to token transfer `on_transfers`.

##### No need to unlock

`dex` doesn't need to explicitly unlock tokens, because tokens can now attach a callback to unlock themselves.
This callback going to executed when `on_locks` on `dex` finishes.
So if `on_locks` method fails early on asserts, the unlock callbacks are going to be called. But only for successful locks.

##### Need to depend on token transfers

This is a little more complicated. The reason `dex` needs to wait and depend on the token transfers is to avoid
tokens from being unlocked before transfers are completed.

If `dex` doesn't depend on transfers, the `unlock` might be executed before transfers, and someone might try to front-run it, so one of the transfers might fail.
To avoid this `dex` has to attach another callback towards transfer calls, this will delay `unlock` execution until transfers are executed.

#### Proposed changes - Diagrams

##### Proposed version - Scenario 1. Both locks succeeded

<!--
object alice dex fun nai

alice->dex: exchange(fun, bob, dai)
dex->fun: lock(alice)
dex->nai: lock(bob)
note left of dex: add callback on_locks(fun, dai)

note left of fun: add callback unlock(fun-lock-id-1)
fun->dex: Data: "fun-lock-id-1" and callback to unlock

note left of nai: add callback unlock(nai-lock-id-1)
nai->dex: Data: "nai-lock-id-1" and callback to unlock

dex->dex: on_locks(fun, dai) 
dex->fun: transferFrom(fun-lock-id-1, alice, bob)
dex->nai: transferFrom(nai-lock-id-1, bob, alice)
note left of dex: add callback on_transfers(fun, dai)

fun->dex: Data: OK
nai->dex: Data: OK

dex->dex: on_transfers(fun, dai) 
dex->alice: OK
dex->fun: Data: OK
dex->nai: Data: OK

fun->fun: unlock(fun-lock-id-1) NOOP
nai->nai: unlock(nai-lock-id-1) NOOP
-->

```text
+-------+                                 +-----+                                           +-----+                                 +-----+                         
| alice |                                 | dex |                                           | fun |                                 | nai |                         
+-------+                                 +-----+                                           +-----+                                 +-----+                         
    |                                        |                                                 |                                       |                            
    | exchange(fun, bob, dai)                |                                                 |                                       |                            
    |--------------------------------------->|                                                 |                                       |                            
    |                                        |                                                 |                                       |                            
    |                                        | lock(alice)                                     |                                       |                            
    |                                        |------------------------------------------------>|                                       |                            
    |                                        |                                                 |                                       |                            
    |                                        | lock(bob)                                       |                                       |                            
    |                                        |---------------------------------------------------------------------------------------->|                            
    |    ----------------------------------\ |                                                 |                                       |                            
    |    | add callback on_locks(fun, dai) |-|                                                 |                                       |                            
    |    |---------------------------------| |                                                 |                                       |                            
    |                                        |          -------------------------------------\ |                                       |                            
    |                                        |          | add callback unlock(fun-lock-id-1) |-|                                       |                            
    |                                        |          |------------------------------------| |                                       |                            
    |                                        |                                                 |                                       |                            
    |                                        |    Data: "fun-lock-id-1" and callback to unlock |                                       |                            
    |                                        |<------------------------------------------------|                                       |                            
    |                                        |                                                 |-------------------------------------\ |                            
    |                                        |                                                 || add callback unlock(nai-lock-id-1) |-|                            
    |                                        |                                                 ||------------------------------------| |                            
    |                                        |                                                 |                                       |                            
    |                                        |                                            Data: "nai-lock-id-1" and callback to unlock |                            
    |                                        |<----------------------------------------------------------------------------------------|                            
    |                                        |                                                 |                                       |                            
    |                                        | on_locks(fun, dai)                              |                                       |                            
    |                                        |--------------------                             |                                       |                            
    |                                        |                   |                             |                                       |                            
    |                                        |<-------------------                             |                                       |                            
    |                                        |                                                 |                                       |                            
    |                                        | transferFrom(fun-lock-id-1, alice, bob)         |                                       |                            
    |                                        |------------------------------------------------>|                                       |                            
    |                                        |                                                 |                                       |                            
    |                                        | transferFrom(nai-lock-id-1, bob, alice)         |                                       |                            
    |                                        |---------------------------------------------------------------------------------------->|                            
    |--------------------------------------\ |                                                 |                                       |                            
    || add callback on_transfers(fun, dai) |-|                                                 |                                       |                            
    ||-------------------------------------| |                                                 |                                       |                            
    |                                        |                                                 |                                       |                            
    |                                        |                                        Data: OK |                                       |                            
    |                                        |<------------------------------------------------|                                       |                            
    |                                        |                                                 |                                       |                            
    |                                        |                                                 |                              Data: OK |                            
    |                                        |<----------------------------------------------------------------------------------------|                            
    |                                        |                                                 |                                       |                            
    |                                        | on_transfers(fun, dai)                          |                                       |                            
    |                                        |------------------------                         |                                       |                            
    |                                        |                       |                         |                                       |                            
    |                                        |<-----------------------                         |                                       |                            
    |                                        |                                                 |                                       |                            
    |                                     OK |                                                 |                                       |                            
    |<---------------------------------------|                                                 |                                       |                            
    |                                        |                                                 |                                       |                            
    |                                        | Data: OK                                        |                                       |                            
    |                                        |------------------------------------------------>|                                       |                            
    |                                        |                                                 |                                       |                            
    |                                        | Data: OK                                        |                                       |                            
    |                                        |---------------------------------------------------------------------------------------->|                            
    |                                        |                                                 |                                       |                            
    |                                        |                                                 | unlock(fun-lock-id-1) NOOP            |                            
    |                                        |                                                 |---------------------------            |                            
    |                                        |                                                 |                          |            |                            
    |                                        |                                                 |<--------------------------            |                            
    |                                        |                                                 |                                       |                            
    |                                        |                                                 |                                       | unlock(nai-lock-id-1) NOOP 
    |                                        |                                                 |                                       |--------------------------- 
    |                                        |                                                 |                                       |                          | 
    |                                        |                                                 |                                       |<-------------------------- 
    |                                        |                                                 |                                       |                            
```

##### Proposed version - Scenario 1. Both locks succeeded

<!--
object alice dex fun nai

alice->dex: exchange(fun, bob, dai)
dex->fun: lock(alice)
dex->nai: lock(bob)
note left of dex: add callback on_locks(fun, dai)

note left of fun: add callback unlock(fun-lock-id-1)
fun->dex: Data: "fun-lock-id-1" and callback to unlock
nai->dex: FAIL

dex->dex: on_locks(fun, dai) 
dex->dex: Assert FAIL
dex->alice: FAIL (but nothing to worry, funds are SAFU)

fun->dex: FAIL

fun->fun: unlock(fun-lock-id-1)
-->

```text
+-------+                                         +-----+                                           +-----+                    +-----+
| alice |                                         | dex |                                           | fun |                    | nai |
+-------+                                         +-----+                                           +-----+                    +-----+
    |                                                |                                                 |                          |
    | exchange(fun, bob, dai)                        |                                                 |                          |
    |----------------------------------------------->|                                                 |                          |
    |                                                |                                                 |                          |
    |                                                | lock(alice)                                     |                          |
    |                                                |------------------------------------------------>|                          |
    |                                                |                                                 |                          |
    |                                                | lock(bob)                                       |                          |
    |                                                |--------------------------------------------------------------------------->|
    |            ----------------------------------\ |                                                 |                          |
    |            | add callback on_locks(fun, dai) |-|                                                 |                          |
    |            |---------------------------------| |                                                 |                          |
    |                                                |          -------------------------------------\ |                          |
    |                                                |          | add callback unlock(fun-lock-id-1) |-|                          |
    |                                                |          |------------------------------------| |                          |
    |                                                |                                                 |                          |
    |                                                |    Data: "fun-lock-id-1" and callback to unlock |                          |
    |                                                |<------------------------------------------------|                          |
    |                                                |                                                 |                          |
    |                                                |                                                 |                     FAIL |
    |                                                |<---------------------------------------------------------------------------|
    |                                                |                                                 |                          |
    |                                                | on_locks(fun, dai)                              |                          |
    |                                                |--------------------                             |                          |
    |                                                |                   |                             |                          |
    |                                                |<-------------------                             |                          |
    |                                                |                                                 |                          |
    |                                                | Assert FAIL                                     |                          |
    |                                                |------------                                     |                          |
    |                                                |           |                                     |                          |
    |                                                |<-----------                                     |                          |
    |                                                |                                                 |                          |
    |    FAIL (but nothing to worry, funds are SAFU) |                                                 |                          |
    |<-----------------------------------------------|                                                 |                          |
    |                                                |                                                 |                          |
    |                                                |                                            FAIL |                          |
    |                                                |<------------------------------------------------|                          |
    |                                                |                                                 |                          |
    |                                                |                                                 | unlock(fun-lock-id-1)    |
    |                                                |                                                 |----------------------    |
    |                                                |                                                 |                     |    |
    |                                                |                                                 |<---------------------    |
    |                                                |                                                 |                          |
```

#### Proposed Changes - Receipts

The first part is the same as in the current version. Scenarios are different.

```rust
/// `alice` calls `dex`
//////// Original receipt
ActionReceipt {
    id: "A1",
    receiver_id: "dex",
    predecessor_id: "alice",
    input_data_ids: [],
    output_data_receivers: [],
    actions: [FunctionCall { method_name: "exchange", ... }],
}


/// `dex` calls `fun` and `nai` to lock corresponding balances.
//////// Executing A1
ActionReceipt {
    id: "A2",
    receiver_id: "fun",
    predecessor_id: "dex",
    input_data_ids: [],
    output_data_receivers: [],
    actions: [FunctionCall { method_name: "lock", ... }],
}
ActionReceipt {
    id: "A3",
    receiver_id: "nai",
    predecessor_id: "dex",
    input_data_ids: [],
    output_data_receivers: [],
    actions: [FunctionCall { method_name: "lock", ... }],
}

/// `dex` creates a callback back to `dex` to call `on_locks`.
ActionReceipt {
    id: "A4",
    receiver_id: "dex",
    predecessor_id: "dex",
    input_data_ids: [],
    output_data_receivers: [],
    actions: [FunctionCall { method_name: "on_locks", ... }],
}

/// `dex` attaches this callback to joint promises for `fun` and `nai`. (Modifies A2, A3, A4)
ActionReceipt {
    id: "A2",
    receiver_id: "fun",
    predecessor_id: "dex",
    input_data_ids: [],
    output_data_receivers: [
        DataReceiver {receiver_id: "dex", data_id: "data-id-1"}
    ],
    actions: [FunctionCall { method_name: "lock", ... }],
}
ActionReceipt {
    id: "A3",
    receiver_id: "nai",
    predecessor_id: "dex",
    input_data_ids: [],
    output_data_receivers: [
        DataReceiver {receiver_id: "dex", data_id: "data-id-2"}
    ],
    actions: [FunctionCall { method_name: "lock", ... }],
}
ActionReceipt {
    id: "A4",
    receiver_id: "dex",
    predecessor_id: "dex",
    input_data_ids: ["data-id-1", "data-id-2"],
    output_data_receivers: [],
    actions: [FunctionCall { method_name: "on_locks", ... }],
}

/// `dex` returns this callback using `return_promise`.
// No receipts are modified, but execution outcome for A1 changes to reflect to wait for A4.

```

##### Proposed Changes - Scenario 1. Both locks succeeded

```rust
/// `fun` and `nai` locks balances within their contracts
//////// Executing A2

/// `fun` creates a new promise to `fun` to call `unlock`.
ActionReceipt {
    id: "C1",
    receiver_id: "fun",
    predecessor_id: "fun",
    input_data_ids: [],
    output_data_receivers: [],
    actions: [FunctionCall { method_name: "unlock", args: b"{\"lock_id\": \"fun-lock-id-1\"}", ... }],
}

/// `fun` returns new lock ID and a callback using `value_with_callback_return`.
// Creates D1 and modifies C1
DataReceipt {
    id: "D1",
    receiver_id: "dex",
    predecessor_id: "fun",
    data_id: "data-id-1",
    data: Some(b"fun-lock-id-1"),
    // See reference-level explanation for details
    new_output_data_receivers: [
        DataReceiver {receiver_id: "fun", data_id: "data-id-3"}
    ],
}
ActionReceipt {
    id: "C1",
    receiver_id: "fun",
    predecessor_id: "fun",
    input_data_ids: ["data-id-3"],
    output_data_receivers: [],
    actions: [FunctionCall { method_name: "unlock", args: b"{\"lock_id\": \"fun-lock-id-1\"}", ... }],
}

/// `nai` is similar to `fun`
/// `nai` creates a new promise to `nai` to call `unlock`.
ActionReceipt {
    id: "C2",
    receiver_id: "nai",
    predecessor_id: "nai",
    input_data_ids: [],
    output_data_receivers: [],
    actions: [FunctionCall { method_name: "unlock", args: b"{\"lock_id\": \"nai-lock-id-1\"}", ... }],
}

/// `nai` returns new lock ID and a callback using `value_with_callback_return`.
// Creates D2 and modifies C2
DataReceipt {
    id: "D2",
    receiver_id: "dex",
    predecessor_id: "nai",
    data_id: "data-id-2",
    data: Some(b"nai-lock-id-1"),
    // See reference-level explanation for details
    new_output_data_receivers: [
        DataReceiver {receiver_id: "nai", data_id: "data-id-4"}
    ],
}
ActionReceipt {
    id: "C2",
    receiver_id: "nai",
    predecessor_id: "nai",
    input_data_ids: ["data-id-4"],
    output_data_receivers: [],
    actions: [FunctionCall { method_name: "unlock", args: b"{\"lock_id\": \"nai-lock-id-1\"}", ... }],
}

/// `on_locks` on `dex` is called.
/// Because input `DataReceipt` contained `new_output_data_receivers`, the receipt `A4` might look like this.
/// Internally we wouldn't modify it, but we'll account for the new output data receivers
ActionReceipt {
    id: "A4",
    receiver_id: "dex",
    predecessor_id: "dex",
    input_data_ids: ["data-id-1", "data-id-2"],
    // 2 new data receivers we added for the received input data
    output_data_receivers: [
        DataReceiver {receiver_id: "fun", data_id: "data-id-3"},
        DataReceiver {receiver_id: "nai", data_id: "data-id-4"},
    ],
    actions: [FunctionCall { method_name: "on_locks", ... }],
}

//////// Executing A4

/// `dex` asserts both locks succeeded.
// This is OK, since both locks succeeded.

/// `dex` calls `fun` and `nai` to transfer funds.
// Generates 2 receipts A5 and A6, passes lock IDs
ActionReceipt {
    id: "A5",
    receiver_id: "fun",
    predecessor_id: "dex",
    input_data_ids: [],
    output_data_receivers: [],
    actions: [FunctionCall { method_name: "trasnferFrom", ... }],
}

ActionReceipt {
    id: "A6",
    receiver_id: "nai",
    predecessor_id: "dex",
    input_data_ids: [],
    output_data_receivers: [],
    actions: [FunctionCall { method_name: "trasnferFrom", ... }],
}

/// `dex` creates a callback back to `dex` to call `on_transfers`.
// Generates A7
ActionReceipt {
    id: "A7",
    receiver_id: "dex",
    predecessor_id: "dex",
    input_data_ids: [],
    output_data_receivers: [],
    actions: [FunctionCall { method_name: "on_transfers", ... }],
}

/// `dex` attaches this callback to joint promises on `transfer` for `fun` and `nai`.
// This modifies A5, A6 and A7
ActionReceipt {
    id: "A5",
    receiver_id: "fun",
    predecessor_id: "dex",
    input_data_ids: [],
    output_data_receivers: [
        DataReceiver {receiver_id: "dex", data_id: "data-id-5"},
    ],
    actions: [FunctionCall { method_name: "trasnferFrom", ... }],
}
ActionReceipt {
    id: "A6",
    receiver_id: "nai",
    predecessor_id: "dex",
    input_data_ids: [],
    output_data_receivers: [
        DataReceiver {receiver_id: "dex", data_id: "data-id-6"},
    ],
    actions: [FunctionCall { method_name: "trasnferFrom", ... }],
}
ActionReceipt {
    id: "A7",
    receiver_id: "dex",
    predecessor_id: "dex",
    input_data_ids: ["data-id-5", "data-id-6"],
    output_data_receivers: [],
    actions: [FunctionCall { method_name: "on_transfers", ... }],
}

/// `dex` returns this callback (A7) using `return_promise`.
// This modifies A7, by redirecting output from A4.
ActionReceipt {
    id: "A7",
    receiver_id: "dex",
    predecessor_id: "dex",
    input_data_ids: ["data-id-5", "data-id-6"],
    output_data_receivers: [
        DataReceiver {receiver_id: "fun", data_id: "data-id-3"},
        DataReceiver {receiver_id: "nai", data_id: "data-id-4"},
    ],
    actions: [FunctionCall { method_name: "on_transfers", ... }],
}


//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////// NOTE //////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////

/// Now A7 can only be executed after A5 and A6.
/// Which means C1 and C2 can only be executed after both A5 and A6.

/// `transferFrom` called on `fun` and `nai`
/// `fun` and `nai` transfer locked balances to the new owner.
/// `fun` and `nai` remove the locks internally, so the following `unlock` for these lock IDs will be noop.

//////// Executing A5 and A6

// `fun` generates D3, `nai` generates `D4`
DataReceipt {
    id: "D3",
    receiver_id: "dex",
    predecessor_id: "fun",
    data_id: "data-id-5",
    data: Some(b"true"),
    new_output_data_receivers: [],
}
DataReceipt {
    id: "D4",
    receiver_id: "dex",
    predecessor_id: "nai",
    data_id: "data-id-6",
    data: Some(b"true"),
    new_output_data_receivers: [],
}

/// `on_transfers` on `dex` is called. It can be noop.
/// returns `true`.

//////// Executing A7
// Generates data receipts D5, D6
DataReceipt {
    id: "D5",
    receiver_id: "fun",
    predecessor_id: "dex",
    data_id: "data-id-3",
    data: Some(b"true"),
    new_output_data_receivers: [],
}
DataReceipt {
    id: "D6",
    receiver_id: "nai",
    predecessor_id: "dex",
    data_id: "data-id-4",
    data: Some(b"true"),
    new_output_data_receivers: [],
}

/// `unlock` is called on `fun` and `nai`.
/// Because transfers removed the locks, it's noop. 

//////// Executing C1 and C2
// Internally it checks that lock IDs were used, so it's NOOP.
```

##### Proposed Changes - Scenario 2. `nai` lock failed

```rust
/// `fun` and `nai` locks balances within their contracts
//////// Executing A2

/// `fun` creates a new promise to `fun` to call `unlock`.
ActionReceipt {
    id: "C1",
    receiver_id: "fun",
    predecessor_id: "fun",
    input_data_ids: [],
    output_data_receivers: [],
    actions: [FunctionCall { method_name: "unlock", args: b"{\"lock_id\": \"fun-lock-id-1\"}", ... }],
}

/// `fun` returns new lock ID and a callback using `value_with_callback_return`.
// Creates D1 and modifies C1
DataReceipt {
    id: "D1",
    receiver_id: "dex",
    predecessor_id: "fun",
    data_id: "data-id-1",
    data: Some(b"fun-lock-id-1"),
    // See reference-level explanation for details
    new_output_data_receivers: [
        DataReceiver {receiver_id: "fun", data_id: "data-id-3"}
    ],
}
ActionReceipt {
    id: "C1",
    receiver_id: "fun",
    predecessor_id: "fun",
    input_data_ids: ["data-id-3"],
    output_data_receivers: [],
    actions: [FunctionCall { method_name: "unlock", args: b"{\"lock_id\": \"fun-lock-id-1\"}", ... }],
}

/// `nai` tried to create a promise to call `unlock`, but it run out of gas, so it failed to lock balance as well.
// Runtime automatically generates DataReceipt D2 with `data: None`.
DataReceipt {
    id: "D2",
    receiver_id: "dex",
    predecessor_id: "nai",
    data_id: "data-id-2",
    data: None,
    new_output_data_receivers: [],
}


/// `on_locks` on `dex` is called.
/// Because input `DataReceipt` contained `new_output_data_receivers`, the receipt `A4` might look like this.
/// Internally we wouldn't modify it, but we'll account for the new output data receiver from `fun`.
ActionReceipt {
    id: "A4",
    receiver_id: "dex",
    predecessor_id: "dex",
    input_data_ids: ["data-id-1", "data-id-2"],
    // 1 new data receivers we added for the received input data from `fun`
    output_data_receivers: [
        DataReceiver {receiver_id: "fun", data_id: "data-id-3"},
    ],
    actions: [FunctionCall { method_name: "on_locks", ... }],
}

//////// Executing A4

/// `dex` asserts both locks succeeded.
// Assertion fails, so `on_locks` fails as well.
// Runtime automatically generates a DataReceipt D3 with `data: None`.
DataReceipt {
    id: "D5",
    receiver_id: "fun",
    predecessor_id: "dex",
    data_id: "data-id-3",
    data: None,
    new_output_data_receivers: [],
}

/// `unlock` is called on `fun`.
/// `fun` unlocks locked funds.

//////// Executing C1
// Internally it checks that lock IDs is still valid and unlocks it.
```

# Reference-level explanation
[reference-level-explanation]: #reference-level-explanation

This change doesn't require complicated changes on runtime. The economics of this change also work, since caller promises are prepaid, there are no additional unexpected fees.
It also reuses the limitation that we have right now with the existing `promise_return`, it can't return a joint promise (a promise created with `promise_and`).

## How Runtime works now
[how-runtime-works]: #how-runtime-works

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

When a `promise_then` is called, it depends on one promise ID. This promise ID can either be a regular promise or a joint promise.
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
    id: "A1",
    receiver_id: "A",
    predecessor_id: "USER",
    input_data_ids: [],
    output_data_receivers: [],
}


//////// Executing A1

// `A` calls `B`. (A2 is created)
ActionReceipt {
    id: "A2",
    receiver_id: "B",
    predecessor_id: "A",
    input_data_ids: [],
    output_data_receivers: [],
}

// Attaches a callback back to `A`. (A2 is modified, A3 is created)
ActionReceipt {
    id: "A2",
    receiver_id: "B",
    predecessor_id: "A",
    input_data_ids: [],
    output_data_receivers: [
        DataReceiver {receiver_id: "A", data_id: "data-id-1"}
    ]
}
ActionReceipt {
    id: "A3",
    receiver_id: "A",
    predecessor_id: "A",
    input_data_ids: ["data-id-1"],
    output_data_receivers: []
}

// Returns callback `A`. (Doesn't change anything, cause A1 doesn't have output)


//////// Executing A2

// `B` calls `C` and `D`. (A4 and A5 are created)
ActionReceipt {
    id: "A4",
    receiver_id: "C",
    predecessor_id: "B",
    input_data_ids: [],
    output_data_receivers: [],
}
ActionReceipt {
    id: "A5",
    receiver_id: "D",
    predecessor_id: "B",
    input_data_ids: [],
    output_data_receivers: [],
}

// Attaches a callback from `C` to `D`. (A4 and A5 are modified)
ActionReceipt {
    id: "A4",
    receiver_id: "C",
    predecessor_id: "B",
    input_data_ids: [],
    output_data_receivers: [
        DataReceiver {receiver_id: "D", data_id: "data-id-2"},
    ],
}
ActionReceipt {
    id: "A5",
    receiver_id: "D",
    predecessor_id: "B",
    input_data_ids: ["data-id-2"],
    output_data_receivers: [],
}
// And returns promise `C`. (A4 is modified)
ActionReceipt {
    id: "A4",
    receiver_id: "C",
    predecessor_id: "B",
    input_data_ids: [],
    output_data_receivers: [
        DataReceiver {receiver_id: "A", data_id: "data-id-1"},
        DataReceiver {receiver_id: "D", data_id: "data-id-2"},
     ],
}
```

So now when `A4` is executed, it will send 2 data receipts.

Let's now discuss how to implement the proposed change.

## Proposed change

### Back to example

In the example with `fun` tokens, we need to attach a promise on the caller. But let's look at the example of `A4` receipt instead:
```rust
ActionReceipt {
    id: "A4",
    receiver_id: "C",
    predecessor_id: "B",
    input_data_ids: [],
    output_data_receivers: [
        DataReceiver {receiver_id: "A", data_id: "data-id-1"},
        DataReceiver {receiver_id: "D", data_id: "data-id-2"},
     ],
}
```

There caller (`predecessor_id`) is `B`, but the output data receivers are `A` and `D`.
Execution at `C` can't influence `B` or attach any promises or callbacks to `B`, because execution of `B` has already completed or has indirect dependency.
Instead `C` can only influence both `A` and `D`. 

Now lets look at `fun` token receipt example:
```rust
ActionReceipt {
    id: "A6",
    receiver_id: "fun",
    predecessor_id: "dex",
    input_data_ids: [],
    output_data_receivers: [
        DataReceiver {receiver_id: "dex", data_id: "D3"},
     ],
}
```

In this case `dex` is both the caller and the output data receiver.
So for the `lock` example `fun` might be able to attach something towards `dex` through the generated output data.

### Changes

- Add a new runtime API method `value_with_callback_return` (the name is debatable).
- Add another return type to VMLogic, that is Value with callbacks. Or modify existing Value return.
- Add a new field to `DataReceipt` to provide new outputs. Call it `new_output_data_receivers` which is a vector of `DataReceiver`.
- Modify logic of Runtime on passing `output_data_receivers` towards `VMLogic`.
The new `output_data_receivers` should not only contains data from the receipt, but also a contain all receivers from `new_output_data_receivers` from `DataReceipt`s.

New `DataReceipt` and `ReceivedData` structures:
```rust
#[derive(BorshSerialize, BorshDeserialize, Hash, PartialEq, Eq, Clone)]
pub struct DataReceipt {
    pub data_id: CryptoHash,
    pub data: Option<Vec<u8>>,
    pub new_output_data_receivers: Vec<DataReceiver>,
}

#[derive(BorshSerialize, BorshDeserialize, Hash, PartialEq, Eq, Clone)]
pub struct ReceivedData {
    pub data: Option<Vec<u8>>,
    pub new_output_data_receivers: Vec<DataReceiver>,
}
```

# Rationale
[rationale]: #rationale

- When returning a `value_with_callback_return`, the Runtime knows how many output data receivers are there.
So we can calculate the cost of the data receipts required to generate. 
- Existing return types doesn't break the assumption and we can easily modify the output receivers of not yet executed action receipt
- If there are more than 1 output data receiver, then the `unlock` will depend on the both outputs and it wouldn't unlock early.
- The unlock is fully prepaid during the lock, so the lock can't happen without unlock.
- It requires a little changes to Runtime and doesn't introduce storage locks.
- Developers don't need to explicitly unlock.
- The change is flexible enough to support locks and doesn't force developers to be limited to Row locks.
- It supports all examples that were discussed offline, including
    - proxy: works with proxy, if proxy just returns a promise instead of having a callback. 
    - 2 exchanges. The lock will be dropped before leaving the exchange contract. So it will unlock. Also doesn't affect, cause re-entry is handled differently.
- This doesn't break the existing Runtime API.
    
# Drawbacks
[drawbacks]: #drawbacks

- This might be complicated to developers to understand the difference between the return types. Hopefully the bindgen will hide it or simplify it.
- There are might be a need in some additional API to redirect output data dependencies to a caller as well. This is if the proxy decides to implement a callback. Can discuss offline.


# Unresolved questions
[unresolved-questions]: #unresolved-questions

- How a proxy contract can be implemented with a callback. Such as `dex` -> `proxy` -> `token` -> `proxy` -> `dex`.
In this case the callback at `proxy` will drop the `unlock` dependency, and the `token` will unlock. Instead it should somehow return data dependency back to `dex`.
For this data output needs to be visible to VM logic. And input data would need to have a `predecessor_id` (which we can expose in `ReceivedData`).

# Future possibilities
[future-possibilities]: #future-possibilities

- Implement more runtime APIs to allow redirect some outputs instead of returning them. This will resolve the proxy callback problem.
