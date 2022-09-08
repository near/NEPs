# Bridge Wallets

## Summary

Standard interface for bridge wallets.

## Motivation

Bridge wallets such as [WalletConnect](https://docs.walletconnect.com/2.0/) and [Nightly Connect](https://connect.nightly.app/) are powerful messaging layers for communicating with various blockchains. Since they lack an opinion on how payloads are structured, without a standard, it can be impossible for dApps and wallets to universally communicate without compatibility problems.

## Rationale and alternatives

At its most basic, a wallet manages key pairs which are used to sign messages. The signed messages are typically then submitted by the wallet to the blockchain.  This standard aims to define an API (based on our learning from [Wallet Selector](https://github.com/near/wallet-selector)) that achieves this requirement through a number of methods compatible with a relay architecture.

There have been many iterations of this standard to help inform what we consider the best approach right now for NEAR. You can find more relevant content in the [Injected Wallet Standard](#).

## Specification

Bridge wallets use a relay architecture to forward signing requests between dApps and wallets.  Requests are typically relayed using a messaging protocol such as WebSockets or by polling a REST API. The concept of a `session` wraps this connection between a dApp and a wallet.  When the session is established, the wallet user typically selects which accounts that the dApp should have any awareness of. As the user interacts with the dApp and performs actions that require signing, messages are relayed to the wallet from the dApp, those messages are signed by the wallet and submitted to the blockchain on behalf of the requesting dApp. This relay architecture decouples the 'signing' context (wallet) and the 'requesting' context (dApp, which enables signing to be performed on an entirely different device than the dApp browser is running on.

To establish a session, the dApp must first pair with the wallet. Pairing often includes a QR code to improve UX. Once both clients are paired, a request to initialize a session is made. During this phase, the wallet user is prompted to select one or more accounts (previously imported) to be visible to the session before approving the request.

Once a session has been created, the dApp can make requests to sign transactions using either [`signTransaction`](#signtransaction) or [`signTransactions`](#signtransactions). These methods accept encoded [Transactions](https://nomicon.io/RuntimeSpec/Transactions) created with `near-api-js`. Since transactions must know the public key that will be used as the `signerId`, a call to [`getAccounts`](#getaccounts) is required to retrieve a list of the accounts visible to the session along with their associated public key. Requests to both [`signTransaction`](#signtransaction) and [`signTransactions`](#signtransactions) require explicit approval from the user since [`FullAccess`](https://nomicon.io/DataStructures/AccessKey) keys are used.

For dApps that regularly sign gas-only transactions, Limited [`FunctionCall`](https://nomicon.io/DataStructures/AccessKey#accesskeypermissionfunctioncall) access keys can be added/deleted to one or more accounts by using the [`signIn`](#signin) and [`signOut`](#signout) methods. While the same functionality could be achieved with [`signTransactions`](#signtransactions), that contain actions that add specific access keys with particular permissions to a specific account, by using `signIn`, the wallet receives a direct intention that a user wishes to sign in/out of a dApp's smart contract, which can provide a cleaner UI to the wallet user and allow convenient behavior to be implemented by wallet providers such as 'sign out' automatically deleting the associated limited access key that was created when the user first signed in.

Although intentionally similar to the [Injected Wallet Standard](#), this standard focuses on the transport layer instead of the high-level abstractions found in injected wallets. Below are the key differences between the standards:

- [Transactions](https://nomicon.io/RuntimeSpec/Transactions) passed to `signTransaction` and `signTransactions` must be encoded.
- The result of `signTransaction` and `signTransactions` are encoded [SignedTransaction](https://nomicon.io/RuntimeSpec/Transactions#signed-transaction) models.
- Accounts contain only a string representation of public keys.

### Methods

#### `signTransaction`

Sign a transaction. This request should require explicit approval from the user.

```ts
import { transactions } from "near-api-js";

interface SignTransactionParams {
  // Encoded Transaction via transactions.Transaction.encode().
  transaction: Uint8Array;
}

// Encoded SignedTransaction via transactions.SignedTransaction.encode().
type SignTransactionResponse = Uint8Array;
```

#### `signTransactions`

Sign a list of transactions. This request should require explicit approval from the user.

```ts
import { providers, transactions } from "near-api-js";

interface SignTransactionsParams {
  // Encoded Transaction via transactions.Transaction.encode().
  transactions: Array<Uint8Array>;
}

// Encoded SignedTransaction via transactions.SignedTransaction.encode().
type SignTransactionsResponse = Array<Uint8Array>;
```

#### `signIn`

For dApps that often sign gas-only transactions, `FunctionCall` access keys can be created for one or more accounts to greatly improve the UX. While this could be achieved with `signTransactions`, it suggests a direct intention that a user wishes to sign in to a dApp's smart contract.

```ts
import { transactions } from "near-api-js";

interface Account {
  accountId: string;
  publicKey: string;
}

interface SignInParams {
  permission: transactions.FunctionCallPermission;
  accounts: Array<Account>;
}

type SignInResponse = null;
```

#### `signOut`

Delete one or more `FunctionCall` access keys created with `signIn`. While this could be achieved with `signTransactions`, it suggests a direct intention that a user wishes to sign out from a dApp's smart contract.

```ts
interface Account {
  accountId: string;
  publicKey: string;
}

interface SignOutParams {
  accounts: Array<Account>;
}

type SignOutResponse = null;
```

#### `getAccounts`

Retrieve all accounts visible to the session. `publicKey` references the underlying `FullAccess` key linked to each account.

```ts
interface Account {
  accountId: string;
  publicKey: string;
}

interface GetAccountsParams {}

type GetAccountsResponse = Array<Account>;
```

## Flows

**Connect**

1. dApp initiates pairing via QR modal.
2. wallet establishes pairing and prompts selection of accounts for new session.
3. wallet responds with session (id and accounts).
4. dApp stores reference to session.

**Sign in (optional)**

1. dApp generates a key pair for one or more accounts in the session.
2. dApp makes `signIn` request with `permission` and `accounts`.
3. wallet receives request and executes a transaction containing an `AddKey` Action for each account.
4. wallet responds with `null`.
5. dApp stores the newly generated key pairs securely.

**Sign out (optional)**

1. dApp makes `signOut` request with `accounts`.
2. wallet receives request and executes a transaction containing a `DeleteKey` Action for each account.
3. wallet responds with `null`.
4. dApp clears stored key pairs.

**Sign transaction**

1. dApp makes `signTransaction` request.
2. wallet prompts approval of transaction.
3. wallet signs the transaction.
4. wallet responds with `Uint8Array`.
5. dApp decodes signed transaction.
6. dApp sends signed transaction.

**Sign transactions**

1. dApp makes `signTransactions` request.
2. wallet prompts approval of transactions.
3. wallet signs the transactions.
4. wallet responds with `Array<Uint8Array>`.
5. dApp decodes signed transactions.
6. dApp sends signed transactions.
