- NEP PR: [nearprotocol/neps#0000](https://github.com/nearprotocol/neps/pull/0000)

# Summary
[summary]: #summary

Make error messages structured and include machine-readable error codes.

For example:

```
ans.not_valid_sub_account_id: The new account_id "test.staging123.near" can't be created by "register.near"
```


# Motivation
[motivation]: #motivation

We are doing this to allow client-side code (e.g. nearlib, studio, wallet) to make decisions based on errors returned by nearcode.
Currently it requires hardcoding regexps that depend on error mesages (which often are edited for better readability, etc).

# Explanation
[guide-level-explanation]: #guide-level-explanation

All error messages from nearcore should be structured like:

```
error.message.code: human readable error message`
```

`error.message.code` is a unique identifier of given error type. Generally can be any valid string without `:` character.
Recommended format is to have dot-separated lowercase alphanumeric string. String prefix should define module of the system (e.g. `ans`, `wasm`, etc) and suffix should define error reason (`account_not_foind`, `gas_limit_exceeded`, etc). 

# Drawbacks
[drawbacks]: #drawbacks

Inlining into string might make users parse error codes in unreliable way in some edge cases (e.g. if someones decide to split string using `:`, but error message also contains `:`).

# Rationale and alternatives
[rationale-and-alternatives]: #rationale-and-alternatives

Alternative is to pass error code as a separate field. This was abandoned as it's more complex to implement: all places where errors get converted from one type to another and/or serialized would need special attention.

Dot-separated strings are used as codes as they are both machine and human readable. They also fit well into existing UI localization systems. 

# Unresolved questions
[unresolved-questions]: #unresolved-questions

Specific error codes to use.

# Future possibilities
[future-possibilities]: #future-possibilities

Formalize how additional info can be passed with error (stuff like account id, etc) to allow proper localization.
