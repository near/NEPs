## Bridge Wallets (i.e. WalletConnect)

Bridge wallets such as [WalletConnect](https://docs.walletconnect.com/2.0/) enable an architecture that decouples dApps from directly interacting with a wallet by using a relay (HTTP/WebSocket) server. This means dApp users can sign transactions using wallets that aren't necessarily located in the same place as the dApp.

### Challenges

It's important that an integration between NEAR and WalletConnect combines the native features of both platforms without compromising on their core concepts.

Basing an approach on other platforms such as Ethereum would simply require two methods: `signAndSendTransaction` and `signAndSendTransactions`. The session state from WalletConnect allows dApps to reference the available accounts to populate the `signerId` for each transaction. Wallets can use `FullAccess` key(s) to carry out signing while cross-referencing the accounts a session has access to. The consequence of this approach is we aren't leveraging the permission model built into NEAR at the blockchain level using `FunctionCall` access keys.

The approach detailed below attempts to solve these challenges with two additional methods: `near_signIn` and `near_signOut`. These methods will handle the lifecycle of dApps that want to leverage `FunctionCall` access keys to reduce the frequency of prompts (i.e. gas-only `FunctionCall` actions) but aren't required.

### JSON-RPC Methods

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
  };
}

interface SignInResponse {
  id: 1;
  jsonrpc: "2.0";
  result: Array<Account>;
}
```

**near_signOut**

Remove access (via `FunctionCall` access keys) to one or more accounts.

```ts
interface SignOutRequest {
  id: 1;
  jsonrpc: "2.0";
  method: "near_signOut";
  params: {};
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

### Flows

**Connect**

1. dApp initiates pairing via QR modal.
2. wallet establishes pairing.
3. dApp makes session proposal (with methods described above).
4. wallet prompts selection of accounts and approval of proposal.

1. dApp makes `near_signIn` request with `contractId` and optionally `methodNames`.
2. wallet receives request and generates a key pair for each account in the session.
3. wallet sends a Transaction containing an `AddKey` Action for each key pair.
4. wallet stores the newly generated key pairs securely (mapped to WalletConnect session `topicId`).
5. wallet responds with each account and its respective public key (`FunctionCall` access key).

**Signing out**

1. dApp makes `near_signOut` request.
2. wallet receives request and gathers each account's public key (`FunctionCall` access key).
3. wallet sends a Transaction containing a `DeleteKey` Action for each public key.
4. wallet clears stored key pairs (related to WalletConnect session `topicId`).
5. wallet responds with `null`.

**Transaction signing (gas-only `FunctionCall`)**

1. dApp makes `near_signAndSendTransaction` request.
2. wallet determines the Transaction can be signed with the `FunctionCall` access key.
3. wallet "silently" signs the transaction without need for an approval prompt.
4. wallet responds with `providers.FinalExecutionOutcome`.

**Transaction signing (elevated permission required)**

1. dApp makes `near_signAndSendTransaction` request.
2. wallet determines the Transaction can't be signed with the `FunctionCall` access key (or one doesn't exist if `near_signIn` hasn't used).
3. wallet presents approval prompt before using the account's "root" (`FullAccess` access key).
4. wallet responds with `providers.FinalExecutionOutcome`.

**Add account(s)**

1. wallet prepares to update session by adding new account(s).
2. wallet generates a key pair for each new account.
3. wallet sends a Transaction containing an `AddKey` Action for each key pair.
4. wallet triggers `session_update` with WalletConnect client.

**Remove account(s)**

1. wallet prepares to update session by removing account(s).
2. wallet gathers the public key (`FunctionCall` access key) of each account to remove.
3. wallet sends a Transaction containing an `DeleteKey` Action for each public key.
4. wallet clears stored key pairs of each account (related to WalletConnect session `topicId`).
5. wallet triggers `session_update` with WalletConnect client.
