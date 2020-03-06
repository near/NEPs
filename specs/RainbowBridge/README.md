## Introduction

The Rainbow Bridge is represented by a family of smart contracts that implement light clients and arbitrary trustless actors who wish to forward necessary data between Near and Ethereum blockchains.

The API allows developers to:

- pass arbitrary data between smart contracts on different chains
- make arbitrary calls between smart contracts on different chains

The Rainbow Bridge vision (not available today) includes several other projects:

- a fully collateralized NEAR stable token available on the Ethereum network
- a fully collateralized ETH stable token available on the NEAR network
- smart contract based Ethereum proxy-accounts for NEAR users
- smart contract based NEAR proxy-accounts for Ethereum users

*The Rainbow Bridge can support any other blockchain for which these components are developed.*

## Architecture

```text
+-------------------------------+                 +-------------------------------+
|  NEAR Blockchain              |                 | Ethereum Blockchain           |
|                               |                 |                               |
|  .-------------.              |                 |              .-------------.  |
|  | .-------------.            |                 |            .-------------. |  |
|  '-| .-------------.          |                 |          .-------------. |-'  |
|    '-|  contracts  |      (A) |                 | (1)      |  contracts  |-'    |
|      '-----+-+-----'          |                 |          '-----+-+-----'      |
|            | |                |                 |                | |            |
|            \ /                |                 |                \ /            |
|  +----------------------+     |                 |     +----------------------+  |
|  |                      |     |                 |     |                      |  |
|  |   EthEventVerifier   | (B) |                 | (2) | NearTxResultVerifier |  |
|  |                      |     |                 |     |                      |  |
|  +-------------+-+------+     |                 |     +-----+-+--------------+  |
|                | |            |                 |           | |                 |
|                \ /            |                 |           \ /                 |
|          +--------------+     \                 |     +--------------+          |
|          |              |      o - NearRelay --------->              |          |
|          |              |     /                 |     |              |          |
|          |  EthClient   | (C) |                 | (3) |  NearClient  |          |
|          |              |     |                 /     |              |          |
|          |              <--------- EthRelay  - o      |              |          |
|          +--------------+     |                 \     +--------------+          |
|                               |                 |                               |
+-------------------------------+                 +-------------------------------+
```


### Use Cases

Please refer to the diagram above where (A), (B) and (C) appear to the left and (1), (2) and (3) appear the right.

#### Use Case A-B-C-B-A 

*NEAR smart contract must verify an event was recorded on the Ethereum blockchain*

- A contract running on the *NEAR blockchain* requires verifiable proof that an event has been recorded on the *Ethereum blockchain*.  
- The contract `(A)` invokes a method on the `EthEventVerifier` `(B)`, passing in the appropriate parameters to represent the event
- `EthEventVerifier` `(B)` unpacks the Ethereum event and extracts the related block header which it passes on to the `EthClient` `(C)`
- `EthClient` `(C)` returns a boolean indicating whether the block header was indeed recorded on the Ethereum blockchain
- `EthEventVerifier` `(B)` passes this result on to the contract `(A)` as proof or rejection of the event as valid

#### Use Case 1-2-3-2-1

*Ethereum smart contract must verify a transaction result was recorded on the NEAR blockchain*

- A contract running on the *Ethereum blockchain* requires verifiable proof that a transaction result has been recorded on the *NEAR blockchain*.  
- The contract `(1)` invokes a method on the `NearTxResultVerifier` `(2)`, passing in the appropriate parameters to represent the transaction result
- `NearTxResultVerifier` `(2)` unpacks the Near transaction result and extracts the related block header which it passes on to the `NearClient` `(3)`
- `NearClient` `(3)` returns a boolean indicating whether the block header was indeed recorded on the NEAR blockchain
- `NearTxResultVerifier` `(2)` passes this result on to the contract `(1)` as proof or rejection of the transaction result as valid

*In both cases, the light clients `EthClient` and `NearClient` are supported by arbitrary trustless actors (`EthRelay` and `NearRelay`) who wish to forward necessary data between Near and Ethereum blockchains, respectively.*


### Software

**Core Components**

Two smart contracts, `(C)` and `(3)` establish the baseline source of truth for blockchain activity on the "other" network.

- (C) `NearClient`- *smart contract hosted on **Ethereum** network*  \
   This contract is a NEAR light client that receives NEAR block headers.  It verifies and stores block hashes only.

- (3) `EthClient` – *smart contract hosted on the **NEAR** network*  \
   This contract is an Ethereum light client that receives Ethereum block headers.  It verifies ethash and longest chain rule and stores block hashes only.

**Reference Implementations**

Two smart contracts demonstrate what is possible using the Rainbow Bridge.  These contract are intended to be used as **reference material** for developing other contracts about various blockchain platforms. 

*A note about NEAR and Ethereum blockchains*

