- Proposal Name:  "marketplace_integrated_token_standard"
- Start Date:  2019-06-24
- NEP PR:  [nearprotocol/neps#0004](https: //github.com/nearprotocol/neps/pull/4)

# Summary
[summary]:  #summary

A standard interface for non-fungible tokens allowing for ownership and transfer, specifically targeting third-party marketplace integration.

# Motivation
[motivation]:  #motivation

Non-fungible tokens (NFTs) have been described in many ways:  digital goods, collectible items, unique online assets etc. The current core use case for NFTs is speculating on value and trading unique items. The use case of trading NFTs should be natively supported for this emerging market.

The idea of a marketplace-integrated NFT is to make it as easy as possible to merge new services with existing tokens that use the standard. Existing NFT standards still require some customization on the part of third party integrators, which becomes a burden with each NFT integrated.  This standard will allow anyone to build a marketplace on top of any number of tokens, not just allowing but promoting trading and extension. These marketplaces can be built into games and apps that use the specific metadata in whatever way they choose.

Prior art:
ERC-20 standard:  https: //eips.ethereum.org/EIPS/eip-20
ERC-721 standard:  https: //eips.ethereum.org/EIPS/eip-721
ERC-1155 standard:  https: //eips.ethereum.org/EIPS/eip-1155

# Guide-level explanation
[guide-level-explanation]:  #guide-level-explanation

## Documenting functionality

User stories associated with this standard

- I want to mint tokens with metadata
- I want to transfer tokens to new token users
- I want to allow users to trade tokens
- I want to craft different types of tokens
- I want to see all tokens
- I want to see all the types of tokens
- I want to have different kinds of tokens in one contract
- I want to see a user's tokens
- I want to see a token's owner
- I want to see how many tokens of a type exist (are minted)
- I want to see the rarity of a token (total supply)
- I want to generic tokens that aren't collectible spefic
- I want to transfer tokens in a trustless way
- I want tokens to integrate with third party escrows easily

## Example of minting a token

```TypeScript
let tokenTypeId = mintTokenType("Corgi Token", 1000);
logging.log(tokenTypeId);
// 0

// This should be done with a constructor, but is done here with attributes illustratively
let corgiToken = {};
corgiToken.name = "Winnifred";
corgiToken.tokenTypeId = tokenTypeId;
corgiToken.data = "{\"url\": \"corgi name\"}";

// At this point, corgi doesn't have an id because it hasn't been minted yet
logging.log(corgiToken.id);
// null

// ID generation should be incremental and unique across all tokens
let mintedCorgiToken = mintToken(corgiToken);
logging.log(corgiToken.id)
// 0
```

## Example of transferring a token

```TypeScript
// setup token
[...]

let ownerId = getTokenOwner(corgiToken.id);
logging.log(ownerId);
// alice

contract.transfer(corgiToken.id, 'bob_ross');
let ownerId = getTokenOwner(corgiToken.id);
logging.log(ownerId);
// bob_ross

```

## Example of pseudocode for escrow transfer
```TypeScript
// It's entirely up to the escrow contract to conduct checks for funds and assets.
// This is one simplified flow for how to sell a NFT for fungible tokens through an escrow.

// [Token Contract]
[...]
tokenContract.grantAccess(corgiToken.id, escrowId);
[...]

// [Money Contract]
[...]
moneyContract.sendMoney(escrowId);
// OR
moneyContract.grantAccess(amount, escrowId);
[...]

// [Escrow Contract]
[...]
async escrowContractCall() {
  await Promise.all([
    // Locks the NFT
    tokenContract.lock(corgiTokenId);
    // AND
    // Locks to escrow contract
    moneyContract.lock(amount, accountId);
    // OR
    // Transfers to escrow conract
    moneyContract.transferFrom(accountId, amount)
  ]);
}

escrowContractCall.then(done => {
  tokenContract.transfer(corgiTokenId, newOwner);
  escrow.transferMoney(amount, newOwner);
})
[...]

```

# Reference-level explanation
[reference-level-explanation]:  #reference-level-explanation

## Template for smart contract in AssemblyScript

At time of writing, this standard is established with several constraints found in AssemblyScript. The first is that interfaces are not an implemented feature of AssemblyScript, and the second is that classes are not exported in the conversion from AssemblyScript to WASM. This means that the entire contract could be implemented as a class, which might be better for code organization, but it would be deceiving in function.

```TypeScript
  type TokenTypeId = u32;
  type TokenId = u64;

  // Initialize the token types with respective supplies.
  // Requirements:
  // * It should initilize at least the first token type and supply of tokens for type.
  // * The contract account id should be the first token holder.
  export function init(): void;

  // Create a new type of token within the same contract with given `data` as metadata/display data and `totalSupply`.
  // Requirements:
  // * token types should be stored in collection ordered by index with index serving as TokenTypeId.
  export function mintTokenType(data: string, totalSupply: u64): TokenTypeId;

  // Create a unique token from a previously minted type for given `ownerId`. Note `token` is constructed before minting occurs.
  // Requirements:
  // * TokenType should already be minted.
  // * Tokens should be stored in a collection ordered by index.
  // * It should not mint a token when token supply has been exhausted.
  // * Access should be granted by default to initial token owner.
  export function mintToken(ownerId: string, token: Token): Token;

  // Get an individual token by given `tokenId`.
  // Requirements:
  // * The token should exist.
  export function getToken(tokenId: TokenId): Token;

  // Get an individual token type by given `tokenTypeId`.
  // Requirements:
  // * The token type should exist.
  export function getTokenType(tokenTypeId: TokenTypeId): TokenType;

  // Get all the token types that exist in contract.
  export function getAllTokenTypes(): TokenType[];

  // Get an individual owner by given `tokenId`.
  // Note that owner of token isn't associated within token data.
  // Requirements:
  // * The token should exist.
  // * The owner should exist.
  export function getTokenOwner(tokenId: TokenId): string;

  // Allows for the retrieval of tokens from given `ownerId` starting from given `startTokenIdx`.
  // up to the provided `limit.`
  // Requirements:
  // * Owner should exist.
  // * Starting index should not be larger than total number of tokens.
  export function getTokensByOwner(ownerId: string, startTokenIdx: u64 = 0, limit: u32 = 10): Token[];

  // Get a count of all tokens of an indicated type for an indicated owner
  // Get count of all tokens of all types if type is not indicated
  export function getCountByOwner(ownerId:  string, tokenTypeId: TokenTypeId = -1): u64;

  // Grant the access to the given `accountId` for the given `tokenId`.
  // Requirements:
  // * The caller of the function (`predecessor_id`) should have access to the token.
  // * The token should not be locked.
  function grantAccess(tokenId:  TokenId, accountId:  string):  void;

  // Revoke the access to the given `accountId` for the given `tokenId`.
  // Requirements:
  // * The caller of the function (`predecessor_id`) should have access to the token.
  // * The token should not be locked.
  function revokeAccess(tokenId:  TokenId, accountId:  string):  void;

  // Lock the given `tokenId` to the caller of the function (`predecessor_id`).
  // The `predecessor_id` becomes the owner of the lock.
  // Requirements:
  // * The caller of the function (`predecessor_id`) should have access to the token.
  // * The token should not be locked.
  function lock(tokenId:  TokenId):  void;

  // Unlock the given `tokenId`. Removes lock owner.
  // Requirements:
  // * The caller of the function (`predecessor_id`) should be the owner of the lock.
  // * The token should be locked.
  function unlock(tokenId:  TokenId):  void;

  // Transfer the given `tokenId` to the given `accountId`.  Account `accountId` becomes the new owner.
  // The token unlocks (if it was locked) and all access is revoked except for the new owner.
  // Requirements:
  // * The caller of the function (`predecessor_id`) should have access to the token.
  // * If the token is locked, the locked owner should be `predecessor_id`.
  function transfer(tokenId:  TokenId, accountId:  string):  void;

```

## Models

```TypeScript
export class Token {
  id: TokenId;
  tokenTypeId: TokenTypeId;
  data: string;
}

export class TokenType {
  id:  TokenTypeId;
  totalSupply:  u64;
  data: string;
}
```

### Comments

`getCount` is the equivalent of `balanceOf` if you're familiar with ERC token standards. The idea of a balance is not as transferrable to non-fungible items as it is to currency where it originated.

`mintTokenType` - In order to create a set of tokens, you must specify a type that they will be minted under. This allows you to set total supply for types of tokens without limiting the future ability to create new types under the same contract.

# Drawbacks
[drawbacks]:  #drawbacks

The major design choice to not use a system of approvals for escrow in favor of performance means that it is up to implementors of markets to decide how they manage escrow themselves. This is a dilemma because it increases freedom, while increasing risk of making a mistake on the market side. Ultimately, it will be up to markets and their users to find the best solution to escrow, and we don't believe that approvals is the way to do it. This allows for that solution to be discovered with trail and error. The standard for the market will change, but not the token itself.
There are some things that have been in contention in the design of this standard. Namely, the tokenId system relies on uniques indices to function. This might cause a problem with use cases that need the `lock` and `unlock` functionality.
In addition, the `grantAccess` and `revokeAccess` functions act similarly to approvals, but must operate asynchronously. They

# Rationale and alternatives
[rationale-and-alternatives]:  #rationale-and-alternatives

A multi-token standard was considered, as well a standard that allowed for the transfer of any type of token along with the assets associated with this contract. This was foregone for the sake of decoupling the market contracts from the token contracts. The emphasis of this standard is on flexibility, to allow for any type of token to interface with any type of market that accepts this standard. The explicit goal is to maximize developer freedom with a rigid enough foundation to make a standard useful.

# Unresolved questions
[unresolved-questions]:  #unresolved-questions

Primarily edge cases for various applications should be surfaced. For example, the use case of creating an in-game store is different than creating a token for tracking real-world objects digitally. This token attempts to create a standard for both.
Neither a market standard nor an escrow system is addressed here. These should exists in the future, but are purposefully left separate. An item should not care about the place it is sold or agreed on.
The ability to `lock` and `unlock` tokens is a likely requirement for many use cases, but there are many challenges around this. The initial solution to use callbacks was abandoned in favor of an access system that allows escrow contracts to lock and transfer tokens. 

# Future possibilities
[future-possibilities]:  #future-possibilities

Implementation of this token will open up a tree of possibilities in the future. The first known next step is to create an importable module for this, allowing developers to integrate token system with little overhead. Alternative uses of this token are of high interest. Known uses for non fungible tokens include collectible items online, and item systems in games as discussed throughout. There are many uses cases yet to be invented. These might include tokens for supply chain or even tokens for shared custody of physical items. The possibilities are ultimately going to be driven by community use.
