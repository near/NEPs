- Proposal Name: Wallet API
- Start Date: (fill me in with today's date, 2019-07-30)
- NEP PR: [nearprotocol/neps#0000](https://github.com/nearprotocol/NEPs/pull/10)
- Issue(s): n/a

# Summary
[summary]: #summary

We want to have a well-defined API signing transactions to be sent to NEAR protocol via a wallet.
The API needs to support multiple transactions, including but not limited to:
- adding access keys to account
- sending tokens to other accounts
- composite transactions that contain several sub-transactions of potentially different types

In order to support this, we want a generic API for signing arbitrary transactions in the wallet.

# Motivation
[motivation]: #motivation

We want to support multiple wallet implementations, including those by third party developers. We also want to support multiple "styles" of wallets. E.g. web wallets, hardware wallets, browser extensions.
Any specific app may prefer to work with a specific wallet that best suits their use case (security requirements, usability, theme, UX, etc), so there must be a way to configure the app easily to use a particular wallet implementation. We also want a flexible system that allows adding new types of
transactions easily.

# Reference-level explanation
[reference-level-explanation]: #reference-level-explanation

## Sign transaction with Web wallet

App requests wallet to sign transaction by open following URL in the browser:
`{walletUrl}/sign?transaction={transactionData}&callback={callbackUrl}`

- `walletUrl` is a base wallet URL that can be specified when creating wallet connection using nearlib.
- `transactionData` base64-encoded [`SignedTransaction` proto]( https://github.com/nearprotocol/nearcore/blob/master/core/protos/protos/signed_transaction.proto#L65). It's not signed yet, i.e. `signature` and `public_key` fields aren't set.
- `callbackUrl` callback URL provided by app that gets opened by wallet after flow completion.
- `accountId` optional, account to use for signing
- `publicKey` optional, base58 encoded public key to use for signing
- `send` optional, `true` if wallet should send transaction after signing (wallet not required to support this)

### Callback URL

Wallet should open `callbackUrl` provided by app specifying following query paramers.

For error:
- `errorCode` unique identifier string for error
    - TODO: Error codes

For success:
- `accountId` account ID for account used to sign transaction
- `signedTransaction` base64-encoded [`SignedTransaction` proto]( https://github.com/nearprotocol/nearcore/blob/master/core/protos/protos/signed_transaction.proto#L65)
- `sent` indicates whether transaction has been sent, `true` if sent. Wallet that doesn't support sending transactions always returns `false`.

# Drawbacks
[drawbacks]: #drawbacks

TODO

# Rationale and alternatives
[rationale-and-alternatives]: #rationale-and-alternatives

The url scheme that is live right now is the following, supporting a login operation:
`{walletUrl}/login/?public_key={public_key}&contract_id={contract_id}&success_url={success_url}&failure_url={failure_url}&title={title}`
- `contract_id` param is the id of the contract
- `success_url` param is the url that the wallet will redirect to on success
- `failure_url` param is the url that the wallet will redirect to on failure
- `title` param is going to be deprecated soon. It is the human readable title of the app that is making the request (may need to be localized). This data should be available from contract metadata soon (please see contract metadata NEP)

Wallet creates and signs the `addKey` transaction directly. It appends the following parameters to the success_url
`?account_id={account_id}&public_key={public_key}`

The main drawback of this design is the difficulty of adding new transaction types. Nearlib code to be updated to add a new urlpath (e.g. `/sign/`, `/send_money/`), and additional url params may need to be added to the scheme. Also, a composite transaction type (transaction consisting of multiple sub-transactions) may be too difficult to implement using this approach.

# Unresolved questions
[unresolved-questions]: #unresolved-questions

- Does the wallet always send the transaction directly, or do we need to support a use case of generating a signature and returning it back to the app?
  - Should allow caller to send transaction

- TODO

# Future possibilities
[future-possibilities]: #future-possibilities

- TODO
- Popup?
