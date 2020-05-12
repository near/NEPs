# Upgradability

This part of specification describes specifics of upgrading the protocol, and touches on few different parts of the system.

High level upgradability consists of three parts:
1. Updating without any changes to underlaying data structures or protocol;
2. Updating when underlaying data structures changed (config, database or something else internal to the node and probably client specific);
3. Updating with protocol changes that all validating nodes must adjust to.

## Versioning

There are 2 different important versions:
- Version of binary defines it's internal data structures / database and configs. This version is client specific and doesn't need to be matching between nodes.
- Version of the protocol, defining the "language" nodes are speaking.

```rust
/// Latest version of protocol that this binary can work with.
type ProtocolVersion = u32;
```

Open questions: do we want to use something better than a number of versioning protocol?
Ideally it should be some hash of protocol spec that this binary supports, but we don't have a canonical protocol spec versioning yet. We can use commit hash of `spec` / `NEPs` repo.

## Client versioning

Clients should follow [semantic versioning](https://semver.org/).
Specifically:
 - MAJOR version defines protocol releases.
 - MINOR version defines changes that are client specific but require database migration, change of config or something similar. This includes client-specific features. Client should execute migrations on start, by detecting that information on disk is produced by previous version and auto-migrate it to new one.
  - PATCH version defines when bug fixes, which should not require migrations or protocol changes.

Clients can define how current version of data is stored and migrations applied.
General recommendation is to store version in the database and on binary start, check version of database and perform required migrations.

## Protocol Upgrade

### Block structure

```rust
struct BlockHeaderInnerRest {
    ...
    version: ProtocolVersion,
}
```

Each validator when producing block includes latest version their node supports.

### Consensus

| Name | Value |
| - | - |
| `PROTOCOL_UPGRADE_BLOCK_THRESHOLD` | `80%` |

The condition to switch to next protocol version is based on % of blocks in previous epoch:

```python
def next_epoch_protocol_version(last_block):
    """Determines next epoch's protocol version given last block."""
    epoch_info = epoch_manager.get_epoch_info(last_block)
    versions = collections.defaultdict(0)
    # Iterate over all blocks in previous epoch and collect which versions it had.
    for block in epoch_info:
        versions[block.version] += 1
    # Sort by frequency and take first one.
    most_frequent = sorted(versions.items(), key=lambda x: -x[1])[0]
    # Return most frequent if the frequency is above threshold.
    if most_frequent[1] > PROTOCOL_UPGRADE_BLOCK_THRESHOLD * epoch_info.num_blocks:
        return most_frequent[0]
    # Otherwise return version that was used in previous epoch.
    return epoch_info.version
```
