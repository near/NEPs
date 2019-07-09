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

## Example of minting a token

```TypeScript

let corgiToken = generateRandomCorgiToken(tokenDetails);
near.log(corgiToken.id)
// null

let mintedCorgiToken = mintToken(corgiToken);
near.log(corgiToken.id)
// "2134aa-adsf34-asd23a-1qwera" or simply "1"
// id generation can be randomized or incremental

near.log(mintedCorgiToken.tokenType.name);
// "CorgiToken"

  const sender = context.sender;
  const recipient = "new.owner";
  const tokenId = ["1"];


```

# Reference-level explanation
[reference-level-explanation]: #reference-level-explanation

## Template for smart contract in AssemblyScript

At time of writing, this standard is established with several constraints found in AssemblyScript. The first is that interfaces are not an implemented feature of AssemblyScript, and the second is that classes are not exported in the conversion from AssemblyScript to WASM. This means that the entire contract could be implemented as a class, which might be better for code organization, but it would be deceiving in function.

```TypeScript
  function unimplemented():void {
    near.log("Function not implemented");
  }

  export function init():void {
    unimplemented();
  }

  export function mintToken(ownerId:string, token:Token):Token {
    unimplemented();
  }

  export function getToken(tokenId:string):Token {
    unimplemented();
  }

  export function getTokenOwner(tokenId:string):string {
    unimplemented();
  }

  export function getTokenTypes():TokenType[] {
    unimplemented();
  }
  
  export function getTokensByOwner(ownerId:string, startTokenId:string = null, limit:u32 = 10):Token[] {
    unimplemented();
  }

  export function getCountByOwner(tokenType: TokenType, ownerId: string) {
    unimplemented();
  }
  
  export function getTokenData(tokenId:string):bytes {
    unimplemented();
  }

  export function transfer(recipientId:string, tokenIds:string[], onTransfer:PayloadCallback = null):void {
    unimplemented();
  }

  class OnTransferArgs {
    ownerId: string;
    recipientId: string;
    tokenIds: string[];
    payload: string;
  }

  class PayloadCallback {
    contractId:string;
    methodName:string;
    payload: string;
  }

  //*** Researching the following methods ***//
  function lockToken(tokenId:string):void {
    unimplemented();
  }
  
  function unlockToken(tokenId:string):void {
    unimplemented();
  }

  // The concept of escrow that the standard knows about is optimizing for multiple NFT exchanges
  export function checkEscrow(escrowId:string, tokenIds:string[]) {
    unimplemented();
  }

  export function approveEscrow(escrowId:string, tokenIds:string[]):void {
    unimplemented();
  }

  export function cancelEscrow(escrowId:string, tokenIds:string[]):void {
    unimplemented();
  }
```

### Comments

`unimplemented` is included as a convenience for those who wish to copy this directly into a project.

`getCount` is the equivalent of `balanceOf` if you're familiar with ERC token standards. The idea of a balance is not as transferrable to non-fungible items as it is to currency where it originated.

`mintToken` - It's up to the developer of a token to decide how tokens are generated. Minting should return the Token with a unique ID attached.

`transfer` - A straightforward transfer between two 

needs collections
  tokens
  tokensByOwner

## Models for AssemblyScript contract

```TypeScript
export class Token {
  id: string;
  tokenType: TokenType;
  data: bytes;
}

export class TokenType {
  id: string;
  name: string;
  totalSupply: u64;
}

```

# Drawbacks
[drawbacks]: #drawbacks

### TODO

# Rationale and alternatives
[rationale-and-alternatives]: #rationale-and-alternatives

- Why is this design the best in the space of possible designs?
- What other designs have been considered and what is the rationale for not choosing them?
- What is the impact of not doing this?

Considering multi-token standard

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