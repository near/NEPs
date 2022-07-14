# Injected Wallets

## Summary

Standard interface for injected wallets.

## Motivation

dApps are finding it increasingly difficult to support the ever expanding choice of wallets due to their wildly different implementations. While projects such as [Wallet Selector](https://github.com/near/wallet-selector) attempt to mask this problem, it's clear the ecosystem requires a standard that will not only benefit dApps but make it easier for established wallets to support NEAR.

## Rationale and alternatives

At its most basic, a wallet contains key pairs required to sign messages. This standard aims to define an API (based on our learning from [Wallet Selector](https://github.com/near/wallet-selector)) that achieves this requirement through a number of methods exposed on the `window` object.

The introduction of this standard makes it possible for `near-api-js` to become wallet-agnostic and eventually move away from the high amount of coupling with NEAR Wallet. It simplifies projects such as [Wallet Selector](https://github.com/near/wallet-selector) that must implement various abstractions to normalise the different APIs before it can display a modal for selecting a wallet.

This standard takes a different approach to a wallet API than other blockchains such as [Ethereum's JSON-RPC Methods](https://docs.metamask.io/guide/rpc-api.html#ethereum-json-rpc-methods). Mainly, it rejects the `request` abstraction that feels unnecessary and only adds to the complexity both in terms of implementation and types. Instead, it exposes various methods directly on the top-level object that also improves discoverability.

There has been many iterations of this standard to help inform what we consider the "best" approach right now for NEAR. Below is summary of the key design choices:

### Single account vs. multiple account

Almost every wallet implementation in NEAR used a single account model until we began integrating with [WalletConnect](https://walletconnect.com/). In WalletConnect, sessions can contain any number of accounts that can be modified by the dApp or wallet. The decision to use a multiple account model was influenced by the following reasons:

- It future-proofs the API even if wallets (such as MetaMask) only support a single "active" account.
- Other blockchains such as [Ethereum](https://docs.metamask.io/guide/rpc-api.html#eth-requestaccounts) implement this model.
- Access to multiple accounts allow dApps more freedom to improve UX as users can seamlessly switch between accounts.
- Aligns with WalletConnect via the [Bridge Wallet Standard](#TODO).

### Store FunctionCall access keys in dApp vs. wallet

NEAR's unique concept of `FunctionCall` access keys makes it possible for dApps to execute transactions without having to prompt the user each time. This limited access means they can be shared with relatively low risk, provided gas allowance and method names are appropriately defined.

There has been mixed views on exactly who should store these key pairs as there are trade-off to be considered with either option:

- Storing key pairs in the wallet means users have a contextual view of which dApps have limited access to their accounts. However, this can be solved through improvements to the `view_access_key` endpoints to include a description and/or url that helps users make a more informed decision on whether they want to remove it.
- Although risk is limited with `FunctionCall` access keys, storing key pairs in the dApp means a level of trust is required to ensure they're kept securely to avoid being compromised.
- Signing transactions that match the `FunctionCall` access key stored in the dApp means we don't require connection to a wallet. This is particularly useful for wallets such as Ledger and WalletConnect where it isn't always available. The downside to this approach is the dApp must handle much of the logic found already in the wallet such as storing and key pairs and matching applicable access keys during signing.

Although we had some technical challenges, the decision to store `FunctionCall` access keys on the dApp means users own their key pairs and gas-only intensive `FunctionCall` dApps work seamlessly with wallets that aren't always available. The expectation for `near-api-js` to become wallet-agnostic will reduce the complexity shifted onto the dApp as it can abstract away the logic required for handling the key pairs and only redirect to the wallet when further permission is needed.

<!-- TODO: Talk about why we also need connect/disconnect. -->

## What is an Injected Wallet?

Injected wallets are browser extensions that implement the `Wallet` API (see below) on the `window` object. To avoid namespace collisions seen in other chains such as Ethereum, wallets will mount under their own key within `window.near` (e.g. `window.near.sender`). This approach solves the problem of detecting which wallet(s) are available and supports multiple injected wallets simultaneously.

## Wallet API

Below is the entire API for injected wallets. It makes use of `near-api-js` to enable interoperability with dApps that will already use it for constructing transactions and communicating with RPC endpoints.

```ts
import { transactions } from "near-api-js";

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

interface Events {
  accountsChanged: { accounts: Array<Account> };
  networkChanged: { network: Network };
}

type Unsubscribe = () => void;

interface Wallet {
  id: string;
  connected: boolean;
  network: Network;
  accounts: Array<Account>;
  
  connect(): Promise<void>;
  signIn(params: SignInParams): Promise<void>;
  signOut(params: SignOutParams): Promise<void>;
  signTransaction(params: SignTransactionParams): Promise<transactions.SignedTransaction>;
  signTransactions(params: SignTransactionsParams): Promise<Array<transactions.SignedTransaction>>;
  disconnect(): Promise<void>;
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

## Properties

### `id`

Retrieve the wallet's unique identifier.

```ts
const { id } = window.near.wallet;

console.log(id) // "wallet"
```

### `connected`

Determine whether we're already connected to the wallet and have visibility of at least one account.

> Note: It's not required to be connected when using `signTransaction` and `signTransactions`.

```ts
const { connected } = window.near.wallet;

console.log(connected) // true
```

### `network`

Retrieve the currently selected network.

```ts
const { network } = window.near.wallet;

console.log(network) // { networkId: "testnet", nodeUrl: "https://rpc.testnet.near.org" }
```

### `accounts`

Retrieve all accounts visible to the dApp.

```ts
const { accounts } = window.near.wallet;

console.log(accounts) // [{ accountId: "test.testnet", publicKey: "..." }]
```

## Methods

### `connect`

Request visibility for one or more accounts from the wallet. This should explicitly prompt the user to select from their list of imported accounts. dApps can use the `accounts` property once connected to retrieve the list of visible accounts.

> Note: Calling this method when already connected will allow users to modify their selection, triggering the 'accountsChanged' event.

```ts
const accounts = await window.near.wallet.connect();
```

### `signTransaction`

Sign a transaction. This request should require explicit approval from the user.

```ts
import { transactions, providers, utils } from "near-api-js";
import { AccessKeyView } from "near-api-js/lib/providers/provider";

// Retrieve accounts (assuming already connected) and current network.
const { network, accounts } = window.near.wallet;

// Setup RPC to retrieve transaction-related prerequisites.
const provider = new providers.JsonRpcProvider({ url: network.nodeUrl });

const [block, accessKey] = await Promise.all([
  provider.block({ finality: "final" }),
  provider.query<AccessKeyView>({
    request_type: "view_access_key",
    finality: "final",
    account_id: accounts[0].accountId,
    public_key: accounts[0].publicKey,
  }),
]);

const signedTx = await window.near.wallet.signTransaction({
  transaction: transactions.createTransaction(
    accounts[0].accountId,
    utils.PublicKey.from(accounts[0].publicKey),
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
});

// Send the transaction to the blockchain.
await provider.sendTransaction(signedTx);
```

### `signTransactions`

Sign a list of transactions. This request should require explicit approval from the user.

```ts
import { transactions, providers, utils } from "near-api-js";
import { AccessKeyView } from "near-api-js/lib/providers/provider";

// Retrieve accounts (assuming already connected) and current network.
const { network, accounts } = window.near.wallet;

// Setup RPC to retrieve transaction-related prerequisites.
const provider = new providers.JsonRpcProvider({ url: network.nodeUrl });

const [block, accessKey] = await Promise.all([
  provider.block({ finality: "final" }),
  provider.query<AccessKeyView>({
    request_type: "view_access_key",
    finality: "final",
    account_id: accounts[0].accountId,
    public_key: accounts[0].publicKey,
  }),
]);

const signedTxs = await window.near.wallet.signTransactions({
  transactions: [
    transactions.createTransaction(
      accounts[0].accountId,
      utils.PublicKey.from(accounts[0].publicKey),
      "guest-book.testnet",
      accessKey.nonce + 1,
      [transactions.functionCall(
        "addMessage",
        { text: "Hello World! (1/2)" },
        utils.format.parseNearAmount("0.00000000003"),
        utils.format.parseNearAmount("0.01")
      )],
      utils.serialize.base_decode(block.header.hash)
    ),
    transactions.createTransaction(
      accounts[0].accountId,
      utils.PublicKey.from(accounts[0].publicKey),
      "guest-book.testnet",
      accessKey.nonce + 2,
      [transactions.functionCall(
        "addMessage",
        { text: "Hello World! (2/2)" },
        utils.format.parseNearAmount("0.00000000003"),
        utils.format.parseNearAmount("0.01")
      )],
      utils.serialize.base_decode(block.header.hash)
    )
  ]
});

for (let i = 0; i < signedTxs.length; i += 1) {
  const signedTx = signedTxs[i];
  
  // Send the transaction to the blockchain.
  await provider.sendTransaction(signedTx);
}
```

### `disconnect`

Remove visibility of all accounts from the wallet.

```ts
await window.near.wallet.disconnect();
```

### `signIn`

For dApps that often sign gas-only transactions, `FunctionCall` access keys can be created for one or more accounts to greatly improve the UX. While this could be achieved with `signTransactions`, it suggests a direct intention that a user wishes to sign in to a dApp's smart contract.

```ts
import { utils } from "near-api-js";

// Retrieve the list of accounts we have visibility of.
const { accounts } = window.near.wallet;

// Request FunctionCall access to the 'guest-book.testnet' smart contract for each account.
await window.near.wallet.signIn({
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
});
```

### `signOut`

Delete one or more `FunctionCall` access keys created with `signIn`. While this could be achieved with `signTransactions`, it suggests a direct intention that a user wishes to sign out from a dApp's smart contract.

```ts
import { utils, keyStores } from "near-api-js";

// Setup keystore to retrieve locally stored FunctionCall access keys.
const keystore = new keyStores.BrowserLocalStorageKeyStore();

// Retrieve accounts (assuming already connected) and current network.
const { network, accounts } = window.near.wallet;

// Remove FunctionCall access (previously granted via signIn) for each account.
await window.near.wallet.signOut({
  accounts: await Promise.all(
    accounts.map(async ({ accountId }) => {
      const keyPair = await keystore.getKey(network.networkId, accountId);

      return {
        accountId,
        publicKey: keyPair.getPublicKey().toString()
      };
    })
  ),
});
```

## Events

### `accountsChanged`

Triggered whenever accounts are updated (e.g. calling `connect` or `disconnect`).

```ts
window.near.wallet.on("accountsChanged", ({ accounts }) => {
  console.log("Accounts Changed", accounts);
});
```

### `networkChanged`

Triggered whenever the wallet changes network.

```ts
window.near.wallet.on("networkChanged", ({ network }) => {
  console.log("Network Changed", network);
});
```
