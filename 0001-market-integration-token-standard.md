- Proposal Name: "marketplace_integrated_token_standard"
- Start Date: 2019-06-24
- NEP PR: [nearprotocol/neps#0000](https://github.com/nearprotocol/neps/pull/0000)

# Summary
[summary]: #summary

A standard interface for non-fungible tokens allowing for ownership and transfer, specifically targeting third-party marketplace integration.

# Motivation
[motivation]: #motivation

Non-fungible tokens (NFTs) have been described in many ways: digital goods, collectible items, unique online assets etc. The current core use case for NFTs is speculating on value and trading unique items. The use case of trading NFTs should natively supported for this emerging market. 

The idea of a marketplace-integrated NFT is to make it as easy as possible to merge new services with existing tokens that use the standard. Existing NFT standards still require some customization on the part of third party integrators, which becomes a burden with each NFT integrated.  This standard will allow anyone to build a marketplace on top of any number of tokens, not just allowing but promoting trading and extension. These marketplaces can be built into games and apps that use the specific metadata in whatever way they choose.

Prior art:
ERC-20 standard: https://eips.ethereum.org/EIPS/eip-20
ERC-721 standard: https://eips.ethereum.org/EIPS/eip-721
ERC-1155 standard: https://eips.ethereum.org/EIPS/eip-1155


# Guide-level explanation
[guide-level-explanation]: #guide-level-explanation

Example of minting a token

```TypeScript
[...]
let corgiToken = generateRandomCorgiToken(tokenDetails);
// corgiToken.id === null 
let mintedCorgiToken = mintToken(corgiToken);
near.log(mintedCorgiToken.tokenType.name);
// "CorgiToken"

getTokenValue(corgiToken.id)
// In most cases, value should be determined by market, however there are cases where it is important that value be set by the developer.

```
  
For user-facing NEPs this section should focus on user stories.

# Reference-level explanation
[reference-level-explanation]: #reference-level-explanation

The NEAR marketplace-integrated token standard

Template for smart contract.
Note that as of this writing, interfaces are unimplemented in AssemblyScript

```TypeScript
class MarketStandardToken {
  getTokenTypes():TokenType[]
  getToken(tokenId:string):Token
  getTokensByOwner(ownerId:string):Token[]
  getCount(owner:string, tokenType: TokenType) // This is equivalent of balanceOf
  getTokenValue(tokenId:string)
  getTokenData(tokenId:string)

  // It's up to the developer of a token to decide how tokens are generated.
  // Minting should return the Token with a unique ID attached.
  mintToken(token:Token):Token

  transfer()

  // Researching these
  lockToken(token)

  // Permissioned setting of value
  private setValue(tokenId:string, value:u64)

}
```

Models

```TypeScript

class Token {
  id: string;
  tokenType: TokenType;
  supply: u64;
  data: bytes;
}

class TokenType {
  id: string;
  name: string;
}

```

# Drawbacks
[drawbacks]: #drawbacks

Why should we *not* do this?

### TODO

# Rationale and alternatives
[rationale-and-alternatives]: #rationale-and-alternatives

- Why is this design the best in the space of possible designs?
- What other designs have been considered and what is the rationale for not choosing them?
- What is the impact of not doing this?

### TODO

# Unresolved questions
[unresolved-questions]: #unresolved-questions

- What parts of the design do you expect to resolve through the NEP process before this gets merged?
- What parts of the design do you expect to resolve through the implementation of this feature before stabilization?
- What related issues do you consider out of scope for this NEP that could be addressed in the future independently of the solution that comes out of this NEP?

### TODO

# Future possibilities
[future-possibilities]: #future-possibilities

### TODO