- Proposal Name: `promise_gas_ratio`
- Start Date: 2021-09-30
- NEP PR: [nearprotocol/neps#264](https://github.com/nearprotocol/neps/pull/264)
- Issue(s): https://github.com/near/near-sdk-rs/issues/526

# Summary
[summary]: #summary

This proposal is to introduce a new host function on the NEAR runtime that allows for scheduling cross-contract function calls using a percentage/ratio of the remaining gas in addition to the statically defined amount. This will enable async promise execution to use the remaining gas more efficiently by utilizing unspent gas from the current transaction.

# Motivation
[motivation]: #motivation

We are proposing this to be able to utilize gas more efficiently but also to improve the devX of cross-contract calls. Currently, developers must guess how much gas will remain after the current transaction finishes and if this value is too little, the transaction will fail, and if it is too large, gas will be wasted. Therefore, these cross-contract calls need a reasonable default of splitting unused gas efficiently for basic cases without sacrificing the ability to configure the gas amount attached at a granular level. Currently, gas is allocated very inefficiently, requiring more prepaid gas or failed transactions when the allocations are imprecise.

# Guide-level explanation
[guide-level-explanation]: #guide-level-explanation

This host function is similar to [`promise_batch_action_function_call`](https://github.com/near/nearcore/blob/7d15bbc996282c8ae8f15b8f49d110fc901b84d8/runtime/near-vm-logic/src/logic.rs#L1526), except with an additional parameter that lets you specify how much of the excess gas should be attached to the function call. This parameter is a ratio value that determines how much of the excess gas is attached to each function. 

So, for example, if there is 40 gas leftover and three function calls that select ratios of 1, 5, and 2, the runtime will add 5, 25, and 10 gas to each function call. A developer can specify whether they want to attach a fixed amount of gas, a ratio of remaining gas, or both. If at least one function call uses a ratio of remaining gas, then all excess gas will be attached to future calls. This proposal allows developers the ability to utilize prepaid gas more efficiently than currently possible.

# Reference-level explanation
[reference-level-explanation]: #reference-level-explanation

This host function would need to be implemented in `nearcore` and parallel [`promise_batch_action_function_call`](https://github.com/near/nearcore/blob/7d15bbc996282c8ae8f15b8f49d110fc901b84d8/runtime/near-vm-logic/src/logic.rs#L1526). Most details of these functions will be consistent, except that there will be additional bookkeeping for keeping track of which functions specified a ratio for unused gas. This will not affect or replace any existing host functions, but this will likely require a slightly higher gas cost than the original `promise_batch_action_function_call` host function due to this additional overhead.

This host function definition would look like this (as a Rust consumer):
```rust
    /// Appends `FunctionCall` action to the batch of actions for the given promise pointed by
    /// `promise_idx`. This function allows not specifying a specific gas value and allowing the
    /// runtime to assign remaining gas based on a ratio.
    ///
    /// # Gas
    ///
    /// Gas can be specified using a static amount, a ratio of remaining prepaid gas, or a mixture
    /// of both. To omit a static gas amount, [`u64::MAX`] can be passed for the `gas` parameter.
    /// To omit assigning remaining gas, [`u64::MAX`] can be passed as the `gas_ratio` parameter.
    ///
    /// The gas ratio parameter works as the following:
    ///
    /// All unused prepaid gas from the current function call is split among all function calls
    /// which supply this gas ratio. The amount attached to each respective call depends on the
    /// value of the ratio.
    ///
    /// For example, if 40 gas is leftover from the current method call and three functions specify
    /// the ratios 1, 5, 2 then 5, 25, 10 gas will be added to each function call respectively,
    /// using up all remaining available gas.
    ///
    /// # Errors
    ///
    /// <...Ommitted previous errors as they do not change>
    /// - If the [`u64::MAX`] special value is passed for `gas` and `gas_ratio` parameters
    ///
    ///
    /// [`u64::MAX`]: std::u64::MAX
    pub fn promise_batch_action_function_call_ratio(
        promise_index: u64,
        method_name_len: u64,
        method_name_ptr: u64,
        arguments_len: u64,
        arguments_ptr: u64,
        amount_ptr: u64,
        gas: u64,
        gas_ratio: u64,
    );

```

The only difference from the existing API is `gas_ratio` added as another parameter, as an unsigned 64-bit integer.

As for calculations, the remaining gas at the end of the transaction can be floor divided by the sum of all the ratios tracked. Then, after getting this value, just attach that value multiplied by the ratio gas to each function call action. 

For example, if there are three ratios, `a`, `b`, `c`:
```
v = remaining_gas.div_floor(a + b + c)
a_gas += a * v
b_gas += b * v
c_gas += c * v
``` 

<!-- TODO add more info on specific changes to nearcore when necessary/scoped -->

# Drawbacks
[drawbacks]: #drawbacks

- Complexity in refactoring to handle assigning remaining gas at the end of a transaction
- Complexity in extra calculations for assigning gas will make the host function slightly more expensive than the base one. It is not easy to create an API on the SDK level that can decide which host function to call if dynamic gas assigning is needed or not. If both are used, the size of the wasm binary is trivially larger by including both host functions
- Adds another host function to the runtime, which can probably never be removed
- Can be confusing to have both static gas and dynamic unused gas and convey what is happening internally to a developer
- If we start utilizing all prepaid gas, this will likely lead to a higher percentage of prepaid gas usage. This could be an unexpected pattern for users and require them to think about how much gas they are attaching to make sure they only attach what they are willing to spend
  - Since currently, we are refunding a lot of unused gas, this could be a hidden negative side effect
  - Keep in mind that it will also be positive because transactions will generally succeed more often due to gas more efficiently

# Rationale and alternatives
[rationale-and-alternatives]: #rationale-and-alternatives

Alternative 1 (fraction parameters):
The primary alternative is using a numerator and denominator to represent a fraction instead of a ratio. This alternative would be equivalent to the one listed above except for two u64 additional parameters instead of just the one for ratio. I'll list the tradeoff as pros and cons:

Pros:
- Can under-utilize the gas for the current transaction to limit gas allowed for certain functions 
- This could take responsibility away from DApp users because they would not have to worry less about attaching too much prepaid gas
- Thinking in terms of fractions may be more intuitive for some developers
- Might future proof better if we ever need this ability in the future, want to minimize the number of host functions created at all costs

Cons:
- More complicated logic/edge cases to handle to make sure the percentages don't sum to greater than 100% (or adjusting if they do)
- Precision loss from dividing integers may lead to unexpected results
  - To get closer to expected, we could use floats for the division, but this gets messy
- API for specifying a fraction would be messy (need to specify two values rather than just optionally one)
- There isn't a good default for this. Unless there is a special value that indicates a pool of function calls that will split the remaining equally, but this defeats the purpose of this alternative completely
- Slightly larger API (only one u64, can probably safely ignore this point)

Alternative 2 (handle within contract/SDK):
The other alternative is to handle all of this logic on the contract side, as seen by [this PR](https://github.com/near/near-sdk-rs/pull/523). This is much less feasible/accurate because there is only so much information available within the runtime, and gas costs and internal functionality may not always be the same. As discussed on [the respective issue](https://github.com/near/near-sdk-rs/issues/526), this alternative seems to be very infeasible.

Pros:
- No protocol change is needed
- Can still have improved API as with protocol change

Cons:
- Additional bloat to every contract, even ones that don't use the pattern (~5kb in PoC, even with simple estimation logic)
- Still inaccurate gas estimations, because at the point of calculation, we cannot know how much gas will be used for assigning gas values as well as gas consumed after the transaction ends
  - This leads to either underutilizing or having transactions fail when using too much gas if trying to estimate how much gas will be left
- Prone to breaking existing contracts on protocol changes that affect gas usage or logic of runtime

# Unresolved questions
[unresolved-questions]: #unresolved-questions

What needs to be addressed before this gets merged: 
- How much refactoring exactly is needed to handle this pattern?
    - Can we keep a queue of receipt and action indices with their respective ratios and update their gas values after the current method is executed? Is there a cleaner way to handle this while keeping order?
- Do we want to attach the gas lost due to precision on division to any function?

What would be addressed in future independently of the solution:
- How many users would expect the ability to refund part of the gas after the initial transaction? (is this worth considering the API difference of using fractions rather than ratios)
- Will ratios be an intuitive experience for developers?

# Future possibilities
[future-possibilities]: #future-possibilities

The future change that would extend from this being implemented is a much cleaner API for the SDKs. As mentioned previously in the alternatives section, the API changes from [the changes tested on the SDK](https://github.com/near/near-sdk-rs/pull/523) will remain, but without the overhead from implementing this on the contract level. Thus, not only can this be implemented in Rust, but it will also allow a consistent API for existing and future SDK languages to build on.

The primary benefit for SDKs is that it removes the need to specify gas when making cross-contract calls explicitly. Currently, there is no easy way of knowing how many function calls will be made to split prepaid gas without a decent amount of overhead. Even if the developer does this, it's impossible to know how much gas will remain after the transaction from inside the contract. Having this host function available will simplify the DevX for contract developers and make the contracts use gas more efficiently.
