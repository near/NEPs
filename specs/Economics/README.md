# Economics

## General Parameters

| Name | Value |
| - | - |
| `INITIAL_SUPPLY` | `10**33` yoctoNEAR |
| `NEAR` | `10**24` yoctoNEAR |
| `REWARD_PCT_PER_YEAR` | `0.05` |
| `BLOCK_TIME` | `1` second |
| `EPOCH_LENGTH` | `43,200` blocks |
| `EPOCHS_A_YEAR` | `730` epochs |

Where *yoctoNear* is smallest undividable amount of native currency *NEAR*.

## Variables

| Name | Description |
| - | - |
| `total_supply` | Total supply of NEAR at given epoch |

## Transaction Fees



## Storage Rent

Storage rent is charged for every account.

## Validators


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

### Rewards

| Name | Value |
| - | - |
| `REWARD_FACTOR` | `0.05` |
| `ONLINE_THRESHOLD` | `0.9` |

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

## Protocol Treasury

| Name | Value |
| - | - |
| `TREASURY_ACCOUNT_ID` | `treasury` |
| `TREASURY_PCT` | `0.01` |

Treasury account receives reward every epoch `t`:

```python
treasury[t] = treasury[t - 1] + TREASURY_PCT * reward[t]
```
