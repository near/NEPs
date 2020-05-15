# Nonfungible Token

## Summary

[summary]: #summary

A standard interface for non-fungible tokens allowing for ownership and transfer.

## Motivation

[motivation]: #motivation

Non-fungible tokens (NFTs) have been described in many ways: digital goods, collectible items, unique online assets etc. The current core use case for NFTs is speculating on value and trading unique items. The use case of trading NFTs should be natively supported. This is the most basic set of functions needed to create an interoperable NFT that works in an asynchronous environment.

Prior art:
ERC-20 standard: https: //eips.ethereum.org/EIPS/eip-20
ERC-721 standard: https: //eips.ethereum.org/EIPS/eip-721
ERC-1155 standard: https: //eips.ethereum.org/EIPS/eip-1155

## Guide-level explanation

[guide-level-explanation]: #guide-level-explanation

This token should allow the following:

- Initialize contract once. The given total supply will be owned by the given account ID.
- Get the total supply of created tokens per contract.
- Transfer a token to a new owner.
- Grant access to a token to a third party.
  - A third party account ID will be able to transfer the tokens that they have access to
- Get current balance for a given account ID.
- Transfer tokens from one user to another.

There are a few concepts in the scenarios above:

- **Total supply**. The total number of tokens in circulation.
- **Token owner**. An account ID that owns one or more tokens.
- **Transfer**. Action that moves some amount from one account to another account.
- **Escrow**. A different account from the balance owner who has permission to one or more tokens.
- **Access**. The specific token ID that another account has access to.

### Simple transfer

#### **Assumptions**

- the Corgi nft contract is `corgi`
- Alice's account is `alice`
- Jeraldo's account is `jerry`
- The NFT contract has been initialized with a nonzero token supply
- There exists a token with the ID of `3`

#### **High-level**

Alice needs to issue one transaction to the Corgi NFT contract to transfer one corgi token to Jeraldo.

#### **Technical calls**

1. `alice` calls `corgi::transfer({"new_owner_id":"jerry", "token_id":3})`

### Token transfer through a third party escrow

Alice wants to transfer one Corgi NFT through a third party escrow to Jeraldo in exchange for one Sausage NFT.

#### **Assumptions**

- the Corgi nft contract is `corgi`
- the Sausage nft contract is `sausage`
- Alice's account is `alice`
- Jeraldo's account is `jerry`
- The Escrow contract is `escrow`
- The NFT contract has been initialized with a nonzero token supply
- There exists a Corgi token with the ID of `3` and a Sausage token with the ID of `5`
- The Escrow contract manages how the transfer is facilitated and guarantees requirements are met for transfer

#### **High-level**

Both Alice and Jerry will issue asynchronous transactions to their respective contracts, `corgi` and `sausage` to grant access to the token ID they would like to trade. `escrow` will call the `sasuage` token contract asynchrounously to transfer the Sausage token to Alice.  `escrow` will also call the `corgi` contract to asynchornously transfer the Corgi token to Jerry.

- If both of the `transferFrom` calls succeed, then Alice will now own one Sausage token and Jerry will own one Corgi token.
- If one or both of the `transferFrom` calls fail, then nothing will happen and `escrow` should trigger a notification to both Alice and Jerry that their transfers were unsuccessful along with the reason.

#### **Technical calls**

1. `alice` makes an async call to `corgi::grantAccess({"escrow_account_id":"escrow", "token_id":3})`
2. `jerry`  makes an async call to ``sausage::grantAccess({"escrow_account_id":"escrow", "token_id":5})`
3. In one Promise
    1. `escrow` calls `sausage::transferFrom({"owner_id":"jerry", "new_owner_id:"alice", "token_id": 5})`
        1. attaches callback `escrow::onTransfer({"owner_id":"jerry", "token_contract":"sausage", "token_id": 5})`
    2. `escrow` calls `corgi::transferFrom({"owner_id":"alice", "new_owner_id:"jerry", "token_id": 3})`
        1. attaches callback `escrow::onTransfer({"owner_id":"alice", "token_contract:"corgi", "token_id": 3})`


#### Example of pseudocode for escrow transfer

```TypeScript
[...]// [Corgi Contract]
corgiToken.grantAccess(corgiTokenId, escrowID);

[...] // [Sausage Contract]
sausageContract.grantAccess(sausageTokenId, escrowID);

[...] // [Escrow Contract]
async escrowContractCall() {
  await Promise.all([
    corgiToken.transferFrom(tokenId, aliceID, jerryID);
    sausageContract.transferFrom(tokenId, jerryID, aliceID);
  ]);
}

```

## Reference-level explanation

[reference-level-explanation]: #reference-level-explanation

## Template for smart contract in AssemblyScript


At time of writing, this standard is established with several constraints found in AssemblyScript. The first is that interfaces are not an implemented feature of AssemblyScript, and the second is that classes are not exported in the conversion from AssemblyScript to WASM. This means that the entire contract could be implemented as a class, which might be better for code organization, but it would be deceiving in function.

```TypeScript
  type TokenId = u64;

  /******************/
  /* CHANGE METHODS */
  /******************/
  
  // Grant the access to the given `accountId` for the given `tokenId`.
  // Requirements:
  // * The caller of the function (`predecessor_id`) should have access to the token.
  export function grantAccess(tokenId: TokenId, accountId: string): void;

  // Revoke the access to the given `accountId` for the given `tokenId`.
  // Requirements:
  // * The caller of the function (`predecessor_id`) should have access to the token.
  export function revokeAccess(tokenId: TokenId, accountId: string): void;

  // Transfer the given `tokenId` from the given `accountId`.  Account `newAccountId` becomes the new owner.
  // Requirements:
  // * The caller of the function (`predecessor_id`) should have access to the token.
  export function transferFrom(tokenId: TokenId, accountId: string, newAccountID: string): void;


  // Transfer the given `tokenId` to the given `accountId`.  Account `accountId` becomes the new owner.
  // The token unlocks (if it was locked) and all access is revoked except for the new owner.
  // Requirements:
  // * The caller of the function (`predecessor_id`) should have access to the token.
  export function transfer(tokenId: TokenId, accountId: string): void;

  /****************/
  /* VIEW METHODS */
  /****************/

// Returns `true` or `false` based on caller of the function (`predecessor_id) having access to the token
  export function checkAccess(tokenId: TokenID): boolean;

  // Get an individual owner by given `tokenId`.
  export function getTokenOwner(tokenId: TokenId): string;

  // Allows for the retrieval of tokens from given `ownerId` starting from given `startTokenIdx`.
  // up to the provided `limit.`
  // Requirements:
  // * Starting index should not be larger than total number of tokens.
  export function getTokensByOwner(ownerId: string, startTokenIdx: u64 = 0, limit: u32 = 10): Token[];

```

## Drawbacks

[drawbacks]: #drawbacks

The major design choice to not use a system of approvals for escrow in favor of performance means that it is up to implementors of markets to decide how they manage escrow themselves. This is a dilemma because it increases freedom, while increasing risk of making a mistake on the market side. Ultimately, it will be up to markets and their users to find the best solution to escrow, and we don't believe that approvals is the way to do it. This allows for that solution to be discovered with trail and error. The standard for the market will change, but not the token itself.
This token standard has been whittled down to the simplest fundamental use cases. It relies on extensions and design decisions to be useable.
There are some things that have been in contention in the design of this standard. Namely, the tokenId system relies on unique indices to function. This might cause a problem with use cases that need the `lock` and `unlock` functionality.
In addition, the `grantAccess` and `revokeAccess` functions act similarly to approvals, but must operate asynchronously and in batch transactions where appropriate.

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
