# ExtCostsConfig

## base
_type: Gas_

Base cost for calling a host function.

## read_memory_base
_type: Gas_

Base cost for guest memory read

## read_memory_byte
_type: Gas_

Cost for guest memory read

## write_memory_base
_type: Gas_

Base cost for guest memory write

## write_memory_byte
_type: Gas_

Cost for guest memory write per byte

## read_register_base
_type: Gas_

Base cost for reading from register

## read_register_byte
_type: Gas_

Cost for reading byte from register

## write_register_base
_type: Gas_

Base cost for writing into register

## write_register_byte
_type: Gas_

Cost for writing byte into register

## utf8_decoding_base
_type: Gas_

Base cost of decoding utf8.

## utf8_decoding_byte
_type: Gas_

Cost per bye of decoding utf8.

## utf16_decoding_base
_type: Gas_

Base cost of decoding utf16.

## utf16_decoding_byte
_type: Gas_

Cost per bye of decoding utf16.

## sha256_base
_type: Gas_

Cost of getting sha256 base

## sha256_byte
_type: Gas_

Cost of getting sha256 per byte

## keccak256_base
_type: Gas_

Cost of getting keccak256 base

## keccak256_byte
_type: Gas_

Cost of getting keccak256 per byte

## keccak512_base
_type: Gas_

Cost of getting keccak512 base

## keccak512_byte
_type: Gas_

Cost of getting keccak512 per byte

## log_base
_type: Gas_

Cost for calling logging.

## log_byte
_type: Gas_

Cost for logging per byte

## Storage API

### storage_write_base
_type: Gas_

Storage trie write key base cost

### storage_write_key_byte
_type: Gas_

Storage trie write key per byte cost

### storage_write_value_byte
_type: Gas_

Storage trie write value per byte cost

### storage_write_evicted_byte
_type: Gas_

Storage trie write cost per byte of evicted value.

### storage_read_base
_type: Gas_

Storage trie read key base cost

### storage_read_key_byte
_type: Gas_

Storage trie read key per byte cost

### storage_read_value_byte
_type: Gas_

Storage trie read value cost per byte cost

### storage_remove_base
_type: Gas_

Remove key from trie base cost

### storage_remove_key_byte
_type: Gas_

Remove key from trie per byte cost

### storage_remove_ret_value_byte
_type: Gas_

Remove key from trie ret value byte cost

### storage_has_key_base
_type: Gas_

Storage trie check for key existence cost base

### storage_has_key_byte
_type: Gas_

Storage trie check for key existence per key byte

### storage_iter_create_prefix_base
_type: Gas_

Create trie prefix iterator cost base

### storage_iter_create_prefix_byte
_type: Gas_

Create trie prefix iterator cost per byte.

### storage_iter_create_range_base
_type: Gas_

Create trie range iterator cost base

### storage_iter_create_from_byte
_type: Gas_

Create trie range iterator cost per byte of from key.

### storage_iter_create_to_byte
_type: Gas_

Create trie range iterator cost per byte of to key.

### storage_iter_next_base
_type: Gas_

Trie iterator per key base cost

### storage_iter_next_key_byte
_type: Gas_

Trie iterator next key byte cost

### storage_iter_next_value_byte
_type: Gas_

Trie iterator next key byte cost

### touching_trie_node
_type: Gas_

Cost per touched trie node

## Promise API

### promise_and_base
_type: Gas_

Cost for calling promise_and

### promise_and_per_promise
_type: Gas_

Cost for calling promise_and for each promise

### promise_return
_type: Gas_

Cost for calling promise_return
