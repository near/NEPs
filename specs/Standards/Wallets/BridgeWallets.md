# Bridge Wallets

## Summary

Standard interface for bridge wallets.

## Motivation

Bridge wallets such as [WalletConnect](https://docs.walletconnect.com/2.0/) are powerful messaging layers for communicating with various blockchains. Since they lack opinion on how payloads are structured, without a standard, it can be impossible for dApps and wallets to universally communicate without compatibility problems.

## Methods

### `signAndSendTransaction`

Sign a transaction using a `FullAccess` key related to the `signerId`. This request should require explicit approval from the user.

```ts
import { providers } from "near-api-js";

interface Transaction {
  signerId: string;
  receiverId: string;
  // NEAR Actions (plain objects). See "Actions" section for details.
  actions: Array<Action>;
}

interface SignAndSendTransactionParams {
  transaction: Transaction;
}

type SignAndSendTransactionResponse = providers.FinalExecutionOutcome;
```

### `signAndSendTransactions`

Sign a list of transactions using the respective `FullAccess` key related to each `signerId`. This request should require explicit approval from the user.

```ts
import { providers } from "near-api-js";

interface Transaction {
  signerId: string;
  receiverId: string;
  // NEAR Actions (plain objects). See "Actions" section for details.
  actions: Array<Action>;
}

interface SignAndSendTransactionsParams {
  transactions: Array<Transaction>;
}

type SignAndSendTransactionsResponse = Array<providers.FinalExecutionOutcome>;
```

### `signIn`

For dApps that often sign gas-only transactions, `FunctionCall` access keys can be created for one or more accounts to greatly improve the UX. While this could be achieved with `near_signAndSendTransactions`, it suggests a direct intention that a user wishes to sign in to a dApp's smart contract.

```ts
interface Account {
  accountId: string;
  publicKey: string;
}

interface SignInParams {
  contractId: string;
  methodNames?: Array<string>;
  accounts: Array<Account>;
}

type SignInResponse = null;
```

### `signOut`

Delete one or more `FunctionCall` access keys created with `near_signIn`. While this could be achieved with `near_signAndSendTransactions`, it suggests a direct intention that a user wishes to sign out from a dApp's smart contract.

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

## Actions

Below are the 8 NEAR Actions used for signing transactions. Plain objects have been used to remove an unnecessary dependency on `near-api-js`.

```ts
interface CreateAccountAction {
  type: "CreateAccount";
}

interface DeployContractAction {
  type: "DeployContract";
  params: {
    code: Uint8Array;
  };
}

interface FunctionCallAction {
  type: "FunctionCall";
  params: {
    methodName: string;
    args: object;
    gas: string;
    deposit: string;
  };
}

interface TransferAction {
  type: "Transfer";
  params: {
    deposit: string;
  };
}

interface StakeAction {
  type: "Stake";
  params: {
    stake: string;
    publicKey: string;
  };
}

type AddKeyPermission =
  | "FullAccess"
  | {
      receiverId: string;
      allowance?: string;
      methodNames?: Array<string>;
    };

interface AddKeyAction {
  type: "AddKey";
  params: {
    publicKey: string;
    accessKey: {
      nonce?: number;
      permission: AddKeyPermission;
    };
  };
}

interface DeleteKeyAction {
  type: "DeleteKey";
  params: {
    publicKey: string;
  };
}

interface DeleteAccountAction {
  type: "DeleteAccount";
  params: {
    beneficiaryId: string;
  };
}

type Action =
  | CreateAccountAction
  | DeployContractAction
  | FunctionCallAction
  | TransferAction
  | StakeAction
  | AddKeyAction
  | DeleteKeyAction
  | DeleteAccountAction;
```
