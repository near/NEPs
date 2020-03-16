# Economics

**This is under heavy development**

## Units

| Name | Value |
| - | - |
| yoctoNEAR | smallest undividable amount of native currency *NEAR*. |
| NEAR | `10**24` yoctoNEAR |
| block | smallest on-chain unit of time |
| gas | unit to measure usage of blockchain |

## General Parameters

| Name | Value |
| - | - |
| `INITIAL_SUPPLY` | `10**33` yoctoNEAR |
| `NEAR` | `10**24` yoctoNEAR |
| `REWARD_PCT_PER_YEAR` | `0.05` |
| `BLOCK_TIME` | `1` second |
| `EPOCH_LENGTH` | `43,200` blocks |
| `EPOCHS_A_YEAR` | `730` epochs |
| `POKE_THRESHOLD` | `500` blocks |
| `STORAGE_AMOUNT_PER_BYTE` | `7E-5` NEAR per byte | 
| `TREASURY_PCT` | `0.1` |
| `CONTRACT_PCT` | `0.3` |
| `INVALID_STATE_SLASH_PCT` | `0.05` |
| `ADJ_FEE` | `0.001` |
| `TREASURY_ACCOUNT_ID` | `treasury` |
| `TREASURY_PCT` | `0.01` |

## General Variables

| Name | Description |
| - | - |
| `total_supply[t]` | Total supply of NEAR at given epoch[t] |
| `gasPrice` | The cost of 1 unit of *gas* in NEAR tokens (see Transaction Fees section below) |

## Issuance

The protocol sets a ceiling for the maximum issuance of tokens, and dynamically decreases this issuance depending on the amount of total fees in the system.

| Name | Description |
| - | - |
| `reward[t]` | `totalSupply[t]` * ((`1 - REWARD_PCT_PER_YEAR`) ** (`1/EPOCHS_A_YEAR`) - `1`) |
| `epochFee[t]` | `sum([(1 - DEVELOPER_PCT_PER_YEAR) * block.txFee + block.stateFee for block in epoch[t]])` |
| `issuance[t]` | The amount of token issued at a certain epoch[t], `issuance[t] = reward[t] - epochFee[t]` |

Where `totalSupply[t]` is the total number of tokens in the system at a given time *t*.
If `epochFee[t] > reward[t]` the issuance is negative, thus the `totalSupply[t]` decreases in given epoch.

## Transaction Fees

Each transaction before inclusion must buy gas enough to cover the cost of bandwidth and execution.

Gas unifies execution and bytes of bandwidth usage of blockchain. Each WASM instruction or pre-compiled function gets assigned an amount of gas based on measurements on common-denominator computer. Same goes for weighting the used bandwidth based on general unified costs. For specific gas mapping numbers see [???]().

Gas is priced dynamically in `NEAR` tokens. At each block `t`, we update `gasPrice[t] = gasPrice[t - 1] * (gasUsed[t - 1] / gasLimit[t - 1] - 0.5) * ADJ_FEE`.

Where `gasUsed[t] = sum([sum([gas(tx) for tx in chunk]) for chunk in block[t]])`.
`gasLimit[t]` is defined as `gasLimit[t] = gasLimit[t - 1] + validatorGasDiff[t - 1]`, where `validatorGasDiff` is parameter with which each chunk producer can either increase or decrease gas limit based on how long it to execute the previous chunk. `validatorGasDiff[t]` can be only within `±0.1%` of `gasLimit[t]` and only if `gasUsed[t - 1] > 0.9 * gasLimit[t - 1]`.

## State Stake

Amount of `NEAR` on the account represents right for this account to take portion of the blockchain's overall global state.

At every block time, each account is charged an amount of `NEAR` tokens proportional to their storage footprint, commonly defined as *state rent*.

```python
# After account touched / changed, we check it still has enough balance to cover it's storage.
def on_account_change(block_height, account):
    # Compute requiredAmount given size of the account.
    requiredAmount = sizeOf(account) * storageAmountPerByte
    if account.amount + account.lock < requiredAmount:
        assert "Transaction fails due to not enough balance to cover state stake"
```

Where `sizeOf(account)` includes size of `account` structure and size of all the data stored under the account.

## Validators

NEAR validators provide their resources in exchange for a reward `epochReward[t]`, where [t] represents the considered epoch

