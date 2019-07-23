- Proposal Name: `wasm_bindings`
- Start Date: 2019-07-22
- NEP PR: [nearprotocol/neps#0000](https://github.com/nearprotocol/neps/pull/0000)

# Summary
[summary]: #summary

Wasm bindings, a.k.a imports, are functions that the host exposes to the Wasm code running on the virtual machine.
These functions are arguably the most difficult thing to change in our entire ecosystem, after we have contracts running on our blockchain,
since once the bindings change the old smart contracts will not be able to run on the new nodes.
Additionally, we need a highly detailed specification of the bindings to be able to write unit tests for our contracts,
since currently we only allow integration tests. Currently, writing unit tests is not possible since we cannot have
a precise mock of the host in the smart contract unit tests, e.g. we don't know how to mock the range iterator (what does it do
when given an empty or inverted range?).

In this proposal we give a detailed specification of the functions that we will be relying on for many months to come.

# Motivation
[motivation]: #motivation

The current imports have the following issues:
* **Trie API.** The behavior of trie API is currently unspecified. Many questions are unclear: what happens when we try
iterating over an empty range, what happens if we try accessing a non-existent key, etc. Having a trie API specification
is important for being able to creating a testing framework for Rust and AssemblyScript smart contracts, since in unit
tests the contracts will be running on a mocked implementation of the host;
* **Promise API.** Recently we have discussed the changes to our promise mechanics. The schema does not need to change,
but the specification now needs to be clarified;
* `data_read` currently has mixed functionality -- it can be used both for reading data from trie and to read data from
the context. In former it expects pointers to be passed as arguments, in later it expects enum to be passed. It achieves
juxtaposition by casting pointer type in enum when needed;
* **Economics API.** The functions that provide access to balance and such might need to be added or removed since we
now consider splitting attached balance into two.

# Specification

## Scratch Buffer
Scratch buffer allows the host function to return the data into a buffer located inside the host oppose to the buffer
located on the client. A special operation can be used to copy the content of the buffer into the host. Memory pointers
can then be used to point either to the memory on the guest or the memory on the host, see below. Benefits:
* We can have functions that return values that are not necessarily used, e.g. inserting key-value into a trie can
also return the preempted old value, which might not be necessarily used. Previously, if we returned something we
would have to pass the blob from host into the guest, even if it is not used;
* We can pass blobs of data between host functions without going through the guest, e.g. we can remove the value
from the storage and insert it into under a different key;
* It makes API cleaner, because we don't need to pass `buffer_len` and `buffer_ptr` as arguments to other functions;
* It allows merging certain functions together, see `storage_iter_next`;
* This is consistent with other APIs that were created for high performance, e.g. allegedly Ewasm have implemented
SNARK-like computations in Wasm by exposing a bignum library through stack-like interface to the guest. The guest
can manipulate then with the stack of 256-bit numbers that is located on the host.

##### Host → host blob passing
The scratch buffer can be used to pass the blobs between host functions. For any function that
takes a pair of arguments `*_len: u64, *_ptr: u64` this pair is pointing to a region of memory either on the guest or
the host:
* If `*_len != u64::MAX` it points to the memory on the guest;
* If `*_len == u64::MAX` it points to the memory under the register `*_ptr` on the host.

For example:
`storage_write(u64::MAX, 0, u64::MAX, 1, 2)` -- insert key-value into storage, where key is read from register 0,
value is read from register 1, and result is saved to register 2.

##### Specification
`read_register(register_id: u64, ptr: u64)` -- writes the entire content from the scratch buffer `register_id` into the
memory of the guest starting with `ptr`.
###### Panics
* If the content extends outside the memory allocated to the guest. In Wasmer, it returns `MemoryAccessViolation` error message;

---
`register_len(register_id: u64) -> u64` -- returns the size of the blob stored in the given register.
###### Normal operation
* If register is used, then returns the size, which can potentially be zero;
* If register is not used, returns `u64::MAX`

## Trie API

Here we provide a specification of trie API. After this NEP is merged, the cases where our current implementation does
not follow the specification are considered to be bugs that need to be fixed.

---
`storage_write(key_len: u64, key_ptr: u64, value_len: u64, value_ptr: u64, register_id: u64)` -- writes key-value into storage.
###### Normal operation
* If key is not in use it inserts the key-value pair;
* If key is in use it inserts the key-value and copies the old value into the `register_id`.

###### Panics
* If `key_len + key_ptr` or `value_len + value_ptr` exceeds the memory container or points to an unused register it panics
with `MemoryAccessViolation`. (When we say that something panics with the given error we mean that we use Wasmer API to
create this error and terminate the execution of VM. For mocks of the host that would only cause a non-name panic.)
* If returning the preempted value into the scratch buffer exceeds the memory container it panics with `MemoryAccessViolation`;

