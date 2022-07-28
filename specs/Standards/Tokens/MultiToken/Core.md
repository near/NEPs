# Multi Token

:::caution
This is part of the proposed spec [NEP-245](https://github.com/near/NEPs/blob/master/neps/nep-0245.md) and is subject to change.
:::

Version `1.0.0`

## Summary

A standard interface for a multi token standard that supports fungible, semi-fungible,non-fungible, and tokens of any type, allowing for ownership, transfer, and batch transfer of tokens regardless of specific type.

## Motivation


In the three years since [ERC-1155] was ratified by the Ethereum Community, Multi Token based contracts have proven themselves valuable assets. Many blockchain projects emulate this standard for representing multiple token assets classes in a single contract. The ability to reduce transaction overhead for marketplaces, video games, DAOs, and exchanges is appealing to the blockchain ecosystem and simplifies transactions for developers. 

Having a single contract represent NFTs, FTs, and tokens that sit in-between greatly improves efficiency. The standard also introduced the ability to make batch requests with multiple asset classes reducing complexity. This standard allows operations that currently require _many_ transactions to be completed in a single transaction that can transfer not only NFTs and FTs, but any tokens that are a part of same token contract.

With this standard, we have sought to take advantage of the ability of the NEAR blockchain to scale. Its sharded runtime, and [storage staking] model that decouples [gas] fees from storage demand, enables ultra low transaction fees and greater on chain storage ( see [Metadata] extension).   

With the aforementioned, it is noteworthy to mention that like the [NFT] standard the Multi Token standard, implements `mt_transfer_call`,
which allows, a user to attach many tokens to a call to a separate contract. Additionally, this standard includes an optional [Approval Management] extension. The extension allows marketplaces to trade on behalf of a user, providing additional flexibility for dApps.

Prior art:

- [ERC-721]
- [ERC-1155]
- [NEAR Fungible Token Standard][FT], which first pioneered the "transfer and call" technique
- [NEAR Non-Fungible Token Standard][NFT]
## Rationale

Why have another standard, aren't fungible and non-fungible tokens enough?  The current fungible token and non-fungible token standards, do not provide support for representing many FT tokens in a single contract, as well as the flexibility to define different token types with different behavior in a single contract. This is something that makes it difficult to be interoperable with other major blockchain networks, that implement standards that allow for representation of many different FT tokens in a single contract such as Ethereum.

The standard here introduces a few concepts that evolve the original [ERC-1155] standard to have more utility, while maintaining the original flexibility of the standard. So keeping that in mind, we are defining this as a new token type. It combines two main features of FT and NFT. It allows us to represent many token types in a single contract, and it's possible to store the amount for each token.

The decision to not use FT and NFT as explicit token types was taken to allow the community to define their own standards and meanings through metadata. As standards evolve on other networks, this specification allows the standard to be able to represent tokens across networks accurately, without necessarily restricting the behavior to any preset definition. 

The issues with this in general is a problem with defining what metadata means and how is that interpreted. We have chosen to follow the pattern that is currently in use on Ethereum in the [ERC-1155] standard. That pattern relies on people to make extensions or to make signals as to how they want the metadata to be represented for their use case. 

One of the areas that has broad sweeping implications from the [ERC-1155] standard is the lack of direct access to metadata. With Near's sharding we are able to have a [Metadata Extension](Metadata.md) for the standard that exists on chain. So developers and users are not required to use an indexer to understand, how to interact or interpret tokens, via token identifiers that they receive.

Another extension that we made was to provide an explicit ability for developers and users to group or link together series of NFTs/FTs or any combination of tokens. This provides additional flexiblity that the  [ERC-1155] standard only has loose guidelines on. This was chosen to make it easy for consumers to understand the relationship between tokens within the contract. 

To recap, we choose to create this standard, to improve interoperability, developer ease of use, and to extend token representability beyond what was available directly in the FT or NFT standards. We believe this to be another tool in the developer's toolkit. It makes it possible to represent many types of tokens and to enable exchanges of many tokens within a single `transaction`. 

## Reference-level explanation

**NOTES**:
- All amounts, balances and allowance are limited by `U128` (max value `2**128 - 1`).
- Token standard uses JSON for serialization of arguments and results.
- Amounts in arguments and results are serialized as Base-10 strings, e.g. `"100"`. This is done to avoid JSON limitation of max integer value of `2**53`.
- The contract must track the change in storage when adding to and removing from collections. This is not included in this core multi token standard but instead in the [Storage Standard](../../StorageManagement.md). 
- To prevent the deployed contract from being modified or deleted, it should not have any access keys on its account.

### MT Interface

```ts
// The base structure that will be returned for a token. If contract is using
// extensions such as Approval Management, Enumeration, Metadata, or other
// attributes may be included in this structure.
type Token = {
  token_id: string,
  owner_id: string | null
}


/******************/
/* CHANGE METHODS */
/******************/

// Simple transfer. Transfer a given `token_id` from current owner to
// `receiver_id`.
//
// Requirements
// * Caller of the method must attach a deposit of 1 yoctoⓃ for security purposes
// * Caller must have greater than or equal to the `amount` being requested
// * Contract MUST panic if called by someone other than token owner or,
//   if using Approval Management, one of the approved accounts
// * `approval_id` is for use with Approval Management extension, see
//   that document for full explanation.
// * If using Approval Management, contract MUST nullify approved accounts on
//   successful transfer.
//
// Arguments:
// * `receiver_id`: the valid NEAR account receiving the token
// * `token_id`: the token to transfer
// * `amount`: the number of tokens to transfer, wrapped in quotes and treated
//    like a string, although the number will be stored as an unsigned integer
//    with 128 bits.
// * `approval` (optional): is a tuple of [`owner_id`,`approval_id`]. 
//   `owner_id` is the valid Near account that owns the tokens.   
//   `approval_id` is the expected approval ID. A number smaller than
//    2^53, and therefore representable as JSON. See Approval Management
//    standard for full explanation. 
// * `memo` (optional): for use cases that may benefit from indexing or
//    providing information for a transfer


function mt_transfer(
  receiver_id: string,
  token_id: string,
  amount: string,
  approval: [owner_id: string, approval_id: number]|null,
  memo: string|null,
) {}

// Simple batch transfer. Transfer a given `token_ids` from current owner to
// `receiver_id`.
//
// Requirements
// * Caller of the method must attach a deposit of 1 yoctoⓃ for security purposes
// * Caller must have greater than or equal to the `amounts` being requested for the given `token_ids`
// * Contract MUST panic if called by someone other than token owner or,
//   if using Approval Management, one of the approved accounts
// * `approval_id` is for use with Approval Management extension, see
//   that document for full explanation.
// * If using Approval Management, contract MUST nullify approved accounts on
//   successful transfer.
// * Contract MUST panic if called with the length of `token_ids` not equal to `amounts` is not equal
// * Contract MUST panic if `approval_ids` is not `null` and does not equal the length of `token_ids`
//
// Arguments:
// * `receiver_id`: the valid NEAR account receiving the token
// * `token_ids`: the tokens to transfer
// * `amounts`: the number of tokens to transfer, wrapped in quotes and treated
//    like an array of strings, although the numbers will be stored as an array of unsigned integer
//    with 128 bits.
// * `approvals` (optional): is an array of expected `approval` per `token_ids`. 
//    If a `token_id` does not have a corresponding `approval` then the entry in the array 
//    must be marked null.
//   `approval` is a tuple of [`owner_id`,`approval_id`]. 
//   `owner_id` is the valid Near account that owns the tokens.   
//   `approval_id` is the expected approval ID. A number smaller than
//    2^53, and therefore representable as JSON. See Approval Management
//    standard for full explanation. 
// * `memo` (optional): for use cases that may benefit from indexing or
//    providing information for a transfer


function mt_batch_transfer(
  receiver_id: string,
  token_ids: string[],
  amounts: string[],
  approvals: ([owner_id: string, approval_id: number]| null)[]| null,
  memo: string|null,
) {}


// Transfer token and call a method on a receiver contract. A successful
// workflow will end in a success execution outcome to the callback on the MT
// contract at the method `mt_resolve_transfer`.
//
// You can think of this as being similar to attaching native NEAR tokens to a
// function call. It allows you to attach any Multi Token, token in a call to a
// receiver contract.
//
// Requirements:
// * Caller of the method must attach a deposit of 1 yoctoⓃ for security
//   purposes
// * Caller must have greater than or equal to the `amount` being requested
// * Contract MUST panic if called by someone other than token owner or,
//   if using Approval Management, one of the approved accounts
// * The receiving contract must implement `mt_on_transfer` according to the
//   standard. If it does not, MT contract's `mt_resolve_transfer` MUST deal
//   with the resulting failed cross-contract call and roll back the transfer.
// * Contract MUST implement the behavior described in `mt_resolve_transfer`
// * `approval_id` is for use with Approval Management extension, see
//   that document for full explanation.
// * If using Approval Management, contract MUST nullify approved accounts on
//   successful transfer.
//
// Arguments:
// * `receiver_id`: the valid NEAR account receiving the token.
// * `token_id`: the token to send.
// * `amount`: the number of tokens to transfer, wrapped in quotes and treated
//    like a string, although the number will be stored as an unsigned integer
//    with 128 bits.
// * `owner_id`: the valid NEAR account that owns the token
// * `approval` (optional): is a tuple of [`owner_id`,`approval_id`]. 
//   `owner_id` is the valid Near account that owns the tokens.   
//   `approval_id` is the expected approval ID. A number smaller than
//    2^53, and therefore representable as JSON. See Approval Management
// * `memo` (optional): for use cases that may benefit from indexing or
//    providing information for a transfer.
// * `msg`: specifies information needed by the receiving contract in
//    order to properly handle the transfer. Can indicate both a function to
//    call and the parameters to pass to that function.


function mt_transfer_call(
  receiver_id: string,
  token_id: string,
  amount: string,
  approval: [owner_id: string, approval_id: number]|null,
  memo: string|null,
  msg: string,
): Promise {}



// Transfer tokens and call a method on a receiver contract. A successful
// workflow will end in a success execution outcome to the callback on the MT
// contract at the method `mt_resolve_transfer`.
//
// You can think of this as being similar to attaching native NEAR tokens to a
// function call. It allows you to attach any Multi Token, token in a call to a
// receiver contract.
//
// Requirements:
// * Caller of the method must attach a deposit of 1 yoctoⓃ for security
//   purposes
// * Caller must have greater than or equal to the `amount` being requested
// * Contract MUST panic if called by someone other than token owner or,
//   if using Approval Management, one of the approved accounts
// * The receiving contract must implement `mt_on_transfer` according to the
//   standard. If it does not, MT contract's `mt_resolve_transfer` MUST deal
//   with the resulting failed cross-contract call and roll back the transfer.
// * Contract MUST implement the behavior described in `mt_resolve_transfer`
// * `approval_id` is for use with Approval Management extension, see
//   that document for full explanation.
// * If using Approval Management, contract MUST nullify approved accounts on
//   successful transfer.
// * Contract MUST panic if called with the length of `token_ids` not equal to `amounts` is not equal
// * Contract MUST panic if `approval_ids` is not `null` and does not equal the length of `token_ids`
//
// Arguments:
// * `receiver_id`: the valid NEAR account receiving the token.
// * `token_ids`: the tokens to transfer
// * `amounts`: the number of tokens to transfer, wrapped in quotes and treated
//    like an array of string, although the numbers will be stored as an array of
//    unsigned integer with 128 bits.  
// * `approvals` (optional): is an array of expected `approval` per `token_ids`. 
//    If a `token_id` does not have a corresponding `approval` then the entry in the array 
//    must be marked null.
//    `approval` is a tuple of [`owner_id`,`approval_id`]. 
//   `owner_id` is the valid Near account that owns the tokens.   
//   `approval_id` is the expected approval ID. A number smaller than
//    2^53, and therefore representable as JSON. See Approval Management
//    standard for full explanation. 
// * `memo` (optional): for use cases that may benefit from indexing or
//    providing information for a transfer.
// * `msg`: specifies information needed by the receiving contract in
//    order to properly handle the transfer. Can indicate both a function to
//    call and the parameters to pass to that function.


function mt_batch_transfer_call(
  receiver_id: string,
  token_ids: string[],
  amounts: string[],
  approvals: ([owner_id: string, approval_id: number]|null)[] | null,
  memo: string|null,
  msg: string,
): Promise {}

/****************/
/* VIEW METHODS */
/****************/


// Returns the tokens with the given `token_ids` or `null` if no such token.
function mt_token(token_ids: string[]) (Token | null)[]

// Returns the balance of an account for the given `token_id`.  
// The balance though wrapped in quotes and treated like a string, 
// the number will be stored as an unsigned integer with 128 bits.
// Arguments:
// * `account_id`: the NEAR account that owns the token.
// * `token_id`: the token to retrieve the balance from
function mt_balance_of(account_id: string, token_id: string): string

// Returns the balances of an account for the given `token_ids`.   
// The balances though wrapped in quotes and treated like strings, 
// the numbers will be stored as an unsigned integer with 128 bits.
// Arguments:
// * `account_id`: the NEAR account that owns the tokens.
// * `token_ids`: the tokens to retrieve the balance from
function mt_batch_balance_of(account_id: string, token_ids: string[]): string[]

// Returns the token supply with the given `token_id` or `null` if no such token exists.
// The supply though wrapped in quotes and treated like a string, the number will be stored 
// as an unsigned integer with 128 bits.
function mt_supply(token_id: string): string | null 

// Returns the token supplies with the given `token_ids`, a string value is returned or `null` 
// if no such token exists. The supplies though wrapped in quotes and treated like strings, 
// the numbers will be stored as an unsigned integer with 128 bits.
function mt_batch_supply(token_ids: string[]): (string | null)[]
```

The following behavior is required, but contract authors may name this function something other than the conventional `mt_resolve_transfer` used here.

```ts
// Finalize an `mt_transfer_call` or `mt_batch_transfer_call` chain of cross-contract calls. Generically 
// referred to as `mt_transfer_call` as it applies to `mt_batch_transfer_call` as well.
//
// The `mt_transfer_call` process:
//
// 1. Sender calls `mt_transfer_call` on MT contract
// 2. MT contract transfers token from sender to receiver
// 3. MT contract calls `mt_on_transfer` on receiver contract
// 4+. [receiver contract may make other cross-contract calls]
// N. MT contract resolves promise chain with `mt_resolve_transfer`, and may
//    transfer token back to sender
//
// Requirements:
// * Contract MUST forbid calls to this function by any account except self
// * If promise chain failed, contract MUST revert token transfer
// * If promise chain resolves with `true`, contract MUST return token to
//   `sender_id`
//
// Arguments:
// * `sender_id`: the sender of `mt_transfer_call`
// * `receiver_id`: the `receiver_id` argument given to `mt_transfer_call`
// * `token_ids`: the `token_ids` argument given to `mt_transfer_call`
// * `amounts`: the `token_ids` argument given to `mt_transfer_call`
// * `approvals (optional)`: if using Approval Management, contract MUST provide
//   set of original approvals in this argument, and restore the
//   approved accounts in case of revert.
//   `approvals` is an array of expected `approval_list` per `token_ids`. 
//   If a `token_id` does not have a corresponding `approvals_list` then the entry in the 
//   array must be marked null.
//   `approvals_list` is an array of triplets of [`owner_id`,`approval_id`,`amount`]. 
//   `owner_id` is the valid Near account that owns the tokens.   
//   `approval_id` is the expected approval ID. A number smaller than
//    2^53, and therefore representable as JSON. See Approval Management
//    standard for full explanation. 
//   `amount`: the number of tokens to transfer, wrapped in quotes and treated
//    like a string, although the number will be stored as an unsigned integer
//    with 128 bits.
//      
//   
//
// Returns total amount spent by the `receiver_id`, corresponding to the `token_id`.
// The amounts returned, though wrapped in quotes and treated like strings,
// the numbers will be stored as an unsigned integer with 128 bits.
// Example: if sender_id calls `mt_transfer_call({ "amounts": ["100"], token_ids: ["55"], receiver_id: "games" })`,
// but `receiver_id` only uses 80, `mt_on_transfer` will resolve with `["20"]`, and `mt_resolve_transfer`
// will return `["80"]`.


function mt_resolve_transfer(
  sender_id: string,
  receiver_id: string,
  token_ids: string[],
  approvals: (null | [owner_id: string, approval_id: number, amount: string][]) []| null
):string[]  {}
```

### Receiver Interface

Contracts which want to make use of `mt_transfer_call` and `mt_batch_transfer_call` must implement the following:

```ts
// Take some action after receiving a multi token
//
// Requirements:
// * Contract MUST restrict calls to this function to a set of whitelisted  
//   contracts
// * Contract MUST panic if `token_ids` length does not equals `amounts`
//   length
// * Contract MUST panic if `previous_owner_ids` length does not equals `token_ids`
//   length
//
// Arguments:
// * `sender_id`: the sender of `mt_transfer_call`
// * `previous_owner_ids`: the account that owned the tokens prior to it being
//   transferred to this contract, which can differ from `sender_id` if using
//   Approval Management extension
// * `token_ids`: the `token_ids` argument given to `mt_transfer_call`
// * `amounts`: the `token_ids` argument given to `mt_transfer_call`
// * `msg`: information necessary for this contract to know how to process the
//   request. This may include method names and/or arguments.
//
// Returns the number of unused tokens in string form. For instance, if `amounts`
// is `["10"]` but only 9 are needed, it will return `["1"]`. The amounts returned, 
// though wrapped in quotes and treated like strings, the numbers will be stored as 
// an unsigned integer with 128 bits.


function mt_on_transfer(
  sender_id: string,
  previous_owner_ids: string[],
  token_ids: string[],
  amounts: string[],
  msg: string,
): Promise<string[]>;
```

  [ERC-721]: https://eips.ethereum.org/EIPS/eip-721
  [ERC-1155]: https://eips.ethereum.org/EIPS/eip-1155
  [storage staking]: https://docs.near.org/concepts/storage/storage-staking
  [gas]: https://docs.near.org/concepts/basics/transactions/gas
  [Metadata]: Metadata.md
  [NFT]: ../NonFungibleToken/Core.md
  [Approval Management]: ApprovalManagement.md
  [FT]: ../FungibleToken/Core.md

