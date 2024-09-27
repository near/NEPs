---
NEP: 519
Title: Yield Execution
Authors: Akhi Singhania <akhi3030@gmail.com>; Saketh Are <saketh@near.org>
Status: Draft
DiscussionsTo: https://github.com/near/NEPs/pull/519
Type: Protocol
Version: 0.0.0
Created: 2023-11-17
LastUpdated: 2023-11-20
---

## Summary

Today, when a smart contract is called by a user or another contract, it has no sensible way to delay responding to the caller till it has observed another future transaction.  This proposal introduces this possibility into the NEAR protocol.

## Motivation

There exist some situations where when a smart contract on NEAR is called, it will only be able to provide an answer at some time in the future.  The callee needs a way to defer replying to the caller while the response is being prepared.

Examples include a smart contract (`S`) that provides the MPC signing capability.  It relies on indexers external to the NEAR protocol for computing the signatures.  The rough steps are:

1. Signer contract provides a function `fn sign_payload(Payload, ...)`.
2. When called, the contract defers replying to the caller.
3. External indexers are monitoring the transactions on the contract; they observe the new signing request, compute a signature, and call another function `fn signature_available(Signature, ...)` on the signer contract.
4. The signer contract validates the signature and replies to the original caller.

Today, the NEAR protocol has no sensible way to defer replying to the caller in step 2 above.  This proposal proposes adding two following new host functions to the NEAR protocol:

- `promise_yield_create`: allows setting up a continuation function that should only be executed after `promise_yield_resume` is invoked.  Together with `promise_return` this allows delaying the reply to the caller;
- `promise_yield_resume`: indicates to the protocol that the continuation to the yield may now be executed.

If these two host functions were available, then `promise_yield_create` would be used to implement step 2 above and `promise_yield_resume` would be used for step 3 of the motivating example above.

## Specification

The proposal is to add the following host functions to the NEAR protocol:


```rust
/// Smart contracts can use this host function along with
/// `promise_yield_resume()` to delay replying to their caller for up to 200
/// blocks.  This host function allows the contract to provide a callback to the
/// protocol that will be executed after either contract calls
/// `promise_yield_resume()` or after 200 blocks have been executed.  The
/// callback then has the opportunity to either reply to the caller or to delay
/// replying again.
///
/// `method_name_len` and `method_name_ptr`: Identify the callback method that
/// should be executed either after the contract calls `promise_yield_resume()`
/// or after 200 blocks have been executed.
///
/// `arguments_len` and `arguments_ptr` provide an initial blob of arguments
/// that will be passed to the callback.  These will be available via the
/// `input` host function.
///
/// `gas`: Similar to the `gas` parameter in
/// [promise_create](https://github.com/near/nearcore/blob/a908de36ab6f75eb130447a5788007e26d05f93e/runtime/near-vm-runner/src/logic/logic.rs#L1281),
/// the `gas` parameter is a prepayment for the gas that would be used to
/// execute the callback.
///
/// `gas_weight`: Similar to the `gas_weight` parameter in
/// [promise_batch_action_function_call_weight](https://github.com/near/nearcore/blob/a908de36ab6f75eb130447a5788007e26d05f93e/runtime/near-vm-runner/src/logic/logic.rs#L1699),
/// this improves the devX for the smart contract.  It allows a contract to
/// specify a portion of the remaining gas for executing the callback instead of
/// specifying a precise amount.
///
/// `register_id`: is used to identify the register that will be filled with a
/// unique resumption token. This token is used with `promise_yield_resume` to
/// resolve the continuation receipt set up by this function.
///
/// Return value: u64: Similar to the
/// [promise_create](https://github.com/near/nearcore/blob/a908de36ab6f75eb130447a5788007e26d05f93e/runtime/near-vm-runner/src/logic/logic.rs#L1281)
/// host function, this function also create a promise and returns an index to
/// the promise.  This index can be used to create a chain of promises.
pub fn promise_yield_create(
    method_name_len: u64,
    method_name_ptr: u64,
    arguments_len: u64,
    arguments_ptr: u64,
    gas: u64,
    gas_weight: u64,
    register_id: u64,
) -> u64;

/// See `promise_yield_create()` for more details.  This host function can be
/// used to resolve the continuation that was set up by
/// `promise_yield_create()`.  The contract calling this function must be the
/// same contract that called `promise_yield_create()` earlier.  This host
/// function cannot be called for the same resumption token twice or if the
/// callback specified in `promise_yield_create()` has already executed.
///
/// `data_id_len` and `data_it_ptr`: Used to pass the unique resumption token
/// that was returned to the smart contract in the `promise_yield_create()`
/// function (via the register).
///
/// `payload_len` and `payload_ptr`: the smart contract can provide an
/// additional optional blob of arguments that should be passed to the callback
/// that will be resumed.  These are available via the `promise_result` host
/// function.
///
/// This function can be called multiple times with the same data id.  If it is
/// called successfully multiple times, then the implementation guarantees that
/// the yielded callback will execute with one of the successfully submitted
/// payloads.  If submission was successful, then `1` is returned.   Otherwise
/// (e.g. if the yield receipt has already timed out or the yielded callback has
/// already been executed) `0` will be returned, indicating that this payload
/// could not be submitted successfully.
pub fn promise_yield_resume(
    data_id_len: u64,
    data_id_ptr: u64,
    payload_len: u64,
    payload_ptr: u64,
) -> u32;
```

