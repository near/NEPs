---
sidebar_position: 4
---

# Architecture

Near node consists roughly of a blockchain layer and a runtime layer.
These layers are designed to be independent from each other: the blockchain layer can in theory support runtime that processes
transactions differently, has a different virtual machine (e.g. RISC-V), has different fees; on the other hand the runtime
is oblivious to where the transactions are coming from. It is not aware whether the
blockchain it runs on is sharded, what consensus it uses, and whether it runs as part of a blockchain at all.

The blockchain layer and the runtime layer share the following components and invariants:

## Transactions and Receipts

Transactions and receipts are a fundamental concept in Near Protocol. Transactions represent actions requested by the
blockchain user, e.g. send assets, create account, execute a method, etc. Receipts, on the other hand is an internal
structure; think of a receipt as a message which is used inside a message-passing system.

Transactions are created outside the Near Protocol node, by the user who sends them via RPC or network communication.
Receipts are created by the runtime from transactions or as the result of processing other receipts.

Blockchain layer cannot create or process transactions and receipts, it can only manipulate them by passing them
around and feeding them to a runtime.

## Account-Based System

Similar to Ethereum, Near Protocol is an account-based system. Which means that each blockchain user is roughly
associated with one or several accounts (there are exceptions though, when users share an account and are separated
through the access keys).

The runtime is essentially a complex set of rules on what to do with accounts based on the information from the
transactions and the receipts. It is therefore deeply aware of the concept of account.

Blockchain layer however is mostly aware of the accounts through the trie (see below) and the validators (see below).
Outside these two it does not operate on the accounts directly.

### Assume every account belongs to its own shard

Every account at NEAR belongs to some shard.
All the information related to this account also belongs to the same shard. The information includes:

- Balance
- Locked balance (for staking)
- Code of the contract
- Key-value storage of the contract
- All Access Keys

Runtime assumes, it's the only information that is available for the contract execution.
While other accounts may belong to the same shards, the Runtime never uses or provides them during contract execution.
We can just assume that every account belongs to its own shard. So there is no reason to intentionally try to collocate accounts.

## Trie

Near Protocol is a stateful blockchain -- there is a state associated with each account and the user actions performed
through transactions mutate that state. The state then is stored as a trie, and both the blockchain layer and the
runtime layer are aware of this technical detail.

The blockchain layer manipulates the trie directly. It partitions the trie between the shards to distribute the load.
It synchronizes the trie between the nodes, and eventually it is responsible for maintaining the consistency of the trie
between the nodes through its consensus mechanism and other game-theoretic methods.

The runtime layer is also aware that the storage that it uses to perform the operations on is a trie. In general it does
not have to know this technical detail and in theory we could have abstracted out the trie as a generic key-value storage.
However, we allow some trie-specific operations that we expose to the smart contract developers so that they utilize
Near Protocol to its maximum efficiency.

## Tokens and gas

Even though tokens is a fundamental concept of the blockchain, it is neatly encapsulated
inside the runtime layer together with the gas, fees, and rewards.

The only way the blockchain layer is aware of the tokens and the gas is through the computation of the exchange rate
and the inflation which is based strictly on the block production mechanics.

## Validators

Both the blockchain layer and the runtime layer are aware of a special group of participants who are
responsible for maintaining the integrity of the Near Protocol. These participants are associated with the
accounts and are rewarded accordingly. The reward part is what the runtime layer is aware of, while everything
around the orchestration of the validators is inside the blockchain layer.

## Blockchain Layer Concepts

Interestingly, the following concepts are for the blockchain layer only and the runtime layer is not aware of them:

- Sharding -- the runtime layer does not know that it is being used in a sharded blockchain, e.g. it does not know
  that the trie it works on is only a part of the overall blockchain state;
- Blocks or chunks -- the runtime does not know that the receipts that it processes constitute a chunk and that the output
  receipts will be used in other chunks. From the runtime perspective it consumes and outputs batches of transactions and receipts;
- Consensus -- the runtime does not know how consistency of the state is maintained;
- Communication -- the runtime does not know anything about the current network topology. Receipt has only a receiver_id (a recipient account), but knows nothing about the destination shard, so it's a responsibility of the blockchain layer to route a particular receipt.

## Runtime Layer Concepts

- Fees and rewards -- fees and rewards are neatly encapsulated in the runtime layer. The blockchain layer, however,
  has an indirect knowledge of them through the computation of the tokens-to-gas exchange rate and the inflation.