| Name | Description |
| - | - |
| `epochReward[t]` | `= coinbaseReward[t] + epochFee[t]` |
| `coinbaseReward[t]` | The maximum inflation per epoch[t], as a function of `REWARD_PCT_PER_YEAR / EPOCHS_A_YEAR` |


### Validator Selection

| Name | Description |
| - | - |
| `proposals` | The array of all existing validators, minus the ones which were online less than `ONLINE_THRESHOLD`, plus new validators |
| `INCLUSION_FEE` | The arbitrary transaction fee that new validators offer to be included in the `proposals`, to mitigate censorship risks by existing validators |
| `ONLINE_THRESHOLD` | `0.9` |
| `epoch[T]` | The epoch when validator[v] is selected from the `proposals` auction array |
| `seatPrice` | The minimum stake needed to become validator in epoch[T] |
| `stake[v]` | The amount in NEAR tokens staked by validator[v] during the auction at the end of epoch[T-2], minus `INCLUSION_FEE` |
| `shard[v]` | The shard is randomly assigned to validator[v] at epoch[T-1], such that its node can download and sync with its state |
| `numSeats` | Number of seats assigned to validator[v], calculated from stake[v]/seatPrice |
| `validatorAssignments` | The resulting ordered array of all `proposals` with a stake higher than `seatPrice` |

`validatorAssignments` is then split in two groups: block/chunk producers and 'hidden validators'


### Rewards Calculation

| Name | Value |
| - | - |
| `epochFee[t]` | `sum([(1 - DEVELOPER_PCT_PER_YEAR) * txFee[i] + stateFee[i] for i in epoch[t]])`, where [i] represents any considered block within the epoch[t] |

Total reward every epoch `t` is equal to:
```python
reward[t] = total_supply * ((1 + REWARD_PCT_PER_YEAR) ** (1 / EPOCHS_A_YEAR) - 1)
```

Uptime of a specific validator is computed:

```python
median_produced_blocks[t] = median(num_produced_blocks[t])

pct_produced_blocks[t][j] = num_produced_blocks[t][j] * median_produced_blocks[t]
if pct_produced_blocks > ONLINE_THRESHOLD:
    uptime[t][j] = (pct_produced_blocks[t][j] - ONLINE_THRESHOLD) / (1 - ONLINE_THRESHOLD)
else:
    uptime[t][j] = 0
```

The specific `validator[t]` reward for epoch `j` is then computed:

```python
validator[t][j] = uptime[t][j] * reward[t] / total_seats * seats[j]
```

### Slashing

#### Block Double Sign

```python
# Check if given two blocks headers have the same height and 
# are valid (signed by the same validator).
def block_double_sign_condition(header1, header2):
    return valid_header(header1) and valid_header(heade2) and header1.height == header2.height

# At the end of the epoch, run update validators and 
# determine how much to slash validators.
def end_of_epoch_update_validators(validators):
    # ...
    total_stake = 0
    total_offended_stake = 0
    for validator in validators:
        total_stake += validator.stake
        if validator.is_slashed:
            total_offended_stake += validator.stake
    for validator in validators:
        if validator.is_slashed:
            validator.stake -= validator.stake * 3 * total_offended_stake / total_stake
```

#### ChunkProofs

```python
# Check that chunk is invalid, because the proofs in header don't match the body.
def chunk_proofs_condition(chunk):
    # TODO

# At the end of the epoch, run update validators and
# determine how much to slash validators.
def end_of_epoch_update_validators(validators):
    # ...
    for validator in validators:
        if validator.is_slashed:
            validator.stake -= INVALID_STATE_SLASH_PCT * validator.stake
```

#### ChunkState

```python
# Check that chunk header post state root is invalid, 
# because the execution of previous chunk doesn't lead to it.
def chunk_state_condition(prev_chunk, prev_state, chunk_header):
    # TODO

# At the end of the epoch, run update validators and
# determine how much to slash validators.
def end_of_epoch(..., validators):
    # ...
    for validator in validators:
        if validator.is_slashed:
            validator.stake -= INVALID_STATE_SLASH_PCT * validator.stake
```

## Protocol Treasury

Treasury account `TREASURY_ACCOUNT_ID` receives fraction of reward every epoch `t`:

```python
# At the end of the epoch, update treasury
def end_of_epoch(..., reward):
    # ...
    accounts[TREASURY_ACCOUNT_ID].amount = TREASURY_PCT * reward
```