- At its core, NEAR is a sharded transaction processing engine which records *transaction results*.  These *transaction results* are a verifiable source of truth about the NEAR blockchain.
- At its core, Ethereum is single threaded computer which, at various points in time, records *events*.  These *events* are a verifiable source of truth about the Ethereum blockchain.

- `NearTxResultVerifier` - *smart contract on **Ethereum** network*   \
  This contract performs verification of **NEAR transaction results** that have been included into NEAR blocks. It uses Merkle trees and hash preimages for verification.

- `EthEventVerifier` - *smart contract on **NEAR** network*   \
  This contract performs verification of **Ethereum events** that have been included into Ethereum blocks. It uses Merkle trees and hash preimages for verification.

**Supporting Scripts**

- `NearRelay` - an arbitrary, trustless actor that forwards NEAR block headers to the `NearClient` smart contract which is hosted on the Ethereum network.
- `EthRelay` - an arbitrary, trustless actor that forwards Ethereum block headers to the `EthClient` smart contract which is hosted on the NEAR network.


## Setting up the Rainbow Bridge

1. clone the repo `git clone git@github.com:nearprotocol/near-bridge.git`
2. run `NearRelay` node script to do two things:
   - deploy `NearClient` contract (written in Solidity) to Ethereum network (note: just use ABI file to connect if the `NearClient` contract is already deployed)
   - start sending NEAR block headers to `NearClient` every 10 seconds
3. build and deploy `EthClient` contract (written in Rust and compiled to Wasm) to NEAR network
4. run `EthRelay` script to start sending Ethereum block headers to `EthClient` as often as they're available, at least once every 10 seconds

Now both networks have knowledge of one another

- Ethereum Network is queried by `EthRelay` at ~10s intervals for latest block headers.  `EthRelay` then sends this to `EthClient`, a contract deployed on the NEAR network
- NEAR network is queried by `NearRelay` at ~10s intervals for latest block headers.  `NearRelay` then sends this to `NearClient`, a contract deployed on the Ethereum network

As part of our development of the Rainbow Bridge framework, we have chosen something about each network (Ethereum and NEAR) which is as close to "ground truth" as possible. By this we mean some fact or detail about the network which establishes a baseline from which we can build up.  

For Ethereum we've selected **cryptographic proofs of events** on the Ethereum network.  This is called `EthEventVerifier`, a contract deployed on the NEAR network which can verifiably prove that an event occurred on the Ethereum network.  You could say this contract is available for use by any other contracts running on the **NEAR network** as an *Ethereum Event Oracle*.

For NEAR we've selected **cryptographic proofs of transaction execution results** on the NEAR network.  This is called `NearTxResultVerifier`, a contract deployed on the Ethereum network which can verifiably prove that a transaction was executed on the NEAR network.  You could say this contract is available for use by any other contracts running on the **Ethereum network** as a *Near Transaction Result Oracle*.

Once deployed, `EthEventVerifier` and `NearTxResultVerifier` are available for use by smart contracts operating in their respective environments.

## API

### EthClient

```rust
pub struct DoubleNodeWithMerkleProof {}
impl DoubleNodeWithMerkleProof {}
pub struct HeaderInfo {}

#[near_bindgen]
pub struct EthBridge {}
impl Default for EthBridge {}

#[near_bindgen]
impl EthBridge {
    pub fn init(validate_ethash: bool, dags_start_epoch: u64, dags_merkle_roots: Vec<H128>) -> Self {}
    pub fn apply_merkle_proof(&self, index: u64) -> H128 {}
    pub fn initialized(&self) -> bool {}
    pub fn last_block_number(&self) -> u64 {}
    pub fn dag_merkle_root(&self, epoch: u64) -> H128 {}
    pub fn block_hash(&self, index: u64) -> Option<H256> {}
    pub fn block_hash_safe(&self, index: u64) -> Option<H256> {}
    pub fn add_block_header(&mut self, block_header: Vec<u8>, dag_nodes: Vec<DoubleNodeWithMerkleProof>) {}
}
```


### NearClient

```java
contract NearBridge is Ownable {
    mapping(uint256 => bytes32) public blockHashes;
    function addBlockHeaders(bytes[] memory blockHeaders) public onlyOwner {}
}
```


### Usage

TODO


## Data Structures

### NEAR Blockchain

**Primitives**

