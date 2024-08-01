# Injected Wallets

## Summary

Standard interface for injected wallets.

## Motivation

dApps are finding it increasingly difficult to support the ever expanding choice of wallets due to their wildly different implementations. While projects such as [Wallet Selector](https://github.com/near/wallet-selector) attempt to mask this problem, it's clear the ecosystem requires a standard that will not only benefit dApps but make it easier for established wallets to support NEAR.

## Rationale and alternatives

At its most basic, a wallet contains key pairs required to sign messages. This standard aims to define an API (based on our learning from [Wallet Selector](https://github.com/near/wallet-selector)) that achieves this requirement through a number of methods exposed on the `window` object.

The introduction of this standard makes it possible for `near-api-js` to become wallet-agnostic and eventually move away from the high amount of coupling with NEAR Wallet. It simplifies projects such as [Wallet Selector](https://github.com/near/wallet-selector) that must implement various abstractions to normalise the different APIs before it can display a modal for selecting a wallet.

This standard takes a different approach to a wallet API than other blockchains such as [Ethereum's JSON-RPC Methods](https://docs.metamask.io/guide/rpc-api.html#ethereum-json-rpc-methods). Mainly, it rejects the `request` abstraction that feels unnecessary and only adds to the complexity both in terms of implementation and types. Instead, it exposes various methods directly on the top-level object that also improves discoverability.

There have been many iterations of this standard to help inform what we consider the "best" approach right now for NEAR. Below is a summary of the key design choices:

### Single account vs. multiple account

Almost every wallet implementation in NEAR used a single account model until we began integrating with [WalletConnect](https://walletconnect.com/). In WalletConnect, sessions can contain any number of accounts that can be modified by the dApp or wallet. The decision to use a multiple account model was influenced by the following reasons:

- It future-proofs the API even if wallets (such as MetaMask) only support a single "active" account.
- Other blockchains such as [Ethereum](https://docs.metamask.io/guide/rpc-api.html#eth-requestaccounts) implement this model.
- Access to multiple accounts allow dApps more freedom to improve UX as users can seamlessly switch between accounts.
- Aligns with WalletConnect via the [Bridge Wallet Standard](./BridgeWallets.md).

### Storage of key pairs for FunctionCall access keys in dApp context vs. wallet context

- NEAR's unique concept of `FunctionCall` access keys allow for the concept of 'signing in' to a dApp using your wallet. 'Signing In' to a dApp is accomplished by adding `FunctionCall` type access key that the dApp owns to the account that the user is logging in as.
- Once a user has 'signed in' to a dApp, the dApp can then use the keypair that it owns to execute transactions without having to prompt the user to route and approve those transactions through their wallet.
- `FunctionCall` access keys have a limited quota that can only be used to pay for gas fees (typically 0.25 NEAR) and can further be restricted to only be allowed to call _specific methods_ on one **specific** smart contract.
- This allows for an ideal user experience for dApps that require small gas-only transactions regularly while in use. Those transactions can be done without interrupting the user experience by requiring them to be approved through their wallet. A great example of this is evident in gaming use-cases -- take a gaming dApp where some interactions the user makes must write to the blockchain as they do common actions in the game world. Without the 'sign in' concept that provides the dApp with its own limited usage key, the user might be constantly interrupted by needing to approve transactions on their wallet as they perform common actions. If a player has their account secured with a ledger, the gameplay experience would be constantly interrupted by prompts to approve transactions on their ledger device! With the 'sign in' concept, the user will only intermittently need to approve transactions to re-sign-in, when the quota that they approved for gas usage during their last login has been used up.
- Generally, it is recommended to only keep `FullAccess` keys in wallet scope and hidden from the dApp consumer. `FunctionCall` type keys should be generated and owned by the dApp, and requested to be added using the `signIn` method. They should **not** be 'hidden' inside the wallet in the way that `FullAccess` type keys are.

## Specification

Injected wallets are typically browser extensions that implement the `Wallet` API (see below). References to the currently available wallets are tracked on the `window` object. To avoid namespace collisions and easily detect when they're available, wallets must mount under their own key of the object `window.near` (e.g. `window.near.sender`).
**NOTE: Do not replace the entire `window.near` object with your wallet implementation, or add any objects as properties of the `window.near` object that do not conform to the Injected Wallet Standard**

At the core of a wallet are [`signTransaction`](#signtransaction) and [`signTransactions`](#signtransactions). These methods, when given a [`TransactionOptions`](#wallet-api) instance, will prompt the user to sign with a key pair previously imported (with the assumption it has [`FullAccess`](https://nomicon.io/DataStructures/AccessKey) permission).

In most cases, a dApp will need a reference to an account and associated public key to construct a [`Transaction`](https://nomicon.io/RuntimeSpec/Transactions). The [`connect`](#connect) method helps solve this issue by prompting the user to select one or more accounts they would like to make visible to the dApp. When at least one account is visible, the wallet considers the dApp [`connected`](#connected) and they can access a list of [`accounts`](#accounts) containing an `accountId` and `publicKey`.

For dApps that often sign gas-only transactions, [`FunctionCall`](https://nomicon.io/DataStructures/AccessKey#accesskeypermissionfunctioncall) access keys can be added/deleted for one or more accounts using the [`signIn`](#signin) and [`signOut`](#signout) methods. While this functionality could be achieved with [`signTransactions`](#signtransactions), it suggests a direct intention that a user wishes to sign in/out of a dApp's smart contract.

### Wallet API

Below is the entire API for injected wallets. It makes use of `near-api-js` to enable interoperability with dApps that will already use it for constructing transactions and communicating with RPC endpoints.

```ts
import { transactions, utils } from "near-api-js";

interface Account {
  accountId: string;
  publicKey: utils.PublicKey;
}

interface Network {
  networkId: string;
  nodeUrl: string;
}

interface SignInParams {
  permission: transactions.FunctionCallPermission;
  account: Account;
}

interface SignInMultiParams {
  permissions: Array<transactions.FunctionCallPermission>;
  account: Account;
}

interface SignOutParams {
  accounts: Array<Account>;
}

interface TransactionOptions {
  receiverId: string;
  actions: Array<transactions.Action>;
  signerId?: string;
}

interface SignTransactionParams {
  transaction: TransactionOptions;
}

interface SignTransactionsParams {
  transactions: Array<TransactionOptions>;
}

interface Events {
  accountsChanged: { accounts: Array<Account> };
}

interface ConnectParams {
  networkId: string;
}

type Unsubscribe = () => void;

interface Wallet {
  id: string;
  connected: boolean;
  network: Network;
  accounts: Array<Account>;

  supportsNetwork(networkId: string): Promise<boolean>;
  connect(params: ConnectParams): Promise<Array<Account>>;
  signIn(params: SignInParams): Promise<void>;
  signInMulti(params: SignInMultiParams): Promise<void>;
  signOut(params: SignOutParams): Promise<void>;
  signTransaction(
    params: SignTransactionParams
  ): Promise<transactions.SignedTransaction>;
  signTransactions(
    params: SignTransactionsParams
  ): Promise<Array<transactions.SignedTransaction>>;
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

#### Properties

##### `id`

Retrieve the wallet's unique identifier.

```ts
const { id } = window.near.wallet;

console.log(id); // "wallet"
```

##### `connected`

Determine whether we're already connected to the wallet and have visibility of at least one account.

```ts
const { connected } = window.near.wallet;

console.log(connected); // true
```

##### `network`

Retrieve the currently selected network.

```ts
const { network } = window.near.wallet;

console.log(network); // { networkId: "testnet", nodeUrl: "https://rpc.testnet.near.org" }
```

##### `accounts`

Retrieve all accounts visible to the dApp.

```ts
const { accounts } = window.near.wallet;

console.log(accounts); // [{ accountId: "test.testnet", publicKey: PublicKey }]
```

#### Methods

##### `connect`

Request visibility for one or more accounts from the wallet. This should explicitly prompt the user to select from their list of imported accounts. dApps can use the `accounts` property once connected to retrieve the list of visible accounts.

> Note: Calling this method when already connected will allow users to modify their selection, triggering the 'accountsChanged' event.

```ts
const accounts = await window.near.wallet.connect();
```

##### `signTransaction`

Sign a transaction. This request should require explicit approval from the user.

```ts
import { transactions, providers, utils } from "near-api-js";

// Retrieve accounts (assuming already connected) and current network.
const { network, accounts } = window.near.wallet;

// Setup RPC to retrieve transaction-related prerequisites.
const provider = new providers.JsonRpcProvider({ url: network.nodeUrl });

const signedTx = await window.near.wallet.signTransaction({
  transaction: {
    signerId: accounts[0].accountId,
    receiverId: "guest-book.testnet",
    actions: [
      transactions.functionCall(
        "addMessage",
        { text: "Hello World!" },
        utils.format.parseNearAmount("0.00000000003"),
        utils.format.parseNearAmount("0.01")
      ),
    ],
  },
});
// Send the transaction to the blockchain.
await provider.sendTransaction(signedTx);
```

##### `signTransactions`

Sign a list of transactions. This request should require explicit approval from the user.

```ts
import { transactions, providers, utils } from "near-api-js";

// Retrieve accounts (assuming already connected) and current network.
const { network, accounts } = window.near.wallet;

// Setup RPC to retrieve transaction-related prerequisites.
const provider = new providers.JsonRpcProvider({ url: network.nodeUrl });

const signedTxs = await window.near.wallet.signTransactions({
  transactions: [
    {
      signerId: accounts[0].accountId,
      receiverId: "guest-book.testnet",
      actions: [
        transactions.functionCall(
          "addMessage",
          { text: "Hello World! (1/2)" },
          utils.format.parseNearAmount("0.00000000003"),
          utils.format.parseNearAmount("0.01")
        ),
      ],
    },
    {
      signerId: accounts[0].accountId,
      receiverId: "guest-book.testnet",
      actions: [
        transactions.functionCall(
          "addMessage",
          { text: "Hello World! (2/2)" },
          utils.format.parseNearAmount("0.00000000003"),
          utils.format.parseNearAmount("0.01")
        ),
      ],
    },
  ],
});

for (let i = 0; i < signedTxs.length; i += 1) {
  const signedTx = signedTxs[i];

  // Send the transaction to the blockchain.
  await provider.sendTransaction(signedTx);
}
```

##### `disconnect`

Remove visibility of all accounts from the wallet.

```ts
await window.near.wallet.disconnect();
```

##### `signIn`

Add one `FunctionCall` access key for one or more accounts. This request should require explicit approval from the user.

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
  account: {
    accountId: accounts[0].accountId,
    publicKey: utils.KeyPair.fromRandom("ed25519").getPublicKey(),
  },
});
```

##### `signInMulti`

Add multiple `FunctionCall` access keys for one or more accounts. This request should require explicit approval from the user.

```ts
import { utils } from "near-api-js";

// Retrieve the list of accounts we have visibility of.
const { accounts } = window.near.wallet;

// Request FunctionCall access to the 'guest-book.testnet' and 'guest-book2.testnet' smart contract for each account.
await window.near.wallet.signInMulti({
  permissions: [
    {
      receiverId: "guest-book.testnet",
      methodNames: [],
    },
    {
      receiverId: "guest-book2.testnet",
      methodNames: [],
    },
  ],
  account: {
    accountId: accounts[0].accountId,
    publicKey: utils.KeyPair.fromRandom("ed25519").getPublicKey(),
  },
});
```

##### Benefits

This NEP will optimize UX for multi contract DApps and avoid multiple redirects. These are more and more common in the ecosystem and this NEP will benefit the UX for those DApps.

##### Concerns

- The currently available keystores will have to catch up in order to support multiple keys per account
- We should add the new method to the Wallet interface for clarity in the NEP doc

##### `signOut`

Delete `FunctionCall` access key(s) for one or more accounts. This request should require explicit approval from the user.

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
        publicKey: keyPair.getPublicKey(),
      };
    })
  ),
});
```

#### Events

##### `accountsChanged`

Triggered whenever accounts are updated (e.g. calling `connect` or `disconnect`).

```ts
window.near.wallet.on("accountsChanged", ({ accounts }) => {
  console.log("Accounts Changed", accounts);
});
```
