# Trie

We use Merkle-Patricia Trie to store blockchain state.
Trie is persistent, which means that insertion of new node actually leads to creation of new path to this node, and thus root of Trie will also be presented by new object.

Here we describe some internal entities and pieces of knowledge closely related to Runtime.

## Trie

Base structure.

## TrieStorage

Note that neither `Trie::insert` nor `Trie::update` does not modify `Trie` themselves. 
The former one puts new nodes to temporary memory object, and the latter one prepares `TrieChanges` object.
This object is then passed to `ShardTries::apply_insertions` during updating `ChainStore`, and here `Trie` is actually updated by putting new values to `ColState` part of key-value database.

## ShardTries

Contains stores and caches and allows to get `Trie` object for any shard.

## TrieChanges

Stores result of updating `Trie`. 

- `old_root`: root before updating `Trie`, i.e. inserting new nodes and deleting old ones,
- `new_root`: root after updating `Trie`,
- `insertions`, `deletions`: vectors of `TrieRefcountChange`, containing all inserted and deleted nodes.

## TrieRefcountChange

Because we remove unused nodes using garbage collector, we need to track reference count (`rc`) for each node. 
This structure is used to update `rc` in the database:

- `key_hash` - node of `TrieKey`,
- `value` - value which correspond to trie key, e.g. contract code,
- `rc`

## TrieKey

Describes all keys which may be inserted to `Trie`.
