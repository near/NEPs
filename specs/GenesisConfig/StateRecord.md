# StateRecord

Enum that describes one of the records in the state storage.

## Account

_type: Unnamed struct_

Record that contains account information for a given account ID.

### account_id

_type: AccountId_

The account ID of the account.

### account

_type: [AccountView]_

The account structure in JSON-friendly format. See [Account](../DataStructures/Account.md) for details.


## Data

_type: Unnamed struct_

Record that contains key-value data record for a contract at the given account ID.

### account_id

_type: AccountId_

The account ID of the contract that contains this data record.

### key

_type: String_

Key encoded in Base64 format.

_NOTE: Key doesn't contain the data separator._

### value

_type: String_

Value encoded in Base64 format.


## Contract

_type: Unnamed struct_

Record that contains a contract code for a given account ID.

### account_id

_type: AccountId_

The account ID of that has the contract.

### code

_type: String_

Base64 encoded contract code.


## AccessKey

_type: Unnamed struct_

Record that contains an access key for a given account ID.

### account_id

_type: AccountId_

The account ID of the access key owner.

### public_key

_type: [PublicKey]_

The public key for the access key in JSON-friendly string format. E.g. `ed25519:5JFfXMziKaotyFM1t4hfzuwh8GZMYCiKHfqw1gTEWMYT`

### access_key

_type: [AccessKeyView]_

The access key in JSON-friendly string format. See [AccessKey](../DataStructures/AccessKey.md) for details.


## PostponedReceipt

_type: Box<[ReceiptView]>_

Record that contains information about a receipt that was postponed on a shard (e.g. it's waiting for incoming data).
The receipt is in JSON-friendly format. The receipt can only be an `ActionReceipt`. See [Receipts](../RuntimeSpec/Receipts.md) for details.

NOTE: Box is used to decrease fixed size of the entire enum.


## ReceivedData

_type: Unnamed struct_

Record that contains information about received data for some action receipt, that is not yet received or processed for a given account ID.
The data is received using `DataReceipt` before. See [Receipts](../RuntimeSpec/Receipts.md) for details.

### account_id

_type: AccountId_

The account ID of the receiver of the data.

### data_id

_type: [CryptoHash]_

Data ID of the data in base58 format.

### data

_type: Option\<Vec\<u8\>\>_

Optional data encoded as base64 format or null in JSON.



