---
NEP: 519
Title: Yield Execution
Authors: Akhi Singhania <akhi3030@gmail.com>
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

There exist some situations where when a smart contract on NEAR is called, it will only be able to provide an answer at some arbitrary time in the future.  So the callee needs a way to defer replying to the caller till this time in future.

Examples include when a smart contract (`S`) provides MPC signing capabilities parties external to the NEAR protocol are computing the signature.  The rough steps are:

1. Signer contract provides a function `fn sign_payload(Payload, ...)`.
2. When called, the contract defers replying to the caller.
3. External indexers are monitoring the transactions on the contract; they observe the new signing request, compute a signature, and call another function `fn signature_available(Signature, ...)` on the signer contract.
4. The signer contract validates the signature and if validate, replies to the original caller.

Today, the NEAR protocol has no sensible way to defer replying to the caller in step 2 above.  This proposal proposes adding two following new host functions to the NEAR protocol:

- `yield`: this can be called by a contract to indicate to the protocol that it is not ready yet to reply to its caller.
- `resume`: a contract can use this mechanism to indicate to a protocol that it is now ready to reply to a caller that it had deferred earlier.

If these two host functions were available, then `yield` would be used in step 2 above and `resume` would be used in step 4 above.

## Specification

The proposal is to add the following host functions to the NEAR protocol:


```rust
/// Instructs the protocol that the smart contract is not yet ready to respond
/// to its caller yet.  The smart contract promises to call
/// `promise_yield_resume()` within X (TBD) blocks.  When
/// `promise_yield_resume()` is called, the protocol will call the method on the
/// smart contract that is identified by `method_name_len` and `method_name_ptr`
/// and this method may or may not respond to the caller.
///
/// `arguments_len` and `arguments_ptr` provide an initial blob of arguments
/// that will be passed to the method.
///
/// If the contract fails to call `promise_yield_resume()` within X blocks, then
/// the protocol will call the method with a timeout error.
///
/// Similar to the `gas` parameter in
/// [promise_create](https://github.com/near/nearcore/blob/a908de36ab6f75eb130447a5788007e26d05f93e/runtime/near-vm-runner/src/logic/logic.rs#L1281),
/// the `gas` parameter is a prepayment for the gas that would be used to
/// execute the method.
///
/// `gas_weight`: as specified in
/// [this](https://github.com/near/NEPs/blob/master/neps/nep-0264.md) NEP, this
/// improves the devX of specifying a portion of the remaining gas for executing
/// the method instead of specifying a precise amount.
///
/// `register_id`: is used to identify the register that will be used by the
/// protocol to return unique token referring to this yielded execution to the
/// contract.  The contract will have to pass this value when it calls
/// `promise_yield_resume`.
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

/// When a smart contract has postponed replying to its caller earlier, it can
/// use this function to indicate that it may now be ready to reply to it.  When
/// this is called, then the protocol will call the method that the smart
/// contract referred to in the earlier `promise_yield_create()` call.
///
/// `data_id_len` and `data_it_ptr`: This value was returned in an earlier call
/// to `promise_yield_create` and uniquely identifies which yielded execution
/// should be resumed.
///
/// `payload_len` and `payload_ptr`: the smart contract can provide an
/// additional optional blob of arguments that should be passed to the method
/// that will be resumed. These will be appended to the list that was provided
/// in `promise_yield_create`
pub fn promise_yield_resume(
    data_id_len: u64,
    data_id_ptr: u64,
    payload_len: u64,
    payload_ptr: u64,
) -> ();
```

## Reference Implementation

The reference implementation against the nearcore repository can be found in this [PR](https://github.com/near/nearcore/pull/10415).  Below is a pseudocode reproduction of the relevant pieces.

```rust
pub fn promise_yield_create(
    &mut self,
    method_name_len: u64,
    method_name_ptr: u64,
    arguments_len: u64,
    arguments_ptr: u64,
    gas: Gas,
    gas_weight: u64,
    register_id: u64,
) -> Result<u64> {
    // Look up and validate the passed data
    let (method_name, arguments) = lookup_and_validate(
        method_name_len,
        method_name_ptr,
        arguments_len,
        arguments_ptr,
    );

    let current_account_id = self.context.current_account_id.clone();

    // Pay all gas fees for using the host function
    self.gas_counter.pay_base(yield_create_base);
    let num_bytes = method_name.len() + arguments.len();
    self.gas_counter.pay_per(yield_create_bytes, num_bytes);

    // Create a receipt with a single data dependency which will be resolved by
    // either by the resume call or the timeout.
    let data_id = self.generate_data_id();
    let receipt = ReceiptMetadata {
        output_data_receivers: vec![],
        input_data_ids: vec![data_id],
        actions: vec![],
    };
    let receipt_index = self.action_receipts.push((current_account_id, receipt));
    let promise_index = Promise::Receipt(receipt_index);

    self.registers.set(register_id, *data_id.as_bytes())?;
    Ok(promise_index)
}

pub fn promise_yield_resume(
    &mut self,
    data_id_len: u64,
    data_id_ptr: u64,
    payload_len: u64,
    payload_ptr: u64,
) -> Result<(), VMLogicError> {
    // Look up and validate the passed data
    let (data_id, payload) =
        lookup_and_validate(data_id_len, data_id_ptr, payload_len, payload_ptr);

    let current_account_id = self.context.current_account_id.clone();

    // Pay all gas fees for using the host function
    self.gas_counter.pay_base(yield_resume_base);
    self.gas_counter.pay_per(yield_submit_byte, payload_len);

    // Look up the previously yielded promise from the trie
    let yielded_promise = get_yielded_promise(data_id);

    // Yields can only be resumed by the account which created them
    if yielded_promise.account_id != current_account_id {
        return Error;
    }

    // Create a data receipt and it on the the queue of data receipts so that
    // eventually the function call will be processed.
    return self.receipt_manager.create_data_receipt(data_id, payload);
}
```

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

[Describe any natural extensions and evolutions to the NEP proposal, and how they would impact the project. Use this section as a tool to help fully consider all possible interactions with the project in your proposal. This is also a good place to "dump ideas"; if they are out of scope for the NEP but otherwise related. Note that having something written down in the future-possibilities section is not a reason to accept the current or a future NEP. Such notes should be in the section on motivation or rationale in this or subsequent NEPs. The section merely provides additional information.]

## Consequences

[This section describes the consequences, after applying the decision. All consequences should be summarized here, not just the "positive" ones. Record any concerns raised throughout the NEP discussion.]

### Positive

- p1

### Neutral

- n1

### Negative

- n1

### Backwards Compatibility

[All NEPs that introduce backwards incompatibilities must include a section describing these incompatibilities and their severity. Author must explain a proposes to deal with these incompatibilities. Submissions without a sufficient backwards compatibility treatise may be rejected outright.]

## Unresolved Issues (Optional)

[Explain any issues that warrant further discussion. Considerations

- What parts of the design do you expect to resolve through the NEP process before this gets merged?
- What parts of the design do you expect to resolve through the implementation of this feature before stabilization?
- What related issues do you consider out of scope for this NEP that could be addressed in the future independently of the solution that comes out of this NEP?]

## Changelog

[The changelog section provides historical context for how the NEP developed over time. Initial NEP submission should start with version 1.0.0, and all subsequent NEP extensions must follow [Semantic Versioning](https://semver.org/). Every version should have the benefits and concerns raised during the review. The author does not need to fill out this section for the initial draft. Instead, the assigned reviewers (Subject Matter Experts) should create the first version during the first technical review. After the final public call, the author should then finalize the last version of the decision context.]

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
