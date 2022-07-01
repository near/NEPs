# Bridge Wallets

## Summary

Standard interface for bridge wallets.

## Motivation

Bridge wallets such as [WalletConnect](https://docs.walletconnect.com/2.0/) and [Nightly Connect](https://connect.nightly.app/) are powerful messaging layers for communicating with various blockchains. Since they lack an opinion on how payloads are structured, without a standard, it can be impossible for dApps and wallets to universally communicate without compatibility problems.

## Methods

### `signAndSendTransaction`

Sign and send a transaction. This request should require explicit approval from the user.

```ts
import { providers, transactions } from "near-api-js";

interface SignAndSendTransactionParams {
  transaction: transactions.Transaction;
}

type SignAndSendTransactionResponse = providers.FinalExecutionOutcome;
```

### `signAndSendTransactions`

Sign and send a list of transaction. This request should require explicit approval from the user.

```ts
import { providers, transactions } from "near-api-js";

interface SignAndSendTransactionsParams {
  transactions: Array<transactions.Transaction>;
}

type SignAndSendTransactionsResponse = Array<providers.FinalExecutionOutcome>;
```

### `signIn`

For dApps that often sign gas-only transactions, `FunctionCall` access keys can be created for one or more accounts to greatly improve the UX. While this could be achieved with `signAndSendTransactions`, it suggests a direct intention that a user wishes to sign in to a dApp's smart contract.

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

### `signOut`

Delete one or more `FunctionCall` access keys created with `signIn`. While this could be achieved with `signAndSendTransactions`, it suggests a direct intention that a user wishes to sign out from a dApp's smart contract.

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

### `getAccounts`

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

1. dApp makes `signAndSendTransaction` request.
2. wallet prompts approval of transaction.
3. wallet signs the transaction before sending it.
4. wallet responds with `providers.FinalExecutionOutcome`.

**Sign transactions**

1. dApp makes `signAndSendTransactions` request.
2. wallet prompts approval of transactions.
3. wallet signs the transactions.
4. wallet responds with `Array<providers.FinalExecutionOutcome>`.
