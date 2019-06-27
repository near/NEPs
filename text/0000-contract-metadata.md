- Proposal Name: `contract_metadata`
- Start Date: (fill me in with today's date, YYYY-MM-DD)
- NEP PR: [nearprotocol/neps#0003](https://github.com/nearprotocol/NEPs/pull/3)

# Summary
[summary]: #summary

This NEP introduces contract metadata, which summarizes the content of a given contract in json format.
Contract metadata allows developers to easily list the methods in a contract and potentially display them to users to
provide transparency.

# Motivation
[motivation]: #motivation

Currently there is no direct way for a developer to programmatically list the methods of a contract that is deployed on chain
because the contract code stored on chain is the compiled wasm code, where the methods name and parameters are already mangled.
As a result, if developers want to display the methods of a contract to an user of the app to provide transparency,
especially in the case of financial apps, they have no choice but to hardcode them in the front end, which is suboptimal in many ways.
Furthermore, if developers want to get the list of methods in some contract for some downstream task like data analysis,
they have no way of doing so. Contract metadata aims to solve the aforementioned problems by providing a convenient way 
for developers to list the methods of contracts.

# Guide-level explanation
[guide-level-explanation]: #guide-level-explanation

For developers, there will be two main changes:
- Instead of annotating view and change methods in the `initContract` function in `main.js`,
they will instead annotate the methods of a contract by decorators.
More specifically, every method is by default a change method, unless annotated by `@view_method`.
- Every contract will have a `metadata` method that returns a json that serializes the contract methods. For each method,
the json serialization is of the form `{"name": <method_name>, "parameters": {<param1>: <type1>, .. }, "returnType": <return_type>}`.
The overall serialization is of the form `{"view_methods": {<method_name>: <method_metadata>, .. }, "change_methods": {<method_name>: <method_metadata>, .. }}`. 

As an concrete example, suppose we have a contract that maintains a counter on chain:

```typescript
import { context, storage, near } from "./near";

export function incrementCounter(): void {
  let newCounter = storage.get<i32>("counter") + 1;
  storage.set<i32>("counter", newCounter)
  near.log("Counter is now: " + newCounter.toString());
}

export function decrementCounter(): void {
  let newCounter = storage.get<i32>("counter") - 1;
  storage.set<i32>("counter", newCounter)
  near.log("Counter is now: " + newCounter.toString());
}

@view_method
export function getCounter(): i32 {
  return storage.get<i32>("counter");
}
```

This contract has two change methods, `incrementCounter` and `decrementCounter`, as well as one view method, `getCounter`.
In this case, the metadata we want looks like 
```json
{
  "view_methods": 
  {
      "getCounter": {
        "name": "getCounter",
        "parameters": [],
        "returnType": "i32"
      }
  },
  "change_methods": 
  {
      "incrementCounter": {
        "name": "incrementCounter",
        "parameters": [],
        "returnType": "void"
      },
      "decrementCounter": {
        "name": "decrementCounter",
        "parameters": [],
        "returnType": "void"
      }
  }
}
```
and the generated `metadata` method looks like:
```typescript
export function metadata(): string {
    return "{\"view_methods\": {\"getCounter\": {\"name\": \"getCounter\", \"parameters\": {}, \"returnType\": \"i32\"},\"change_methods\": {\"incrementCounter\": {\"name\": \"incrementCounter\", \"parameters\": {}, \"returnType\": \"void\"}}, {\"decrementCounter\": {\"name\": \"decrementCounter\", \"parameters\": {}, \"returnType\": \"void\"}}}"
}
```

# Reference-level explanation
[reference-level-explanation]: #reference-level-explanation

To implement this NEP, we just need to modify the binding generation to generate a method called `metadata` that returns
json serialization of contract metadata described in the previous section. This involves walking through the exported methods
in `main.ts`, get the metadata of each method, and serialize them in json. Metadata of a given method, including decorators,
are easily extractable from the assemblyscript IR and serialized into json format.

# Drawbacks
[drawbacks]: #drawbacks

The main drawback of this NEP is that it involves generating one more method during the binding generation phase, which
will in turn increase the size of each contract.

# Rationale and alternatives
[rationale-and-alternatives]: #rationale-and-alternatives

It is unclear to me what the alternative is.

# Unresolved questions
[unresolved-questions]: #unresolved-questions

* What other information, besides those mentioned in [guide-level-explanation], should we include in the metadata?
* Most of this NEP is concerned with contract metadata for assemblyscript, for the rust API, it is not yet unclear what
needs to be done given that it is not yet stabilized.

# Future possibilities
[future-possibilities]: #future-possibilities

TBD