## Reference Implementation

The reference implementation against the nearcore repository can be found in this [PR](https://github.com/near/nearcore/pull/10415).

## Security Implications

Some potential security issues have been identified and are covered below:

- Smart contracts using this functionality have to be careful not to let just any party trigger a call to `promise_yield_resume`.  In the example above, it is possible that a malicious actor may pretend to be an external signer and call the `signature_available()` function with an incorrect signature.  Hence contracts should be taking precautions by only letting select callers call the function (by using [this](https://github.com/aurora-is-near/near-plugins/blob/master/near-plugins/src/access_controllable.rs) service for example) and validating the payload before acting upon it.
- This mechanism introduces a new way to create delayed receipts in the protocol.  When the protocol is under conditions of congestion, this mechanism could be used to further aggravate the situation.  This is deemed as not a terrible issue as the existing mechanisms of using promises and etc. can also be used to further exacerbate the situation.

## Alternatives

Two alternatives have been identified.

### Self calls to delay replying

In the `fn sign_payload(Payload, ...)` function, instead of calling `yield`, the contract can keep calling itself in a loop till external indexer replies with the signature.  This would work but would be very fragile and expensive.  The contract would have to pay for all the calls and function executions while it is waiting for the response.  Also depending on the congestion on the network; if the shard is not busy at all, some self calls could happen within the same block meaning that the contract might not actually wait for as long as it hoped for and if the network is very busy then the call from the external indexer might be arbitrarily delayed.

### Change the flow of calls

The general flow of cross contract calls in NEAR is that a contract `A` sends a request to another contract `B` to perform a service and `B` replies to `A` with the response.  This flow could be altered.  When a contract `A` calls `B` to perform a service, `B` could respond with a "promise to call it later with the answer".  Then when the signature is eventually available, `B` can then send `A` a request with the signature.

There are some problems with this approach though.  After the change of flow of calls; `B` is now going to be paying for gas for various executions that `A` should have been paying for.  Due to bugs or malicious intent, `B` could forget to call `A` with the signature.  If `A` is calling `B` deep in a call tree and `B` replies to it without actually providing an answer, then `A` would need a mechanism to keep the call tree alive while it waits for `B` to call it with the signature in effect running into the same problem that this NEP is attempting to solve.

## Future possibilities

One potential future possibility is to allow contracts to specify how long the protocol should wait (up to a certain limit) for the contract to call `promise_yield_resume`.  If contracts specify a smaller value, they would potentially be charged a smaller gas fee.  This would make contracts more efficient.  This enhancement does lead to a more complex implementation and could even allow malicious contracts to more easily concentrate a lot of callbacks to occur at the same time increasing the congestion on the network.  Hence, we decided not to include this feature for the time being.

## Consequences

[This section describes the consequences, after applying the decision. All consequences should be summarized here, not just the "positive" ones. Record any concerns raised throughout the NEP discussion.]

### Positive

- p1

### Neutral

- n1

### Negative

- n1

### Backwards Compatibility

We believe this can be implemented with full backwards compatibility.

## Changelog

### 1.0.0 - Initial Version

> Placeholder for the context about when and who approved this NEP version.

#### Benefits

> List of benefits filled by the Subject Matter Experts while reviewing this version:

- Benefit 1
- Benefit 2

#### Concerns

> Template for Subject Matter Experts review for this version:
> Status: New | Ongoing | Resolved

|   # | Concern | Resolution | Status |
| --: | :------ | :--------- | -----: |
|   1 |         |            |        |
|   2 |         |            |        |

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
