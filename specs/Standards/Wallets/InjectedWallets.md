# Injected Wallets

## Summary

Standard interface for injected wallets.

## Motivation

dApps are finding it increasingly difficult to support the ever expanding choice of wallets due to their wildly different implementations. While projects such as [Wallet Selector](https://github.com/near/wallet-selector) attempt to mask this problem, it's clear the ecosystem is crying out for a standard that will not only benefit dApps but make it easier for existing wallets to add support for NEAR.

## What is an Injected Wallet?

Injected wallets are browser extensions that implement the `Wallet` API (see below) on the `window` object. To avoid namespace collisions seen in other chains such as Ethereum, wallets will mount under their own key within `window.near` (e.g. `window.near.sender`). This approach solves the problem of detecting which wallet(s) are available and supports multiple injected wallets simultaneously!

### Wallet API

At it's most basic, the Wallet API has main two features:

- `request`: Communication with the wallet.
- `on` and `off`: Subscribe to notable events such as account updates.

The decision to implement `request` instead of dedicated methods means wallets can define their own custom functionality without polluting the top-level namespace. The purpose of this standard is to define the minimum set of methods to be considered an official NEAR injected wallet. Wallets are free to innovate with functionality they believe could eventually become part of the standard such as querying the locked status.

Heavily inspired by [Ethereum's JSON-RPC Methods](https://docs.metamask.io/guide/rpc-api.html#ethereum-json-rpc-methods), below is a high-level overview of what an injected wallet should look like.

```ts
import { providers } from "near-api-js";

interface Account {
  accountId: string;
  publicKey: string;
}

interface Network {
  networkId: string;
  nodeUrl: string;
}

interface SignInParams {
  contractId: string;
  methodNames?: Array<string>;
}

interface SignAndSendTransactionParams {
  signerId?: string;
  receiverId: string;
  // NEAR Actions (plain objects). See "Actions" section for details.
  actions: Array<Action>;
}

interface Transaction {
  signerId?: string;
  receiverId: string;
  // NEAR Actions (plain objects). See "Actions" section for details.
  actions: Array<Action>;
}

interface SignAndSendTransactionsParams {
  transactions: Array<Transaction>;
}

interface Methods {
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
    };
    response: void;
  };
  signAndSendTransaction: {
    params: {
      method: "signAndSendTransaction";
      params: SignAndSendTransactionParams;
    };
    response: providers.FinalExecutionOutcome;
  };
  signAndSendTransactions: {
    params: {
      method: "signAndSendTransactions";
      params: SignAndSendTransactionsParams;
    };
    response: Array<providers.FinalExecutionOutcome>;
  };
}

interface Events {
  accountsChanged: { accounts: Array<Account> };
};

type Unsubscribe = () => void;

interface Wallet {
  id: string;
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

### Request Methods

- `getAccounts`: Get accounts exposed to dApp. An empty list of accounts means we aren't signed in.
- `getNetwork`: Get the currently selected network.
- `signIn`: Request access to one or more accounts.
- `signOut`: Remove access to all accounts.
- `signAndSendTransaction`: Sign and Send one or more NEAR Actions.
- `signAndSendTransactions`: Sign and Send one or more NEAR Transactions.

### Events

- `accountsChanged`: Triggered whenever accounts are updated (e.g. calling `signIn` and `signOut`).

### Actions

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

### Examples

**Sign in to the wallet**

```ts
const accounts = await window.near.myWallet.request({
  method: "signIn",
  params: { contractId: "guest-book.testnet" }
});
```

**Get accounts (after previously calling `signIn`)**

```ts
const accounts = await window.near.myWallet.request({
  method: "getAccounts"
});
```

**Subscribe to account changes**

```ts
window.near.myWallet.on("accountsChanged", (accounts) => {
  console.log("Accounts Changed", accounts);
});
```

**Get network configuration**

```ts
const network = await window.near.myWallet.request({ 
  method: "getNetwork" 
});
```

**Sign and send a transaction**

```ts
const result = await window.near.myWallet.request({
  method: "signAndSendTransaction",
  params: {
    signerId: "test.testnet",
    receiverId: "guest-book.testnet",
    actions: [{
      type: "FunctionCall",
      params: {
        methodName: "addMessage",
        args: { text: "Hello World!" },
        gas: "30000000000000",
        deposit: "10000000000000000000000",
      },
    }]
  }
});
```

## Sign In

The purpose of signing in to a wallet is to give dApps access to one or more accounts using `FunctionCall` access keys.

### Considerations

- If there's only one imported account, the flow can be simplified to an approval prompt to sign in with the only account.
- If there are problems with the `AddKey` action for any account, we should continue unless none were successful.

### Multiple Accounts

An important concept of this architecture is dApps have access to multiple accounts. This might seem confusing at first because why would a dApp want to sign transactions with multiple accounts? The idea is the dApp might still maintain the concept of a single "active" account, but users won't need to sign in and out of accounts each time. The dApp can just display a switcher and sign transactions with the new account without having to further prompt the user, thus improving the UX flow.
