# Injected Wallets

## Summary

Standard interface for injected wallets.

## Motivation

dApps are finding it increasingly difficult to support the ever expanding choice of wallets due to their wildly different implementations. While projects such as [Wallet Selector](https://github.com/near/wallet-selector) attempt to mask this problem, it's clear the ecosystem is crying out for a standard that will not only benefit dApps but make it easier for existing wallets to add support for NEAR.

## What is an Injected Wallet?

Injected wallets are browser extensions that implement the `Wallet` API (see below) on the `window` object. To avoid namespace collisions seen in other chains such as Ethereum, wallets will mount under their own key within `window.near` (e.g. `window.near.sender`). This approach solves the problem of detecting which wallet(s) are available and supports multiple injected wallets simultaneously!

## Wallet API

At it's most basic, the Wallet API has main two features:

- `request`: Communication with the wallet.
- `on` and `off`: Subscribe to notable events such as account updates.

The decision to implement `request` instead of dedicated methods means wallets can define their own custom functionality without polluting the top-level namespace. The purpose of this standard is to define the minimum set of methods to be considered an official NEAR injected wallet. Wallets are free to innovate with functionality they believe could eventually become part of the standard such as querying the locked status.

Heavily inspired by [Ethereum's JSON-RPC Methods](https://docs.metamask.io/guide/rpc-api.html#ethereum-json-rpc-methods), below is a high-level overview of what an injected wallet should look like.

```ts
import { providers, transactions } from "near-api-js";

interface Account {
  accountId: string;
  publicKey: string;
}

interface Network {
  networkId: string;
  nodeUrl: string;
}

interface SignInParams {
  permission: transactions.FunctionCallPermission;
  accounts: Array<Account>;
}

interface SignOutParams {
  accounts: Array<Account>;
}

interface SignTransactionParams {
  transaction: transactions.Transaction;
}

interface SignTransactionsParams {
  transactions: Array<transactions.Transaction>;
}

interface Methods {
  connect: {
    params: {
      method: "connect";
    };
    response: Array<Account>;
  };
  getAccounts: {
    params: {
      method: "getAccounts";
    };
    response: Array<Account>;
  };
  getNetwork: {
    params: {
      method: "getNetwork";
    };
    response: Network;
  };
  signIn: {
    params: {
      method: "signIn";
      params: SignInParams;
    };
    response: Array<Account>;
  };
  signOut: {
    params: {
      method: "signOut";
      params: SignOutParams;
    };
    response: void;
  };
  signTransaction: {
    params: {
      method: "signTransaction";
      params: SignTransactionParams;
    };
    response: transactions.SignedTransaction;
  };
  signTransactions: {
    params: {
      method: "SignTransactions";
      params: SignTransactionsParams;
    };
    response: Array<transactions.SignedTransaction>;
  };
  disconnect: {
    params: {
      method: "disconnect";
    };
    response: void;
  };
}

interface Events {
  accountsChanged: { accounts: Array<Account> };
};

type Unsubscribe = () => void;

interface Wallet {
  id: string;
  connected: boolean;
  request<
    MethodName extends keyof Methods,
    Method extends Methods[MethodName]
  >(
    params: Method["params"]
  ): Promise<Method["response"]>;
  on<EventName extends keyof Events>(
    event: EventName,
    callback: (params: Events[EventName]) => void
  ): Unsubscribe;
  off<EventName extends keyof Events>(
    event: EventName,
    callback?: () => void
  ): void;
}
```

## Methods

<!--
- `connect`: Request visibility for a one or more accounts from the wallet.
- `disconnect`: Remove visibility of all accounts from the wallet.
- `getAccounts`: 
- `getNetwork`: Get the currently selected network.
- `signIn`: Request access to one or more accounts.
- `signOut`: Remove access to all accounts.
- `signAndSendTransaction`: Sign and Send one or more NEAR Actions.
- `signAndSendTransactions`: Sign and Send one or more NEAR Transactions.
-->

### `connect`

Request visibility for a one or more accounts from the wallet. This should explicitly prompt the user to select from their list of imported accounts. dApps should use `getAccounts` once connected to retrieve the list of visible accounts.

```ts
const accounts = await window.near.myWallet.request({
  method: "connect",
});
```

### `getNetwork`

Retrieve the currently selected network.

```ts
const network = await window.near.myWallet.request({
  method: "getNetwork",
});
```

### `getAccounts`

Retrieve all accounts visible to the dApp.

```ts
const accounts = await window.near.myWallet.request({
  method: "getAccounts",
});
```

### `signTransaction`

Sign a transaction. This request should require explicit approval from the user.

```ts
import { transactions } from "near-api-js";

// Retrieve first account (assuming already connected).
const [account] = await window.near.myWallet.request({
  method: "getAccounts",
});

// Retrieve network details from the wallet.
const network = await window.near.myWallet.request({
  method: "getNetwork",
});

// Setup RPC to retrieve transaction-related prerequisites.
const provider = new providers.JsonRpcProvider({
  url: network.nodeUrl,
});

const [block, accessKey] = await Promise.all([
  provider.block({ finality: "final" }),
  provider.query<AccessKeyView>({
    request_type: "view_access_key",
    finality: "final",
    account_id: account.accountId,
    public_key: account.publicKey,
  }),
]);

const signedTx = await window.near.myWallet.request({
  method: "signTransaction",
  params: {
    transaction: transactions.createTransaction(
      account.accountId,
      utils.PublicKey.from(account.publicKey),
      "guest-book.testnet",
      accessKey.nonce + 1,
      [transactions.functionCall(
        "addMessage",
        { text: "Hello World!" },
        utils.format.parseNearAmount("0.00000000003"),
        utils.format.parseNearAmount("0.01")
      )],
      utils.serialize.base_decode(block.header.hash)
    ),
  }
});

// Send the transaction to the blockchain.
await provider.sendTransaction(signedTx);
```

### `signTransactions`

Sign a list of transactions. This request should require explicit approval from the user.

```ts
// TODO.
```

### `disconnect`

Remove visibility of all accounts from the wallet.

```ts
await window.near.myWallet.request({
  method: "disconnect",
});
```

### `signIn`

For dApps that often sign gas-only transactions, `FunctionCall` access keys can be created for one or more accounts to greatly improve the UX. While this could be achieved with `signTransactions`, it suggests a direct intention that a user wishes to sign in to a dApp's smart contract.

```ts
import { utils } from "near-api-js";

// Retrieve the list of accounts we have visibility of.
const accounts = await window.near.myWallet.request({
  method: "getAccounts",
});

// Request FunctionCall access to the 'guest-book.testnet' smart contract for each account.
await window.near.myWallet.request({
  method: "signIn",
  params: {
    permission: {
      receiverId: "guest-book.testnet",
      methodNames: [],
    },
    accounts: accounts.map(({ accountId }) => {
      const keyPair = utils.KeyPair.fromRandom("ed25519");
      
      return {
        accountId,
        publicKey: keyPair.getPublicKey().toString()
      };
    }),
  }
});
```

## Events

### `accountsChanged`

Triggered whenever accounts are updated (e.g. calling `connect` or `disconnect`).

```ts
window.near.myWallet.on("accountsChanged", (accounts) => {
  console.log("Accounts Changed", accounts);
});
```