*Please refer to [nearcore primitive types](https://github.com/nearprotocol/nearcore/blob/master/core/primitives/src/types.rs) for details*

```
Gas         u64
Nonce       u64
Balance     u128
AccountId   String
```

**Crypto**

*Please refer to [nearcore crypto signature](https://github.com/nearprotocol/nearcore/blob/master/core/crypto/src/signature.rs) for details*

```
struct CryptoHash([u8; 32])                                     Sha256 digest
struct MerkleHash(CryptoHash) 
struct EpochId(CryptoHash) 

enum PublicKey
    ED25519(sodiumoxide::crypto::sign::ed25519::PublicKey)      [u8; 32]
    SECP256K1(Secp256K1PublicKey)                               [u8; 64]


enum Signature
    ED25519(sodiumoxide::crypto::sign::ed25519::Signature)      [u8; 64]
    SECP256K1(Secp2561KSignature)                               [u8; 65]
```

**Block header**

*Please refer to [nearcore block primitives](https://github.com/nearprotocol/nearcore/blob/master/core/primitives/src/block.rs) for details*

```
struct ValidatorStake
    account_id              AccountId               Account that stakes money.
    public_key              PublicKey               Public key of the proposed validator.
    amount                  Balance                 Stake / weight of the validator.

struct BlockHeaderInner
    height                  u64                     Height of this block since the genesis block (height 0).
    epoch_id                EpochId                 Epoch start hash of this block's epoch. Used for retrieving validator information
    prev_hash               CryptoHash              Hash of the block previous to this in the chain.
    prev_state_root         MerkleHash              Root hash of the state at the previous block.
    tx_root                 MerkleHash              Root hash of the transactions in the given block.
    timestamp               u64                     Timestamp at which the block was built.
    approval_mask           Vec<bool>               Approval mask, given current block producers.
    approval_sigs           Vec<Signature>          Approval signatures for previous block.
    total_weight            Weight                  Total weight.
    validator_proposals     Vec<ValidatorStake>     Validator proposals.
    chunk_mask              Vec<bool>               Mask for new chunks included in the block
    gas_used                Gas                     Sum of gas used across all chunks.
    gas_limit               Gas                     Gas limit. Same for all chunks.
    gas_price               Balance                 Gas price. Same for all chunks
    total_supply            Balance 

struct BlockHeader
    inner                   BlockHeaderInner        Inner part of the block header that gets hashed.
    signature               Signature               Signature of the block producer.

```




**Transaction**

*Please refer to [nearcore transaction primitives](https://github.com/nearprotocol/nearcore/blob/master/core/primitives/src/transaction.rs) for details*

Access

```
struct FunctionCallPermission
    allowance               Option<Balance>
    receiver_id             AccountId
    method_names            Vec<String>


enum AccessKeyPermission
    FunctionCall(FunctionCallPermission)
    FullAccess


struct AccessKey
    nonce                   Nonce
    permission              AccessKeyPermission
```

Actions

```
struct CreateAccountAction

struct DeployContractAction
    code                    Vec<u8>


struct FunctionCallAction
    method_name             String
    args                    Vec<u8>
    gas                     Gas
    deposit                 Balance


struct TransferAction
    deposit                 Balance


struct StakeAction
    stake                   Balance
    public_key              PublicKey


struct AddKeyAction
    public_key              PublicKey
    access_key              AccessKey


struct DeleteKeyAction
    public_key              PublicKey


struct DeleteAccountAction
    beneficiary_id          AccountId
```

Transaction

```
enum Action
    CreateAccount(CreateAccountAction)
    DeployContract(DeployContractAction)
    FunctionCall(FunctionCallAction)
    Transfer(TransferAction)
    Stake(StakeAction)
    AddKey(AddKeyAction)
    DeleteKey(DeleteKeyAction)
    DeleteAccount(DeleteAccountAction)


struct Transaction
    signer_id               AccountId
    public_key              PublicKey
    nonce                   Nonce
    receiver_id             AccountId
    block_hash              CryptoHash              The hash of the block in the blockchain on top of which the given transaction is valid.

    actions                 Vec<Action>


struct SignedTransaction
    transaction             Transaction
    signature               Signature
```

**Transaction execution results**

*Please refer to [nearcore transaction primitives](https://github.com/nearprotocol/nearcore/blob/master/core/primitives/src/transaction.rs) for details*

```
enum TransactionStatus
    Unknown 
    Completed 
    Failed 


struct TransactionResult
    status                  TransactionStatus              Transaction status.
    logs                    Vec<LogEntry>                  Logs from this transaction.
    receipts                Vec<CryptoHash>                Receipt ids generated by this transaction.
    result                  Option<Vec<u8>>                Execution Result


struct TransactionLog
    hash                    CryptoHash                     Hash of a transaction or a receipt that generated this result.
    result                  TransactionResult 
```

**Final transaction result views**

```
enum FinalTransactionStatus
    Unknown 
    Started 
    Failed 
    Completed 


struct TransactionResultView
    status                  TransactionStatus 
    logs                    Vec<LogEntry> 
    receipts                Vec<CryptoHashView> 
    result                  Option<String> 


struct TransactionLogView
    hash                    CryptoHashView 
    result                  TransactionResultView 


struct FinalTransactionResult
    status                  FinalTransactionStatus         Status of the whole transaction and it's receipts.
    transactions            Vec<TransactionLogView>        Transaction results.

```

### Ethereum Blockchain

todo