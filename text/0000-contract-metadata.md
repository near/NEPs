- Proposal Name: `contract_metadata`
- Start Date: 2019-06-25
- NEP PR: [nearprotocol/neps#0003](https://github.com/nearprotocol/NEPs/pull/3)

# Summary
[summary]: #summary

This NEP introduces contract metadata, which summarizes the content of a given contract in json format.
Contract metadata allows developers to easily list the methods in a contract and potentially display them to users to
provide transparency. 
It also provides the ability to validate input data in frontend thanks to the signatures of contract methods provided
by the contract metadata.
Contract metadata is similar to contract abi in some other blockchains such as Ethereum or Substrate but is more geared
towards readability and developer friendliness.

# Motivation
[motivation]: #motivation

Currently there is no convenient way for a developer to programmatically list the methods of a contract that is deployed on chain
because the contract code stored on chain is the compiled wasm code, where the parameters and type information are already mangled (even though
method name is not, it is still cumbersome to extract them from wasm binary).
As a result, if developers want to display the methods of a contract to an user of the app to provide transparency,
especially in the case of financial apps, they have no choice but to hardcode them in the front end, which is suboptimal in many ways.
Furthermore, if developers want to get the list of methods in some contract for some downstream task like data analysis, or interacting
with other contracts, they have no way of doing so.
In addition, because of the lack of signature of the contract functions, there is no way that the frontend can validate
that input data is of the right format, which might lead to some spamming attacks.
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

The format of contract metadata is similar to [Ethereum json contract abi](https://solidity.readthedocs.io/en/v0.5.3/abi-spec.html#json).
For each function, the metadata is a json object with the fields:
* `name`: the name of the function;
* `parameters`: an array of objects, each of which contains:
  * `name`: the name of the parameter
  * `type`: the type of the parameter (more below)
* `returnType`: The return type of the function. If there is no return value, this field is omitted.
* `stateMutability`: a string that is either `view` or `change`. It specifies whether the function can mutate state.

For types, we try to be as general and language agnostic as possible. Therefore we follow mostly the types that [serde](https://serde.rs/data-model.html)
 uses. The following types are available:
* primitive types:
  * `bool`
  * `i8`, `i16`, `i32`, `i64`, `i128`
  * `u8`, `u16`, `u32`, `u64`, `u128`
  * `string`

* `byteArray`: an array of bytes. In Rust this is `[u8]` whereas in AssemblyScript this is typedarrays.
* `Option<T>`: Either none or some value. In Rust this is `Option<T>` whereas in AssemblyScript this is `T | null` provided
that `T` is nullable.
* `Seq<T>`: A variably sized homogeneous sequence of values, for example `Vec<T>` or `HashSet<T>` in Rust, `Array<T>` in
AssemblyScript.
* tuple: A statically sized heterogeneous sequence of values, for example `(u8, string)`. This doesn't apply to AssemblyScript.
* `Map<K, V>`: A variably sized heterogeneous key-value pairing, for example `BTreeMap<K, V>` in Rust and `Map<K, V>` in AssemblyScript.
* object: `struct` in Rust or `class` in AssemblyScript. The metadata for an object type is a json object with the fields:
    * `name`: Name of the class
    * `fields`: An array of objects each of which contains:
      * `name`: the name of the parameter
      * `type`: the type of the parameter

The object types will not be fully unrolled in their json representation. For example, if we have the following classes
```rust
pub struct Person {
  pub name: String,
  pub address: Address,
}

pub struct Address {
  pub city: String,
  pub street: String,
  pub zip: u16,
}
```

The json representation for `Person` is 
```json
{
  "name": "Person",
  "fields": 
    [
      {"name": "name", "type": "string"},
      {"name": "address", "type":  "Address"}
    ]
}
```

The type `Address` is not unrolled to avoid repetitive information. Instead, the overall contract metadata also contains
metadata for each exported class. 

In addition to function metadata and class metadata, the contract metadata also includes information about the contract
as a whole. To provide this information, a developer can choose to implement a method called `description` in their contract
which returns a json string that contains `name`, the name of the contract, and `description`, annotation of what the 
contract does as a whole.

Contract metadata will also have a version associated with it so that it is clear to the developers when the format changes.
Overall, every contract will have a `metadata` method generated at compile time that returns a json that serializes all the aforementioned information.
The overall format looks like `{"methods": [<method1_info>, ..], "classes": [<class1_info>, ..], "contract": <contract annotation>, "version": <version>}`.

## A Simple Example

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

@view
export function description(): string {
  return '{"name": "Counter", "description": " A contract that maintains a counter with the ability to increase and decrease by the given amount"}';
} 
```

This contract has two change methods, `incrementCounter` and `decrementCounter`, as well as two view methods, `getCounter`
and `description`.
In this case, the metadata we want looks like 
```json
{
  "methods": [
               {
                 "name": "getCounter",
                 "parameters": [{"name": "amount", "type": "i32"}],
                 "returnType": "i32",
                 "stateMutability": "view"
               },
               {
                 "name": "incrementCounterBy",
                 "parameters": [{"name": "amount", "type": "i32"}],
                 "stateMutability": "change"
               },
               {
                 "name": "decrementCounterBy",
                 "parameters": [{"name": "amount", "type": "i32"}],
                 "stateMutability": "change"
               },
               {
                 "name": "description",
                 "parameters": [],
                 "stateMutability": "view"
               }
             ],
  "classes": [],
  "contract": {"name": "Counter", "description": "A contract that maintains a counter with the ability to increase and decrease by the given amount"},
  "version": "1.0"
}

```
and the generated `metadata` method looks like:
```typescript
export function metadata(): string {
    return '{"methods": [{"name": "getCounter", "parameters": [{"name": "amount", "type": "i32"}], "returnType": "i32", "stateMutability": "view"}, {"name": "incrementCounterBy", "parameters": [{"name": "amount", "type": "i32"}], "stateMutability": "change"}, {"name": "decrementCounterBy", "parameters": [{"name": "amount", "type": "i32"}]}], {"name": "description", "parameters": [], "returnType": "string", "stateMutability": "view"}, "classes": [], "contract": {"name": "Counter", "description": "A contract that maintains a counter with the ability to increase and decrease by the given amount"}, "version": "1.0"}'
}
```

## A More Complex Example
Now let's consider a more complex example that involves more features such as class and arrays. 
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

@view
export function description(): string {
  return '{"name": "Todo list", "description": "A todo list on blockchain!"}'
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
                 "stateMutability": "change"
               },
               {
                 "name": "getTodo",
                 "parameters": [{"name": "id", "type": "string"}],
                 "returnType": "Todo",
                 "stateMutability": "view"
               },
               {
                 "name": "getAllTodos",
                 "parameters": [],
                 "returnType": "Array<Todo>",
                 "stateMutability": "view"
               },
               {
                 "name": "description",
                 "parameters": [],
                 "returnType": "string",
                 "stateMutability": "view"
               }
             ],
   "classes": [
                {
                  "name": "Todo",
                  "fields": [{"name": "id", "type": "string"}, {"name":  "title", "type": "string"}, {"name": "completed", "type": "bool"}]
                }
              ],
   "contract": {"name":  "Todo list", "description": "A todo list on blockchain!"},
   "version": "1.0"
}

```

# Reference-level explanation
[reference-level-explanation]: #reference-level-explanation

To implement this NEP, we need to modify the binding generation procedure to generate a method called `metadata` that returns
json serialization of contract metadata described in the previous section. This involves an AST walk to collect the relevant
 information about functions and classes, as well as mapping types to the types used in metadata.

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

# Future possibilities
[future-possibilities]: #future-possibilities

Under the framework proposed in this NEP, it is also not difficult to add annotations to methods in natural language.
Another interesting possibility is that for data validation, the contract can provide some predicate (in javascript for example)
to the frontend to validate input data.
