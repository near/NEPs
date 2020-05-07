# Transactions

A transaction in Near is a list of [actions](Actions.md) and additional information:

```rust
pub struct Transaction {
    /// An account on which behalf transaction is signed
    pub signer_id: AccountId,
    /// An access key which was used to sign a transaction
    pub public_key: PublicKey,
    /// Nonce is used to determine order of transaction in the pool.
    /// It increments for a combination of `signer_id` and `public_key`
    pub nonce: Nonce,
    /// Receiver account for this transaction. If
    pub receiver_id: AccountId,
    /// The hash of the block in the blockchain on top of which the given transaction is valid
    pub block_hash: CryptoHash,
    /// A list of actions to be applied
    pub actions: Vec<Action>,
}
```

## Signed Transaction

`SignedTransaction` is what the node receives from a wallet through JSON-RPC endpoint and then routed to the shard where `receiver_id` account lives. Signature proves an ownership of the corresponding `public_key` (which is an AccessKey for a particular account) as well as authenticity of the transaction itself.

```rust
pub struct SignedTransaction {
    pub transaction: Transaction,
    /// A signature of a hash of the Borsh-serialized Transaction
    pub signature: Signature,
```

Take a look some [scenarios](Scenarios/Scenarios.md) how transaction can be applied.

