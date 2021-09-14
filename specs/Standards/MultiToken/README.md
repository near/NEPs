- Proposal Name: Multi-Token-Standard
- Start Date: 2021/07/24
- Issue(s): #245.

Version `1.0.0`

# Summary
[summary]: #summary

A standard interface for a multi token standard that supports fungible, semi-fungible, and tokens of any type, allowing for ownership, transfer, and batch transfer of tokens generally regardless of specific type.

# Motivation
[motivation]: #motivation
Having a single contract represent both NFTs and FTs can greatly improve efficiency as demonstrated by Enjin Coin. The ability to make batch requests with multiple asset classes can allow operations that currently require _many_ transactions to be completed in a single transaction that can transfer both NFTs and FTs that are a part of same token contract.

Having this will also increase NEAR's ability to work interoperably with other chains. This will reduce the complexity required to represent these emerging asset classes.


Prior art:
- EIP-1155 : https://github.com/ethereum/EIPs/issues/1155

- This NEP derives some examples and format from: https://github.com/near/NEPs/pull/21


- NFT Discussions:
https://github.com/near/NEPs/discussions/171
https://gov.near.org/t/nft-standard-discussion/853

Discussions out of band:
 - https://gov.near.org/t/multi-token-standard-discussion/2917
 - https://github.com/shipsgold/multi-token-standard-impl/tree/main/meetings 

# Guide-level explanation
[guide-level-explanation]: #guide-level-explanation

We should be able to do the following:
- Get balance of a single token_id per account per single transaction 
- Get balance of multiple token_ids per account per single transaction
- Get supply of tokens per id
- Get supply of tokens in batch per id
- Represent non fungibility of tokens
- Represent fungibility of tokens
- Transfer tokens by id in batch
- Use these tokens on an exchange
- Refund storage costs for fungible tokens

There are a few concepts in the scenarios above:
- **Total supply**. It's the total number of tokens in circulation.
- **Balance owner**. An account ID that owns some amount of tokens.
- **Transfer**. Moves some amount from one account to another account.
- **Fungibility**. An indistinguishable amount of tokens to exchange 
- **Non Fungibility**. Tokens that are differentiable from each other.

### Real scenarios
 
#### Simple transfer

Alice wants to send 5 `gold` tokens to Bob.

Let's assume the following:
- The `gold` token is defined in the `games.near` contract with `token_id` of `g133`.
- Alice's account is `alice.near`.
- Bob's account is `bob.near`.
- The precision for `gold` on the `games.near` contract is `10^8`. 
- The `amount` to represent 5 `gold` tokens is `5 * 10^8`, or as a number is `500000000`. 

High-level explanation:

Alice needs to issue one transaction to the `games.near` contract to transfer 5 `gold` tokens (multiplied by the precision defined in `gold` token metadata) to Bob.
 
Technical calls:

1. `alice.near` calls `games.near::mt_transfer({"receiver_id": "bob.near", "amount": "500000000", "token_id": "g133", "memo": "for my dinner"})`.

#### Simple batch transfer

Alice wants to send 1 unique (non-fungible) `gemstone`, 5 `gold` (fungible) and 10 `silver` (fungible) tokens to Bob.

Let's assume the following:
- The unique (non-fungible) `gem` token is defined in the `games.near` contract with `token_id`
`uu2`
- The `gold` token is defined in the `games.near` contract with `token_id` `g133`.
- The `silver` token is defined in the `games.near` contract with `token_id` `s133`.
- Alice's account is `alice.near`.
- Bob's account is `bob.near`.
- The precision for `gold` on the `games.near` contract is `10^8`. 
- The precision for `silver` on the `games.near` contract is also `10^8`. 
- The `amount` to represent 5 `gold` tokens is `5 * 10^8` or as a number is `500000000`. 
- The `amount` to represent 10 `silver` tokens is `10 * 10^8` or as a number is `1000000000`. 
- The `amount` to represent 1 `gem` token is `1` or as a number is `1`

High-level explanation:

Alice needs to issue one transaction to `games.near` contract to transfer 5 `gold` tokens and 10 `silver` tokens (multiplied by precision) and 1 `gem` to Bob.
 
Technical calls:

1. `alice.near` calls `games.near::mt_transfer_batch({"receiver_id": "bob.near", "amounts": ["500000000", "1000000000", "1"], "token_ids": ["g133", "s133", "uu2"], "memo": "well done"})`.



