- Proposal Name: `contract_metadata`
- Start Date: 2019-06-25
- NEP PR: [nearprotocol/neps#0003](https://github.com/nearprotocol/NEPs/pull/3)

# Summary
[summary]: #summary

This NEP introduces contract metadata, which summarizes the content of a given contract in json format.
Contract metadata allows developers to easily list the methods in a contract and potentially display them to users to
provide transparency. 
It also provides the ability to generate bindings in different languages for the contract, thanks to the class information
also contained in the metadata.

# Motivation
[motivation]: #motivation

Currently there is no convenient way for a developer to programmatically list the methods of a contract that is deployed on chain
because the contract code stored on chain is the compiled wasm code, where the parameters and type information are already mangled (even though
method name is not, it is still cumbersome to extract them from wasm binary).
As a result, if developers want to display the methods of a contract to an user of the app to provide transparency,
especially in the case of financial apps, they have no choice but to hardcode them in the front end, which is suboptimal in many ways.
Furthermore, if developers want to get the list of methods in some contract for some downstream task like data analysis, or interacting
with other contracts, they have no way of doing so.
Contract metadata aims to solve the aforementioned problems by providing a convenient way 
for developers to list the methods of contracts.

# Guide-level explanation
[guide-level-explanation]: #guide-level-explanation

With contract metadata, developers, instead of annotating view and change methods in the `initContract` function in `main.js`,
will instead annotate the methods of a contract by decorators. We propose that view functions be annotated with the `@view` decorator
and by default functions can change the state. 
Because functions might take non-primitive types and we want metadata to be easily usable by statically typed langauges, we
also provide, in addition to function annotations, class annotations, which mainly describe the name of fields in a class and their types.
Finally, since developers might want to have some contract-level description that provides an overview of what the contract does,
in metadata we also have contract-level annotation.

More specifically, every contract will have a `metadata` method that returns a json that serializes the aforementioned information.
The overall format looks like `{"methods": [<method1_info>, ..], "classes": [<class1_info>, ..], "contract": <contract annotation>}`.
For each method, the json serialization is of the form `{"name": <name>, "parameters": [{"name": <param_name1>, "type": <param_type1>, ..}, .. ], "returnType": <return_type>}`
where the `returnType` key will only be present for functions that have non-void return types.
For each class, the json serialization is of the form `{"name": <name>, "fields": [{"name": <field_name>", "type": <field_type>"}, ..]}`.

## Simple Example

As an concrete example, suppose we have a contract that maintains a counter on chain:

```typescript
// A contract that maintains a counter with the ability to increase and decrease by the given amount
import { context, storage, near } from "./near";

export function incrementCounterBy(amount: i32 = 1): void {
  let newCounter = storage.get<i32>("counter") + amount;
  storage.set<i32>("counter", newCounter)
  near.log("Counter is now: " + newCounter.toString());
}

export function decrementCounterBy(amount: i32 = 1): void {
  let newCounter = storage.get<i32>("counter") - amount;
  storage.set<i32>("counter", newCounter)
  near.log("Counter is now: " + newCounter.toString());
}

@view
export function getCounter(): i32 {
  return storage.get<i32>("counter");
}
```

This contract has two change methods, `incrementCounter` and `decrementCounter`, as well as one view method, `getCounter`.
In this case, the metadata we want looks like 
```json
{
  "methods": [
               {
                 "name": "getCounter",
                 "parameters": [{"name": "amount", "type": "i32"}],
                 "returnType": "i32",
                 "methodType": "view"
               },
               {
                 "name": "incrementCounterBy",
                 "parameters": [{"name": "amount", "type": "i32"}],
                 "methodType": "change"
               },
               {
                 "name": "decrementCounterBy",
                 "parameters": [{"name": "amount", "type": "i32"}],
                 "methodType": "change"
               }
             ],
  "classes": [],
  "contract": "A contract that maintains a counter with the ability to increase and decrease by the given amount"
}

```
and the generated `metadata` method looks like:
```typescript
export function metadata(): string {
    return '{"methods": [{"name": "getCounter", "parameters": [{"name": "amount", "type": "i32"}], "returnType": "i32", "methodType": "view"}, {"name": "incrementCounterBy", "parameters": [{"name": "amount", "type": "i32"}], "methodType": "change"}, {"name": "decrementCounterBy", "parameters": [{"name": "amount", "type": "i32"}], "returnType": "void"}], "classes": [], "contract": "A contract that maintains a counter with the ability to increase and decrease by the given amount"'
}
```

## Real-world Example
Now let's consider a real-world example that involves more features such as class and arrays. 
Suppose one wants to build a todo list app on blockchain, which is modeled as
```typescript
export class Todo {
  id: string;
  title: string;
  completed: bool;
}
```

and the contract is as follows
```typescript
// a contract that implements a todo list on blockchain
import { context, storage, near, collections } from "./near";

import { Todo } from "./model.near";

// Map from string key ID to a Todo
// collections.map is a persistent collection. Any changes to it will
// be automatically saved in the storage.
// The parameter to the constructor needs to be unique across a single contract.
// It will be used as a prefix to all keys required to store data in the storage.
let todos = collections.map<string, Todo>("todos");

export function setTodo(id: string, todo: Todo): void {
  near.log("setTodo " + id);
  todos.set(id, todo);
}

@view
export function getTodo(id: string): Todo {
  return todos.get(id);
}

@view
export function getAllTodos(): Array<Todo> {
  // Map currently doesn't support getting all keys, so we use storage prefix.
  let allKeys = storage.keys("todos::");
  near.log("allKeys: " + allKeys.join(", "));

  let loaded = new Array<Todo>(allKeys.length);
  for (let i = 0; i < allKeys.length; i++) {
    loaded[i] = Todo.decode(storage.getBytes(allKeys[i]));
  }
  return loaded;
}
```

For this contract, `setTodo` is a change method while `getTodo` and `getAllTodos` are view methods.
In this case, the metadata we want looks like 
```json
{
  "methods": [
               {
                 "name": "setTodo",
                 "parameters": [{"name": "id", "type": "string"}, {"name": "todo", "type": "Todo"}],
                 "returnType": "void",
                 "methodType": "change"
               },
               {
                 "name": "getTodo",
                 "parameters": [{"name": "id", "type": "string"}],
                 "returnType": "Todo",
                 "methodType": "view"
               },
               {
                 "name": "getAllTodos",
                 "parameters": [],
                 "returnType": "Array<Todo>",
                 "methodType": "view"
               }
             ],
   "classes": [
                {
                  "name": "Todo",
                  "fields": [{"name": "id", "type": "string"}, {"name":  "title", "type": "string"}, {"name": "completed", "type": "bool"}]
                }
              ],
   "contract": "a contract that implements a todo list on blockchain"
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

Under the framework proposed in this NEP, it is also not difficult to add annotations to methods in natural language.
We can also add contract-level annotation as part of the contract metadata json.
