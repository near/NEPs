# Nonfungible Token

## Summary

[summary]: #summary

A standard interface for non-fungible tokens allowing for ownership and transfer.

## Motivation

[motivation]: #motivation

Non-fungible tokens (NFTs) have been described in many ways: digital goods, collectible items, unique online assets etc. The current core use case for NFTs is speculating on value and trading unique items. The use case of trading NFTs should be natively supported. This is the most basic set of functions needed to create an interoperable NFT that works in an asynchronous environment.

Prior art:

- [ERC-20 standard](https://eips.ethereum.org/EIPS/eip-20)
- [ERC-721 standard](https://eips.ethereum.org/EIPS/eip-721)
- [ERC-1155 standard](https://eips.ethereum.org/EIPS/eip-1155)

## Guide-level explanation

[guide-level-explanation]: #guide-level-explanation

This token should allow the following:

- Get the total supply of created tokens per contract.
- Transfer a token to a new owner.
- Grant access to all tokens to a third party.
  - A third party account ID will be able to transfer the tokens that they have access to
- Transfer tokens from one user to another.
- Get current number of tokens for a given account ID. (Not in template).
- Initialize contract once. The given total supply will be owned by the given account ID. (Not in template).

There are a few concepts in the scenarios above:

- **Total supply**. The total number of tokens in circulation.
- **Token owner**. An account ID that owns one or more tokens.
- **Transfer**. Action that moves some amount from one account to another account.
- **Escrow**. A different account from the balance owner who has permission to one or more tokens.
- **Access**. The specific token ID that another account has access to.

### **Simple transfer**

#### **Assumptions**

- the Corgi nft contract is `corgi`
- Alice's account is `alice`
- Jeraldo's account is `jerry`
- The NFT contract has been initialized with a non-zero token supply
- There exists a token with the ID of `3`

#### **High-level**

Alice needs to issue one transaction to the Corgi NFT contract to transfer one corgi token to Jeraldo.

#### **Technical calls**

1. `alice` calls `corgi::transfer({"new_owner_id":"jerry", "token_id":3})`

### **Token swap through a third party escrow**

Alice wants to transfer one Corgi NFT through a third party escrow to Jeraldo in exchange for one Sausage NFT. NOTE: This standard does not include how escrow handles anything outside of the explicit transfer of tokens. Any call on an escrow account is illustrative, but not standardized. Escrow can be a trusted individual who acts as an intermediary.

#### **Assumptions**

- the Corgi nft contract is `corgi`
- the Sausage nft contract is `sausage`
- Alice's account is `alice`
- Jeraldo's account is `jerry`
- The Escrow contract is `escrow`
- The NFT contract has been initialized with a non-zero token supply
- There exists a Corgi token with the ID of `3` and a Sausage token with the ID of `5`
- The Escrow contract manages how the transfer is facilitated and guarantees requirements are met for transfer

#### **High-level**

Both Alice and Jerry will issue asynchronous transactions to their respective contracts, `corgi` and `sausage` to grant access to the escrow to trade tokens on their behalf. `escrow` will call the `sasuage` token contract asynchrounously to transfer the Sausage token to `escrow`. After, `escrow` will also call the `corgi` contract to asynchornously transfer the Corgi token to `escrow`. Then, `escrow` will conduct a transfer to both parties.

- If both of the `transfer` calls succeed, then Alice will now own one Sausage token and Jerry will own one Corgi token.
- If one or both of the final `transfer` calls fail, then nothing will happen and `escrow` should attempt reissuing the failed transaction.

#### **Technical calls**

1. `alice` makes an async call to `corgi::grant_access({"escrow_account_id":"escrow"})`
2. `jerry`  makes an async call to `sausage::grant_access({"escrow_account_id":"escrow"})`
3. `escrow` calls `sausage::transfer({"new_owner_id:"escrow", "token_id": 5})`
    - Recommondation: attach callback `escrow::on_transfer({"owner_id":"jerry", "token_contract":"sausage", "token_id": 5})`
4. `escrow` calls `corgi::transfer({"new_owner_id:"escrow", "token_id": 3})`
    - Recommendation: attach callback `escrow::on_transfer({"owner_id":"alice", "token_contract":"corgi", "token_id": 3})`
5. In one Promise:
    1. `escrow` calls `corgi::transfer({"new_owner_id:"jerry", "token_id": 3})`
        - attaches callback `escrow::on_transfer({"owner_id":"alice", "token_contract:"corgi", "token_id": 3})`
    2. `escrow` calls `sausage::transfer({"new_owner_id:"escrow", "token_id": 5})`
        - attaches callback `escrow::on_transfer({"owner_id":"jerry", "token_contract":"corgi", "token_id": 3})`


## Reference-level explanation

[reference-level-explanation]: #reference-level-explanation

## Template for smart contract in AssemblyScript

At time of writing, this standard is established with several constraints found in AssemblyScript. The first is that interfaces are not an implemented feature of AssemblyScript, and the second is that classes are not exported in the conversion from AssemblyScript to WASM. This means that the entire contract could be implemented as a class, which might be better for code organization, but it would be deceiving in function.

```TypeScript

/******************/
/* CHANGE METHODS */
/******************/

// Grant access to the given `escrow_account_id` for all tokens that account has.
// Requirements:
// * The caller of the function (`predecessor_id`) should have access to the tokens.
export function grant_access(escrow_account_id: string): void;

// Revoke the access to the given `account_id` for the given `token_id`.
// Requirements:
// * The caller of the function (`predecessor_id`) should have access to the token.
export function revoke_access(escrow_account_id: string): void;

// Transfer the given `token_id`. Account `new_account_id` becomes the new owner.
// Requirements:
// * The caller of the function (`predecessor_id`) should have access to the token.
export function transfer(new_owner_id: string, token_id: u128): void;

/****************/
/* VIEW METHODS */
/****************/

// Returns `true` or `false` based on `escrow_account_id` having access to tokens owned by `owner_id`
export function check_access(escrow_account_id: string, owner_id: string): boolean;

// Get the owner's account ID of the given `token_id`.
export function get_token_owner(token_id: u128): string;

```

## Drawbacks

[drawbacks]: #drawbacks

The major design choice to not use a system of approvals for escrow in favor of performance means that it is up to implementors of markets to decide how they manage escrow themselves. This is a dilemma because it increases freedom, while increasing risk of making a mistake on the market side. Ultimately, it will be up to markets and their users to find the best solution to escrow, and we don't believe that approvals is the way to do it. This allows for that solution to be discovered with trail and error. The standard for the market will change, but not the token itself.
This token standard has been whittled down to the simplest fundamental use cases. It relies on extensions and design decisions to be useable.
There are some things that have been in contention in the design of this standard. Namely, the token_id system relies on unique indices to function. This might cause a problem with use cases that need the `lock` and `unlock` functionality.
In addition, the `grant_access` and `revoke_access` functions act similarly to approvals, but must operate asynchronously and in batch transactions where appropriate.

## Rationale and alternatives

[rationale-and-alternatives]: #rationale-and-alternatives

A multi-token standard was considered, as well a standard that allowed for the transfer of any type of token along with the assets associated with this contract. This was foregone for the sake of decoupling the market contracts from the token contracts. The emphasis of this standard is now on simplicity and flexibility. It allows for any type of token to interface with any type of market that accepts this standard. The explicit goal is to maximize developer freedom with a rigid enough foundation to make a standard useful.

## Unresolved questions

[unresolved-questions]: #unresolved-questions

Primarily edge cases for various applications should be surfaced. For example, the use case of creating an in-game store is different than creating a token for tracking real-world objects digitally. This token attempts to create a standard for both.
Neither a market standard nor an escrow system is addressed here. These should exists in the future, but are purposefully left separate. An item should not care about the place it is sold or agreed on.
The ability to `lock` and `unlock` tokens is a likely requirement for many use cases, but there are many challenges around this. The initial solution to solely rely on callbacks was abandoned in favor of an access system that allows escrow contracts to lock and transfer tokens.
Finally, in the original draft, metadata was included in the model for tokens. It was clear through some basic implementations that this is not ideal since users may want to store metadata elsewhere. This could be entirely offchain, or in a separate contract. This creates an unsolved problem of synchronizing metadata with contracts, and needs more design work. 

## Future possibilities

[future-possibilities]: #future-possibilities

The next step in the development of this standard is extending it further in a new standard that addresses spcifically how a generic and safe escrow would function, and how metadata should be handled based on the specific use cases of tokens implemented. In addition, an importable module should be developed, allowing developers to integrate a token system with little overhead. Alternative uses of this token are of high interest. Known uses for nonfungible tokens include collectible items online, and item systems in games as discussed throughout. There are many uses cases yet to be invented. These might include tokens for supply chain or even tokens for shared custody of physical items. The possibilities are ultimately going to be driven by community use.