#### Token deposit to a contract 

Alice wants to deposit `gold` tokens to a compound interest contract to earn some rewards.

Let's assume the following:
- The `gold` token is represented  by the `games.near` contract with `token_id` `g133` .
- Alice's account is `alice.near`.
- The compound interest contract is `compound.near`.
- The precision on `gold` token is `10^18`. 
- The `amount` to represent 1000 tokens is `1000 * 10^18` or as a number is `1000000000000000000000`. 
- The `compound.near` contract can work with many different token contracts and types.

High-level explanation:

Alice needs to issue a single transaction to `games.near` that will internally issue a cross contract call to `compound.near`. 

The initial transaction to `games.near` is made with `compound.near` as the receiver of a set token_ids and amounts from `alice.near`.

This call then waits on a response from `compound.near`. If `compound.near` responds with failure, the tx is aborted. 

Otherwise `games.near` contract accepts the results and resolves the promise completing the transaction.

- If transfer succeeded, `compound.near` can increase local ownership for `alice.near` to 1000 for `gold` , whose `token_id` is `g133`

- If transfer fails, `compound.near` doesn't need to do anything in current example, but maybe can notify `alice.near` of unsuccessful transfer.

Technical calls:
1. `alice.near` calls `games.near::mt_transfer_call({"receiver_id": "compound.near", amount: "1000000000000000000000", "token_id": "g133", msg: "interest-building"})`.
   During the `mt_transfer_call` call, `compound.near` does the following:
     fn mt_on_transfer(
        &mut self,
        sender_id: AccountId,
        token_ids: Vec<TokenId>,
        amounts: Vec<U128>,
        msg: String,
    ) -> PromiseOrValue<Vec<U128>>;
}
    1. calls `compound::mt_on_transfer({"sender_id": "alice.near", "token_ids":["g133"], "amounts": ["1000000000000000000000"], msg: "interest-building"})`.
    2. `compound.near` resolves the request/fails and `games.near` contract handles the result of the promise, with `games.near::mt_resolve_transfer()` returning refunded amount if there is any or handling follow up from the result of compound cross contract call

#### Batch Token deposit to a contract 

Alice wants to deposit `silver` (fungible) and `gold` (fungible)  tokens and the unique `gem` (non-fungible) to a compound interest contract to earn some rewards. 

Let's assume the following:
- The `gold` token is represented  by the `games.near` contract with `token_id` of `g133` .
- The `silver` token is represented  by the `games.near` contract with `token_id` of `s133` .
- The `gem` unique only one nft token is represented  by the `games.near` contract with `token_id` of `uu2` .
- Alice's account is `alice.near`.
- The compound interest contract is `compound.near`.
- The precision on `gold` token is `10^18`. 
- The precision on `silver` token is `10^18`. 
- The `amount` used to represent 1000 tokens is `1000 * 10^18` or as a number is `1000000000000000000000`. 
- The `compound.near` contract can work with many different token contracts and types.

High-level explanation:

Alice needs to issue a single transaction to `games.near` that will internally issue a cross contract call to `compound.near`. 

The initial transaction to `games.near` is made with `compound.near` as the receiver of a set token_ids and amounts from `alice`.

This call then waits on a response from `compound.near`. If `compound.near` responds with failure, the tx is aborted. 

Otherwise `games.near` contract accepts the results and resolves the promise completing the transaction.

- If transfer succeeded, `compound.near` can increase local ownership for `alice.near` to 1000 for `gold` with token_id `g133`

- If transfer fails, `compound.near` doesn't need to do anything in current example, but maybe can notify `alice.near` of unsuccessful transfer.

Technical calls:
1. `alice.near` calls `games.near::mt_transfer_batch_call({"receiver_id": "compound.near", amounts: ["1000000000000000000000","1000000000000000000000", "1"], "token_ids": ["g133","s133","uu2"], msg: "interest-building"})`.
   During the `mt_transfer_call` call, `compound.near` does the following:
     fn mt_on_transfer(
        &mut self,
        sender_id: AccountId,
        token_ids: Vec<TokenId>,
        amounts: Vec<U128>,
        msg: String,
    ) -> PromiseOrValue<Vec<U128>>;
}
    1. calls `compound.near::mt_on_transfer({"sender_id": "alice.near", amounts: ["1000000000000000000000","1000000000000000000000", "1"], "token_ids": ["g133","s133","uu2"], msg: "interest-building"})`
    2. `compound.near` resolves the request/fails and `games.near` contract handles response from the promise with `games.near::mt_resolve_transfer` returning refunded amount if there is any or handling follow up from the result of compound cross contract call

