# Economics

## Units

| Name | Value |
| yoctoNEAR | smallest undividable amount of native currency *NEAR*. |
| NEAR | 1E+24 yoctoNEAR |
| block | unit of time, measured in block produced |

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
| `STORAGE_PRICE` | `7E-15` NEAR per byte per block | 
| `TREASURY_PCT` | `0.1` |
| `CONTRACT_PCT` | `0.3` |
| `INVALID_STATE_SLASH_PCT` | `0.05` |
| `ADJ_FEE` | `0.001` |

## General Variables

| Name | Description |
| - | - |
| `total_supply[t]` | Total supply of NEAR at given epoch[t] |
| `gasPrice` | The cost of 1 unit of *gas* in NEAR tokens (see Transaction Fees section below) |

## Issuance

The protocol sets a ceiling for the maximum issuance of tokens, and dynamically decreases this issuance depending on the amount of total fees in the system.

| Name | Description |
| - | - |
| `reward[t]` | `totalSupply[t]` * ((`1 - REWARD_PCT_PER_YEAR`) ^ `1/EPOCHS_A_YEAR` - `1`) |
| `issuance[t]` | The amount of token issued at a certain epoch[t], such that `issuance[t] = reward[t] - epochFee[t]` |

Where `totalSupply[t]` is the total number of tokens in the system at a given time *t*.
If `epochFee[t] > reward[t]` the issuance is negative, thus the `totalSupply[t]` decreases in given epoch.

## Transaction and Storage Fees

### Transaction Fees

| Name | Description |
| - | - |
| `epochFee[t]` | `sum([(1 - DEVELOPER_PCT_PER_YEAR) * txFee[i] + stateFee[i] for i in epoch[t]])`, where [i] represents any considered block within the epoch[t] |
| `txFee[i]` | Sum of the costs of computation and bandwidth of included transactions within the block[i] |
| `stateFee[i]` | The cost of storage paid to the nodes to maintain the state of the existing state at the block[i] |

Each transaction pays the cost for bandwidth, processing, and the cost for state storage over time:

| Name | Description |
| - | - |
| `gas[tx]` | 1 CPU instruction and 1 byte of bandwidth, such that: `CPU[tx]` + `$\alpha$` * `Size[tx]` |
| `gasPrice` | `= gasPrice * (1 + (gasUsed/gasLimit - 1/2) * ADJ_FEE`) |
| `gasUsed[i,s]` | Gas used in the shard[s] at index[i] |
| `gasLimit[i]` | Maximum amount of gas allowed at the block index[i], uniform across all shards |
| `ADJ_FEE` | the maximum variation of of `gasPrice` after each block, see in General Parameters the constant value |
| `minGasPrice` | The floor for gas price in NEAR |

Where `CPU[tx]` is represented as *numberOfCPUInstructions(tx)* and `Size[tx]` is represented as *SizeOf(tx)* on the white paper at section 4.1(4).

`gasPrice` is uniform across all shards, regardless of their actual usage. Block producers vote on a new `gasLimit` within `±ADJ_FEE` (0.1%) if block[i-1] has `gasUsed > 0.9 * gasLimit`.

### State Storage Rent

For each new block[i] created, each account is charged an amount of NEAR proportional to their storage footprint, commonly defined as *state rent*.
`storagePrice` is charged as soon as an account[a] issues a new transaction.

| Name | Description |
| - | - |
| `stateFee[i,a]` | The fees at block[i] payable by an account[a], such that: `stateFee[i,a] = storagePrice * size[a]` |
| `size[a]` | The size of a given account[a] in *bytes* |
| `storagePrice` | A constant fee, with a negligible cost for normal use. *This is subject to change in the future* |
| `storagePaidAt[h]` | The *state rent* paid from the account[a] at the most recent transaction stored in the block[h], used to calculate the accrued fees |
|  `current balance` | The current balance of the account[a] after the *state rent* is calculated, such that: `current balance = balance[a] - storagePrice * size[a] * (block[i] - storagePriceAt[h])`, where `storagePriceAt[h]` is updated to `storagePriceAt[i]` once the calculation is done |
| `minBalance[a]` | `pokeThreshold * storagePrice * size[a]` |


Where `minBalance`, once reached, enables anyone to send a special transaction, such that they will receive a `pokeReward` of the remaining account[a] balance.

Important caveats apply to the *state rent*:
1. If an account[a] brings `balance[a]` below `minBalance[a]` by either moving tokens or increasing size, transaction will fail and changes reverted
2. When account[a] is staking, if `minBalance[a] > 4 * epochLength * storagePrice * size[a]` is false, the `proposal` will not be accepted for a rollover in the next epoch (see below in the Validator section)

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
| `shard[v]` | The shard randomically assigned to validator[v] at epoch[T-1], such that its node can download and sync with its state |
| `numSeats` | Number of seats assigned to validator[v], calculated from stake[v]/seatPrice |
| `validatorAssignments` | The resulting ordered array of all `proposals` with a stake higher than `seatPrice` |

`validatorAssignments` is then split in two groups: block/chunk producers and 'hidden validators'


### Rewards Calculation

| Name | Value |
| - | - |
| `REWARD_FACTOR` | `0.05` |
| `ONLINE_THRESHOLD` | see above |

Total reward every epoch `t` is equal to:
```python
reward[t] = total_supply * ((1 + REWARD_FACTOR) ** (1 / EPOCHS_A_YEAR) - 1)
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
def end_of_epoch_update_validators(validators):
    # ...
    for validator in validators:
        if validator.is_slashed:
            validator.stake -= INVALID_STATE_SLASH_PCT * validator.stake
```

## Protocol Treasury

| Name | Value |
| - | - |
| `TREASURY_ACCOUNT_ID` | `treasury` |
| `TREASURY_PCT` | `0.01` |

Treasury account receives reward every epoch `t`:

```python
accounts[TREASURY_ACCOUNT_ID][t] = accounts[TREASURY_ACCOUNT_ID][t - 1] + TREASURY_PCT * reward[t]
```