###### Current bugs
*  `External::storage_set` trait can return an error which is then converted to a generic non-descriptive
   `StorageUpdateError`, [here](https://github.com/nearprotocol/nearcore/blob/942bd7bdbba5fb3403e5c2f1ee3c08963947d0c6/runtime/wasm/src/runtime.rs#L210)
   however the actual implementation does not return error at all, [see](https://github.com/nearprotocol/nearcore/blob/4773873b3cd680936bf206cebd56bdc3701ddca9/runtime/runtime/src/ext.rs#L95);
* Does not return into the  scratch buffer.

---
`storage_read(key_len: u64, key_ptr: u64, register_id: u64)` -- reads the value stored under the given key.
###### Normal operation
* If key is used copies the content of the value into the `register_id`, even if the content is zero bytes.
  The respective register is then considered to be used, i.e. `register_len(register_id)` will not return `u64::MAX`.
* If key is not present then `register_id` is emptied, i.e. `register_len(register_id)` returns `u64::MAX` after this
  operation.

This allows to disambiguate two cases: when key-value is not present vs when key-value is present but value is zero bytes.

###### Panics
* If `key_len + key_ptr` exceeds the memory container or points to an unused register it panics with `MemoryAccessViolation`;
* If returning the preempted value into the scratch buffer exceeds the memory container it panics with `MemoryAccessViolation`;

###### Current bugs
* This function currently does not exist.

---
`storage_remove(key_len: u64, key_ptr: u64, register_id: u64)` -- removes the value stored under the given key.
###### Normal operation
Very similar to `storage_read`:
* If key is used, removes the key-value from the trie and copies the content of the value into the `register_id`, even if the content is zero bytes.
  The respective register is then considered to be used, i.e. `register_len(register_id)` will not return `u64::MAX`.
* If key is not present then `register_id` is emptied, i.e. `register_len(register_id)` returns `u64::MAX` after this
  operation.

###### Panics
* If `key_len + key_ptr` exceeds the memory container or points to an unused register it panics with `MemoryAccessViolation`;
* If returning the preempted value into the scratch buffer exceeds the memory container it panics with `MemoryAccessViolation`;


###### Current bugs
* Does not return into the scratch buffer.

---
`storage_has_key(key_len: u64, key_ptr: u64) -> u64` -- checks if there is a key-value pair.
###### Normal operation
* If key is used returns `1`, even if the value is zero bytes;
* Otherwise returns `0`.

###### Panics
* If `key_len + key_ptr` exceeds the memory container it panics with `MemoryAccessViolation`;

---
`storage_iter_prefix(prefix_len: u64, prefix_ptr: u64) -> u64` -- creates an iterator object inside the host.
Returns the identifier that uniquely differentiates the given iterator from other iterators that can be simultaneously
created.
###### Normal operation
* It iterates over the keys that have the provided prefix. The order of iteration is defined by the lexicographic
order of the bytes in the keys. If there are no keys, it creates an empty iterator, see below on empty iterators;
###### Panics
* If `prefix_len + prefix_ptr` exceeds the memory container it panics with `MemoryAccessViolation`;

---
`storage_iter_range(start_len: u64, start_ptr: u64, end_len: u64, end_ptr: u64) -> u64` -- similarly to `storage_iter_prefix`
creates an iterator object inside the host.
###### Normal operation
Unless lexicographically `start < end`, it creates empty an iterator.
Iterates over all key-values such that keys are between `start` and `end`, where `start` is inclusive and `end` is exclusive.

Note, this definition allows to either `start` or `end` keys to not actually exist on the given trie.

###### Panics:
* If `start_len + start_ptr` or `end_len + end_ptr` exceeds the memory container or points to an unused register it panics with `MemoryAccessViolation`;

---
`storage_iter_next(iterator_id: u64, key_register_id: u64, value_register_id: u64) -> u64` -- advances iterator and saves the next key and value in the register.
###### Normal operation
* If iterator is not empty, copies the next key into `key_register_id` and value into `value_register_id` and returns the length of the copied value;
* If iterator is empty returns `u64::MAX`.

This allows us to iterate over the keys that have zero bytes stored in values.

###### Panics
* If `key_register_id == value_register_id` panics with `MemoryAccessViolation`;
* If `iterator_id` does not correspond to an existing iterator panics with  `InvalidIteratorId`
* If between the creation of the iterator and calling `storage_iter_next` the range over each it iterates was modified panics with `IteratorWasInvalidated`.
Specifically, if `storage_write` or `storage_remove` was invoked on the key `key` such that:
  * in case of `storage_iter_prefix`. `key` has the given prefix;
  * in case of `storage_iter_range`. `start<=key<end`.

###### Current bugs
* Not implemented, currently we have `storage_iter_next` and `data_read` + `DATA_TYPE_STORAGE_ITER` that together fulfill
the purpose, but have unspecified behavior.

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