# Reference-level explanation
[reference-level-explanation]: #reference-level-explanation
WIP implementation: https://github.com/shipsgold/multi-token-standard-impl/tree/feat/initial-token
### Core Trait
```
pub trait MultiTokenCore {
    /// Basic token transfer. Transfer a token or tokens given a token_id. The token id can correspond to  
    /// either a NonFungibleToken or FungibleToken  - this is differentiated by the implementation.
    ///
    /// Requirements:
    /// * Caller of the method must attach a deposit of 1 yoctoⓃ for security purposes
    /// * Contract MUST panic if called by someone other than token owner or,
    /// * If using Approval Management, contract MUST nullify approved accounts on
    ///   successful transfer.
    /// * TODO: needed? Both accounts must be registered with the contract for transfer to
    ///   succeed. See see https://nomicon.io/Standards/StorageManagement.html
    ///
    /// Arguments:
    /// * `receiver_id`: the valid NEAR account receiving the token
    /// * `token_id`: the token or tokens to transfer
    /// * `amount`: the token amount of tokens to transfer for token_id
    /// * `memo` (optional): for use cases that may benefit from indexing or
    ///    providing information for a transfer
    fn mt_transfer(
        &mut self,
        receiver_id: AccountId,
        token_id: TokenId,
        amount: U128,
        memo: Option<String>,
    );

    /// Transfer token/s and call a method on a receiver contract. A successful
    /// workflow will end in a success execution outcome to the callback on the MultiToken
    /// contract at the method `mt_resolve_transfer`.
    ///
    /// You can think of this as being similar to attaching NEAR tokens as a `deposit` to a
    /// function call. It allows you to attach any FungibleToken or NonFungibleToken in a call to a
    /// receiver contract.
    ///
    /// Requirements:
    /// * Caller of the method must attach a deposit of 1 yoctoⓃ for security
    ///   purposes
    /// * Contract MUST panic if called by someone other than token owner or,
    ///   if using Approval Management, one of the approved accounts
    /// * The receiving contract must implement `mt_on_transfer` according to the
    ///   standard. If it does not, MultiToken contract's `mt_resolve_transfer` MUST deal
    ///   with the resulting failed cross-contract call and roll back the transfer.
    /// * Contract MUST implement the behavior described in `mt_resolve_transfer`
    ///
    /// Arguments:
    /// * `receiver_id`: the valid NEAR account receiving the token.
    /// * `token_id`: the token to send.
    /// * `amount`: amount of tokens to transfer for token_id
    /// * `memo` (optional): for use cases that may benefit from indexing or
    ///    providing information for a transfer.
    /// * `msg`: specifies information needed by the receiving contract in
    ///    order to properly handle the transfer. Can indicate both a function to
    ///    call and the parameters to pass to that function.
    fn mt_transfer_call(
        &mut self,
        receiver_id: AccountId,
        token_id: TokenId,
        amount: U128,
        memo: Option<String>,
        msg: String,
    ) -> PromiseOrValue<U128>;

    /// Batch token transfer. Transfer a tokens given token_ids and amounts. The token ids can correspond to  
    /// either Non-Fungible Tokens or Fungible Tokens or some combination of the two. The token ids
    /// are used to segment the types on a per contract implementation basis.
    ///
    /// Requirements
    /// * Caller of the method must attach a deposit of 1 yoctoⓃ for security purposes
    /// * Contract MUST panic if called by someone other than token owner or,
    ///   if using Approval Management, one of the approved accounts
    /// * `approval_id` is for use with Approval Management,
    ///   see https://nomicon.io/Standards/NonFungibleToken/ApprovalManagement.html
    /// * If using Approval Management, contract MUST nullify approved accounts on
    ///   successful transfer.
    /// * TODO: needed? Both accounts must be registered with the contract for transfer to
    ///   succeed. See see https://nomicon.io/Standards/StorageManagement.html
    /// * The token_ids vec and amounts vec must be of equal length and equate to a 1-1 mapping
    ///   between amount and id. In the event that they do not line up the call should fail
    ///
    /// Arguments:
    /// * `receiver_id`: the valid NEAR account receiving the token
    /// * `token_ids`: the tokens to transfer
    /// * `amounts`: the amount of tokens to transfer for corresponding token_id
    /// * `approval_ids`: expected approval ID. A number smaller than
    ///    2^53, and therefore representable as JSON. See Approval Management
    ///    standard for full explanation. Must have same length as token_ids
    /// * `memo` (optional): for use cases that may benefit from indexing or
    ///    providing information for a transfer

    fn mt_batch_transfer(
        &mut self,
        receiver_id: AccountId,
        token_ids: Vec<TokenId>,
        amounts: Vec<U128>,
        memo: Option<String>,
    );
    /// Batch transfer token/s and call a method on a receiver contract. A successful
    /// workflow will end in a success execution outcome to the callback on the MultiToken
    /// contract at the method `mt_resolve_batch_transfer`.
    ///
    /// You can think of this as being similar to attaching NEAR tokens as a `deposit` to a
    /// function call. It allows you to attach any Fungible or Non Fungible Token in a call to a
    /// receiver contract.
    ///
    /// Requirements:
    /// * Caller of the method must attach a deposit of 1 yoctoⓃ for security
    ///   purposes
    /// * Contract MUST panic if called by someone other than token owner or,
    ///   if using Approval Management, one of the approved accounts
    /// * The receiving contract must implement `mt_on_transfer` according to the
    ///   standard. If it does not, MultiToken contract's `mt_resolve_batch_transfer` MUST deal
    ///   with the resulting failed cross-contract call and roll back the transfer.
    /// * Contract MUST implement the behavior described in `mt_resolve_batch_transfer`
    /// * `approval_id` is for use with Approval Management extension, see
    ///   that document for full explanation.
    /// * If using Approval Management, contract MUST nullify approved accounts on
    ///   successful transfer.
    ///
    /// Arguments:
    /// * `receiver_id`: the valid NEAR account receiving the token.
    /// * `token_ids`: the tokens to transfer
    /// * `amounts`: the amount of tokens to transfer for corresponding token_id
    /// * `approval_ids`: expected approval IDs. A number smaller than
    ///    2^53, and therefore representable as JSON. See Approval Management
    ///    standard for full explanation. Must have same length as token_ids
    /// * `memo` (optional): for use cases that may benefit from indexing or
    ///    providing information for a transfer.
    /// * `msg`: specifies information needed by the receiving contract in
    ///    order to properly handle the transfer. Can indicate both a function to
    ///    call and the parameters to pass to that function.

    fn mt_batch_transfer_call(
        &mut self,
        receiver_id: AccountId,
        token_ids: Vec<TokenId>,
        amounts: Vec<U128>,
        memo: Option<String>,
        msg: String,
    ) -> PromiseOrValue<Vec<U128>>;

    /// Get the balance of an an account given token_id. For fungible token returns back amount, for
    /// non fungible token it returns back constant 1.
    fn mt_balance_of(&self, owner_id: AccountId, token_id: TokenId) -> U128;

    /// Get the balances of an an account given token_ids. For fungible token returns back amount, for
    /// non fungible token it returns back constant 1. returns vector of balances corresponding to token_ids
    /// in a 1-1 mapping
    fn mt_balance_of_batch(&self, owner_id: AccountId, token_ids: Vec<TokenId>) -> Vec<U128>;

    /// Returns the total supply of the token in a decimal string representation given token_id.
    fn mt_total_supply(&self, token_id: TokenId) -> U128;

    // Returns the total supplies of the tokens given by token_ids in a decimal string representation.
    fn mt_total_supply_batch(&self, token_ids: Vec<TokenId>) -> Vec<U128>;
}
```
### Receiver Trait
#### Notes
- TokenId is of type String
```
pub trait MultiTokenReceiver {
    /// Take some action after receiving a MultiToken-tokens token
    ///
    /// Requirements:
    /// * Contract MUST restrict calls to this function to a set of whitelisted MultiToken
    ///   contracts
    ///
    /// Arguments:
    /// * `sender_id`: the sender of `mt_transfer_call`
    /// * `previous_owner_id`: the account that owned the tokens prior to it being
    ///   transferred to this contract, which can differ from `sender_id` if using
    ///   Approval Management extension
    /// * `token_ids`: the `token_ids` argument given to `mt_transfer_call`
    /// * `msg`: information necessary for this contract to know how to process the
    ///   request. This may include method names and/or arguments.
    ///
    /// Returns true if tokens should be returned to `sender_id`
    fn mt_on_transfer(
        &mut self,
        sender_id: AccountId,
        token_ids: Vec<TokenId>,
        amounts: Vec<U128>,
        msg: String,
    ) -> PromiseOrValue<Vec<U128>>;
}
```
### Resolver Trait
#### Notes
- TokenId is of type String
```
/// Used when MultiTokens are transferred using `mt_transfer_call`. This is the method that's called after `mt_on_transfer`. This trait is implemented on the MultiToken contract.
pub trait MultiTokenResolver {
    /// Finalize an `mt_transfer_call` chain of cross-contract calls.
    ///
    /// The `mt_transfer_call` process:
    ///
    /// 1. Sender calls `mt_transfer_call` on MultiToken contract
    /// 2. MultiToken contract transfers token from sender to receiver
    /// 3. MultiToken contract calls `mt_on_transfer` on receiver contract
    /// 4+. [receiver contract may make other cross-contract calls]
    /// N. MultiToken contract resolves promise chain with `mt_resolve_transfer`, and may
    ///    transfer token back to sender
    ///
    /// Requirements:
    /// * Contract MUST forbid calls to this function by any account except self
    /// * If promise chain failed, contract MUST revert token transfer
    /// * If promise chain resolves with `true`, contract MUST return token to
    ///   `sender_id`
    ///
    /// Arguments:
    /// * `previous_owner_id`: the owner prior to the call to `mt_transfer_call`
    /// * `receiver_id`: the `receiver_id` argument given to `mt_transfer_call`
    /// * `token_ids`: the `token_ids` argument given to `mt_transfer_call`
    /// * `approvals`: if using Approval Management, contract MUST provide
    ///   set of original approved accounts in this argument, and restore these
    ///   approved accounts in case of revert. In this case it may be multiple sets of approvals
    ///
    /// Returns true if tokens were successfully transferred to `receiver_id`.
    fn mt_resolve_transfer(
        &mut self,
        sender_id: AccountId,
        receiver_id: AccountId,
        token_ids: Vec<TokenId>,
        amounts: Vec<U128>,
    ) -> Vec<U128>;
}
```
### Storage Management Trait
#### Notes
This is semi necessary for ft token types to be able to refund users for storage of many different token types like gold/silver... this might be slightly out of scope
```
pub trait StorageManagement {
    // if `registration_only=true` MUST refund above the minimum balance if the account didn't exist and
    //     refund full deposit if the account exists.
    fn storage_deposit(
        &mut self,
        token_ids: Vec<TokenId>,
        account_id: Option<AccountId>,
        registration_only: Option<bool>,
    ) -> StorageBalance;

    /// Withdraw specified amount of available Ⓝ for predecessor account.
    ///
    /// This method is safe to call. It MUST NOT remove data.
    ///
    /// `amount` is sent as a string representing an unsigned 128-bit integer. If
    /// omitted, contract MUST refund full `available` balance. If `amount` exceeds
    /// predecessor account's available balance, contract MUST panic.
    ///
    /// If predecessor account not registered, contract MUST panic.
    ///
    /// MUST require exactly 1 yoctoNEAR attached balance to prevent restricted
    /// function-call access-key call (UX wallet security)
    ///
    /// Returns the StorageBalance structure showing updated balances.
    fn storage_withdraw(&mut self, token_ids:Vec<TokenId>, amount: Option<U128>) -> StorageBalance;

    /// Unregisters the predecessor account and returns the storage NEAR deposit back.
    ///
    /// If the predecessor account is not registered, the function MUST return `false` without panic.
    ///
    /// If `force=true` the function SHOULD ignore account balances (burn them) and close the account.
    /// Otherwise, MUST panic if caller has a positive registered balance (eg token holdings) or
    ///     the contract doesn't support force unregistration.
    /// MUST require exactly 1 yoctoNEAR attached balance to prevent restricted function-call access-key call
    /// (UX wallet security)
    /// Returns `true` if the account was successfully unregistered by this call.
    /// Returns `false` if account was already unregistered.
    fn storage_unregister(&mut self, token_ids:Vec<TokenId>, force: Option<bool>) -> Vec<bool>;

    fn storage_balance_bounds(&self, token_id:Vec<TokenId>, account_id: Option<AccountId>) -> StorageBalanceBounds;
    fn storage_balance_of(&self, token_ids:Vec<TokenId>, account_id: AccountId) -> Option<StorageBalance>;
}
```

