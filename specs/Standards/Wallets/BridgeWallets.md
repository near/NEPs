# Bridge Wallets

## Summary

Standard interface for bridge wallets.

## Motivation

Bridge wallets such as [WalletConnect](https://docs.walletconnect.com/2.0/) and [Nightly Connect](https://connect.nightly.app/) are powerful messaging layers for communicating with various blockchains. Since they lack an opinion on how payloads are structured, without a standard, it can be impossible for dApps and wallets to universally communicate without compatibility problems.

## Rationale and alternatives

At its most basic, a wallet contains key pairs required to sign messages. This standard aims to define an API (based on our learning from [Wallet Selector](https://github.com/near/wallet-selector)) that achieves this requirement through a number of methods compatible with a relay architecture.

There has been many iterations of this standard to help inform what we consider the "best" approach right now for NEAR. You can find more detail in the [Injected Wallet Standard](./InjectedWallets.md).

## Specification

Bridge wallets use a relay architecture to forward requests between dApps and wallets using Web Sockets. The concept of a session wraps this connection to expose NEAR accounts to a dApp. This relay architecture decouples the dApp and wallet to enable communication that isn't limited to the same device and/or browser.

To establish a session, the dApp must first pair with the wallet. Pairing often includes a QR code to improve UX. Once both clients are paired, a request to initialise a session is made. During this phase, the user is prompted to select one or more accounts (previously imported) to be visible to the session before approving the request.

With a session created, the dApp can make requests to sign transactions using either [`signTransaction`](#signtransaction) or [`signTransactions`](#signtransactions). These methods accept encoded [Transactions](https://nomicon.io/RuntimeSpec/Transactions) created with `near-api-js`. Since transactions need a public key for the `signerId`, a call to [`getAccounts`](#getaccounts) is required to retrieve a list of the accounts visible to the session along with their associated public key. Requests to both [`signTransaction`](#signtransaction) and [`signTransactions`](#signtransactions) require explicit approval from the user since [`FullAccess`](https://nomicon.io/DataStructures/AccessKey) keys are used.

For dApps that often sign gas-only transactions, [`FunctionCall`](https://nomicon.io/DataStructures/AccessKey#accesskeypermissionfunctioncall) access keys can be added/deleted for one or more accounts using the [`signIn`](#signin) and [`signOut`](#signout) methods. While this functionality could be achieved with [`signTransactions`](#signtransactions), it suggests a direct intention that a user wishes to sign in/out of a dApp's smart contract.

Although intentionally similar to the [Injected Wallet Standard](./InjectedWallets.md), this standard focuses on the transport layer instead of the high-level abstractions found in injected wallets. Below are the key differences between the standards:

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
