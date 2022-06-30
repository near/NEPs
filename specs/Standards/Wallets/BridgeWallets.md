# Bridge Wallets

## Summary

Standard interface for bridge wallets.

## Motivation

Bridge wallets such as [WalletConnect](https://docs.walletconnect.com/2.0/) are powerful messaging layers for communicating with various blockchains. Since they lack opinion on how payloads should be structured, without a standard, it can be impossible for dApps and wallets to universally communicate without compatibility problems.

## JSON-RPC Methods

**near_signIn**

Request access (via `FunctionCall` access keys) to one or more accounts.

```ts
interface Account {
  accountId: string;
  publicKey: string;
}

interface SignInRequest {
  id: 1;
  jsonrpc: "2.0";
  method: "near_signIn";
  params: {
    contractId: string;
    methodNames?: Array<string>;
    accounts: Array<Account>;
  };
}

interface SignInResponse {
  id: 1;
  jsonrpc: "2.0";
  result: null;
}
```

**near_signOut**

Remove access (via `FunctionCall` access keys) to one or more accounts.

```ts
interface SignOutRequest {
  id: 1;
  jsonrpc: "2.0";
  method: "near_signOut";
  params: {
    accounts: Array<Account>;
  };
}

interface SignOutResponse {
  id: 1;
  jsonrpc: "2.0";
  result: null;
}
```

**near_getAccounts**

Retrieve `FullAccess` accounts linked to the session.

```ts
interface Account {
  accountId: string;
  publicKey: string;
}

interface GetAccountsRequest {
  id: 1;
  jsonrpc: "2.0";
  method: "near_getAccounts";
  params: {};
}

interface GetAccountsResponse {
  id: 1;
  jsonrpc: "2.0";
  result: Array<Account>;
}
```

**near_signAndSendTransaction**

```ts
import { providers } from "near-api-js";

interface Transaction {
  signerId: string;
  receiverId: string;
  // NEAR Actions (plain objects). See "Actions" section for details.
  actions: Array<Action>;
}

interface SignAndSendTransactionRequest {
  id: 1;
  jsonrpc: "2.0";
  method: "near_signAndSendTransaction";
  params: {
    transaction: Transaction;
  };
}

interface SignAndSendTransactionResponse {
  id: 1;
  jsonrpc: "2.0";
  result: providers.FinalExecutionOutcome;
}
```

**near_signAndSendTransactions**

```ts
import { providers } from "near-api-js";

interface Transaction {
  signerId: string;
  receiverId: string;
  // NEAR Actions (plain objects). See "Actions" section for details.
  actions: Array<Action>;
}

interface SignAndSendTransactionsRequest {
  id: 1;
  jsonrpc: "2.0";
  method: "near_signAndSendTransactions";
  params: {
    transactions: Array<Transaction>;
  };
}

interface SignAndSendTransactionsResponse {
  id: 1;
  jsonrpc: "2.0";
  result: Array<providers.FinalExecutionOutcome>;
}
```

## Flows

**Connect**

1. dApp initiates pairing via QR modal.
2. wallet establishes pairing.
3. dApp makes session proposal (with methods described above).
4. wallet prompts selection of accounts and approval of proposal.

**Sign in (optional)**

1. dApp generates a key pair for one or more accounts in the session.
2. dApp makes `near_signIn` request with `contractId`, `accounts` and optionally `methodNames`.
3. wallet receives request and executes a transaction containing an `AddKey` Action for each account.
4. wallet responds with `null`.
5. dApp stores the newly generated key pairs securely.

**Sign out (optional)**

1. dApp makes `near_signOut` request with `accounts`.
2. wallet receives request and executes a transaction containing a `DeleteKey` Action for each account.
3. wallet responds with `null`.
4. dApp clears stored key pairs.

**Sign transaction**

1. dApp makes `near_signAndSendTransaction` request.
2. wallet prompts approval of transaction.
3. wallet signs the transaction.
4. wallet responds with `providers.FinalExecutionOutcome`.

**Sign transactions**

1. dApp makes `near_signAndSendTransactions` request.
2. wallet prompts approval of transactions.
3. wallet signs the transactions.
4. wallet responds with `Array<providers.FinalExecutionOutcome>`.