### Metadata Trait
```
pub struct MultiTokenMetadata {
    pub spec: String,              // required, essentially a version like "mt-1.0.0"
    pub name: String,              // required, ex. "Mosaics"
    pub symbol: Option<String>,            // ex. "MOSIAC"
    pub icon: Option<String>,      // Data URL
    pub base_uri: Option<String>, // Centralized gateway known to have reliable access to decentralized storage assets referenced by `reference` or `media` URLs
    // supports metadata_uri interface that interpolates {id} in the string
    pub decimals: Option<u8>, // Option to specify precision if required 
    pub title: Option<String>, // ex. "Arch Nemesis: Mail Carrier" or "Parcel #5055"
    pub description: Option<String>, // free-form description
    pub media: Option<String>, // URL to associated media, preferably to decentralized, content-addressed storage
    pub media_hash: Option<Base64VecU8>, // Base64-encoded sha256 hash of content referenced by the `media` field. Required if `media` is included.
    pub copies: Option<u64>, // number of copies of this set of metadata in existence when token was minted.
    pub issued_at: Option<String>, // ISO 8601 datetime when token was issued or minted
    pub expires_at: Option<String>, // ISO 8601 datetime when token expires
    pub starts_at: Option<String>, // ISO 8601 datetime when token starts being valid
    pub updated_at: Option<String>, // ISO 8601 datetime when token was last updated
    pub extra: Option<String>, // anything extra the NFT wants to store on-chain. Can be stringified JSON.
    pub reference: Option<String>, // URL to an off-chain JSON file with more info.
    pub reference_hash: Option<Base64VecU8>, // Base64-encoded sha256 hash of JSON from reference field. Required if `reference` is included.
}

/// Offers details on the  metadata.
pub trait MultiTokenMetadataProvider {
    fn mt_metadata(&self, token_id: TokenId) -> MultiTokenMetadata;
}
```
# Drawbacks
[drawbacks]: #drawbacks
Doing this adds another spec and codebase to the standards. It could be seen that we could leave this to developers to implement custom solutions and have them create a contract that implements both `NEP-141` and `NEP-171` methods together. There is some additional complexity
in ux, when considering batch size request and gas limitations, that might trip some developers up. 

