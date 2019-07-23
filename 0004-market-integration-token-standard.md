- Proposal Name: "marketplace_integrated_token_standard"
- Start Date: 2019-06-24
- NEP PR: [nearprotocol/neps#0004](https://github.com/nearprotocol/neps/pull/4)

# Summary
[summary]: #summary

A standard interface for non-fungible tokens allowing for ownership and transfer, specifically targeting third-party marketplace integration.

# Motivation
[motivation]: #motivation

Non-fungible tokens (NFTs) have been described in many ways: digital goods, collectible items, unique online assets etc. The current core use case for NFTs is speculating on value and trading unique items. The use case of trading NFTs should be natively supported for this emerging market.


The idea of a marketplace-integrated NFT is to make it as easy as possible to merge new services with existing tokens that use the standard. Existing NFT standards still require some customization on the part of third party integrators, which becomes a burden with each NFT integrated.  This standard will allow anyone to build a marketplace on top of any number of tokens, not just allowing but promoting trading and extension. These marketplaces can be built into games and apps that use the specific metadata in whatever way they choose.

Prior art:
ERC-20 standard: https://eips.ethereum.org/EIPS/eip-20
ERC-721 standard: https://eips.ethereum.org/EIPS/eip-721
ERC-1155 standard: https://eips.ethereum.org/EIPS/eip-1155

# Guide-level explanation
[guide-level-explanation]: #guide-level-explanation

## Documenting functionality

User stories associated with this standard

- I want to mint tokens with metadata
- I want to transfer tokens to new token users
- I want to allow users to trade tokens
- I want to craft tokens
- I want to see all tokens
- I want to look at all the types of tokens
- I want to have different kinds of tokens in one contract
- I want to see a user's tokens
- I want to see a token's owner
- I want to see how many tokens of a type exist (are minted)
- I want to see the rarity of a token (total supply)

## Example of minting a token

```TypeScript
let tokenTypeId = mintTokenType("Corgi Token", 1000);
near.log(tokenTypeId);
// 0

// This should be done with a constructor, but is done here with attributes illustratively
let corgiToken = {};
corgiToken.name = "Winnifred";
corgiToken.tokenTypeId = tokenTypeId;
corgiToken.data = "{\"url\":\"corgi name\"}";

// At this point, corgi doesn't have an id because it hasn't been minted yet
near.log(corgiToken.id);
// null

// ID generation should be incremental and unique across all tokens
let mintedCorgiToken = mintToken(corgiToken);
near.log(corgiToken.id)
// 0
```

# Reference-level explanation
[reference-level-explanation]: #reference-level-explanation

## Template for smart contract in AssemblyScript

At time of writing, this standard is established with several constraints found in AssemblyScript. The first is that interfaces are not an implemented feature of AssemblyScript, and the second is that classes are not exported in the conversion from AssemblyScript to WASM. This means that the entire contract could be implemented as a class, which might be better for code organization, but it would be deceiving in function.

```TypeScript
  type TokenTypeId = u32;
  type TokenId = u64;

  function unimplemented():void {
    near.log("Function not implemented");
  }

  export function init():void {
    unimplemented();
  }

  export function mintTokenType(name:string, totalSupply:u64):TokenTypeId {
    unimplemented();
  }

  export function mintToken(ownerId:string, token:Token):Token {
    unimplemented();
  }

  export function getToken(tokenId:TokenId):Token {
    unimplemented();
  }

  export function getTokenType(tokenTypeId:TokenTypeId):TokenType {
    unimplemented();
  }

  export function getTokenOwner(tokenId:TokenId):string {
    unimplemented();
  }

  export function getAllTokenTypes():TokenType[] {
    unimplemented();
  }

  export function getTokensByOwner(ownerId:string, startTokenIdx:u64 = 0, limit:u32 = 10):Token[] {
    unimplemented();
  }

  export function getCountByOwner(ownerId: string):u64 {
    unimplemented();
  }

  export function transfer(ownerId:string, recipientId:string, tokenIds:TokenId[], onTransfer:PayloadCallback = null):void {
    unimplemented();
  }

  class PayloadCallback {
    contractId:string;
    methodName:string;
    payload: string;
  }

  class OnTransferArgs {
    ownerId: string;
    recipientId: string;
    tokenIds:TokenId[];
    payload: string;
  }

  //*** Researching the following methods ***//
  function lockToken(tokenId:TokenId):void {
    unimplemented();
  }

  function unlockToken(tokenId:TokenId):void {
    unimplemented();
  }

```

## Models

```TypeScript
export class Token {
  id:u64;
  tokenTypeId:TokenTypeId;
  data:string;
}

export class TokenType {
  id: u32;
  totalSupply: u64;
  data:string;
}
```

### Comments

`unimplemented` is included as a convenience for those who wish to copy this directly into a project.

`getCount` is the equivalent of `balanceOf` if you're familiar with ERC token standards. The idea of a balance is not as transferrable to non-fungible items as it is to currency where it originated.

`init` should initialize at least the first token type and tokens. The contract account id should be the first token holder.

`mintTokenType` In order to create a set of tokens, you must specify a type that they will be minted under. This allows you to set total supply for types of tokens without limiting the future ability to create new types under the same contract.

`mintToken` - It's up to the developer of a token to decide how tokens are generated. Minting should return the Token with a unique ID attached.

`getTokensByOwner` - Allows for the retrieval of tokens from owner in batches based the indices of the tokens.

`transfer` - This is a transfer between two parties, but has the extensibility of a conditional transfer with `onTransfer` allowing for arbitrary contract code to be called on another contract, be it escrow or marketplace. By default, multiple tokens can be transferred as an array of IDs. `onTransfer` should be called before the transfer occurs, as it may contain a predicate that prevents a transfer from happening. `PayloadCallback` might need a better name, since it acts as a callback and as a condition checker in other contracts.

# Drawbacks
[drawbacks]: #drawbacks

The major design choice to not use a system of approvals for escrow in favor of performance means that it is up to implementors of markets to decide how they manage escrow themselves. This is a dilemma because it increases freedom, while increasing risk of making a mistake on the market side. Ultimately, it will be up to markets and their users to find the best solution to escrow, and we don't believe that approvals is the way to do it. This allows for that solution to be discovered with trail and error. The standard for the market will change, but not the token itself.
There are some things that have been in contention in the design of this standard. Namely, the tokenId system relies on uniques indices to function. This might cause a problem with use cases that need the `lock` and `unlock` functionality.

# Rationale and alternatives
[rationale-and-alternatives]: #rationale-and-alternatives

A multi-token standard was considered, as well a standard that allowed for the transfer of any type of token along with the assets associated with this contract. This was foregone for the sake of decoupling the market contracts from the token contracts. The emphasis of this standard is on flexibility, to allow for any type of token to interface with any type of market that accepts this standard. The explicit goal is to maximize developer freedom with a rigid enough foundation to make a standard useful. This serves that purpose of allowing the functionality of transferring with

# Unresolved questions
[unresolved-questions]: #unresolved-questions

Primarily edge cases for various applications should be surfaced. For example, the use case of creating an in-game store is different than creating a token for tracking real-world objects digitally. This token attempts to create a standard for both.
Neither a market standard nor an escrow system is addressed here. These should exists in the future, but are purposefully separate. An item should not care about the place it is sold or agreed on.
The ability to `lock` and `unlock` tokens is a likely requirement for many usecases, but there are many challenges around this. Solutions are currently being explored.

# Future possibilities
[future-possibilities]: #future-possibilities

Implementation of this token will open up a tree of possibilities in the future. The first known next step is to create an importable module for this, allowing developers to integrate token system with little overhead. Alternative uses of this token are of high interest. Known uses for non fungible tokens include collectible items online, and item systems in games as discussed throughout. There are many uses cases yet to be invented. These might include tokens for supply chain or even tokens for shared custody of physical items. The possibilities are ultimately going to be driven by community use.