# Rationale and alternatives
[rationale-and-alternatives]: #rationale-and-alternatives
The rationale for this design, is that we want to support developers that need batch requests. In many ecosystems, a single NFT or 
series of NFT are not sufficient for representing and managing potentially 100s of tokens. Managing cross contract calls and the token contracts themselves become a huge burden on the developer. This will reduce the complexity, and allow developers to easily bridge over to other contracts like ERC-1155 on other chains that allow for a this style of representation.

In the design phase it was considered to simply rely on the underlying implementations of fungible tokens and non-fungible tokens
to be the scope of interaction with the chain. Doing this we would have tied the implementations to the bounds of FT and NFT. By loosing this up a bit, we are able to be a bit more flexible in what's possible.

Not doing this means we really won't have a great way of supporting use cases where developers need to represent and manage
large varying quantities and types of tokens. They will all have to implement it on their own, and that would make for a fragmented
and weak ecosystem. Where every developer would not be able to reliably trade these assets.

# Unresolved questions
[unresolved-questions]: #unresolved-questions
The unresolved questions, are really what type of metadata , is required for this spec?
- We decided that having metadata on chain is good, and that at later time we can have a spec for extra data if needed

Can we represent events in this spec, which would improve the ecosystem quite a bit? If we represent events what should those events be?
- We decided events aren't here yet in the ecosystem, in the way we' like them to be so they are't apart of this standard

Should we have a spec for TokenType?
- We decided TokenType shouldn't be exposed for the public interface consumption. We will leave this description in the hands of the implementers

Should we have a spec for offchain metadata?
- We decided no spec for offchain metadata yet but maybe in the future

Does the current storage management scheme work for people?
- The current storage management scheme works for folks

How freeform should this token be? Right now there is a notion of supply, which is not 100% guaranteed every token has
or wants to track supply semantics. Not having supply makes everything more difficult and requires consumers of the contract
to track minting and burning events.
- This point was taken to show that due to lack of proper events, and having the additional capability of storing this on chain, would
result in a reduction of complexity for consumers of the contract data.

Approval Management is probably out of the scope of this solution.


# Future possibilities
[future-possibilities]: #future-possibilities
Future possibilities could be around enumeration extension like for the NFT spec, an off chain data spec, approval management if it's required, and error status codes.
