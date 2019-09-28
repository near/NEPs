- Proposal Code Name: genesis_block
- Start Date: 2019-09-27
- NEP PR: [nearprotocol/neps#0000](https://github.com/nearprotocol/neps/pull/0000)

# Summary
[summary]: #summary

Genesis block will contain:
* Accounts and smart contracts required to describe the initial ownership, vesting schedule, and the lockup of the tokens;
* Economics config;
* Accounts from the testnet.

# Token ownership
We want Near investors and token holders to have their vesting schedule, lock up period and ability to stake to be implemented through the accounts and smart contracts on the blockchain.

Each token holder will have tokens that go through the following lifecycle:
* Unvested;
* Vested, but locked;
* Unlocked.

Vesting is done over several years with an optional cliff starting with:
* For employees -- employment date or blockchain initiation date, whichever is latest;
* For investors -- investment date.
* Everyone else -- a custom start date.

Non-standard vesting and lock up schedules can be later created by the NEAR Foundation foundation.

Lock up is applied to the token holder with 1 year starting with the mainnet launch. If token is vested before the lock up expires then it cannot be sold until the end of the lock up. If token is vested after the lock up then it can be sold immediately.

In case of employees the NEAR Foundation company can decide to terminate the employment and the person would lose the unvested tokens, however the lock period will still be applied to vested tokens.

# Design details
We create the following accounts and contracts:
* For each token holder we create an account and a contract;
* We create one account for NEAR Foundation.

## Token holder
Token holder gets a standard account that has a special contract and balance corresponding to all vested and unvested tokens.
The token holder person/entity gets one access key for this account, which allows to call the following functions:
* `stake(amount)`;
* `transfer(other_account_id, amount)`.

`stake(amount)` simply issues a staking transaction from the account. It is allowed to use all even unvested tokens for staking.

`transfer(other_account_id, amount)` can transfer vested locked tokens to a different account.

NEAR Foundation entity gets one access key for this account which allows to call these two functions:
* `permanently_unstake()`;
* `terminate()`.

These functions will panic if account is not an employee (internal boolean flag). Otherwise

`permanently_unstake()` will send unstaking transaction on behalf of the account and will switch the internal flag that will prohibit future calls to `stake(amount)`.

`terminate()` will take the remaining unvested balance and send it to the NEAR Foundation account.

This access key will also have a limited allowance to avoid NEAR Foundation calling it repeatedly to deplete the funds.

Note, that no one in the system will have a full access key to the token holder account.

Note, the contract will use the block timestamp to determine when the tokens are vested and locked.

## NEAR Foundation
NEAR Foundation will have a standard account with the balance of tokens that it has received from the foundation. The account will not have a contract deployed to it and there will only be one full access key given to it. It will have balance equal to the amount issued by the foundation minus all balances of the initial token holders.

# Implementation details
The contract for token holders is going to be implemented in Rust with the following features:
* We are not going to be using `near_bindgen`;
* The arguments will be decoded from the byte blob manually instead of using Borsh/JSON, like we do [here](https://github.com/nearprotocol/nearcore/blob/55e0333e51bc05909d21d8cbc25e8051e71b0c04/runtime/runtime/tests/tiny-contract-rs/src/lib.rs#L154);
* `no_std`;
* No collections that use allocation -- thus no allocator will be compiled in;
* No unofficial Wasm optimization tools that are not part of the Rust toolchain, e.g. no `wasm-opt`.

This will hopefully lead to a contract size of ~400 bytes and a very small surface for mistakes.

# Particularities
Token holder balance will also be used for storage rent and function call execution. As mentioned above the access key of the token holder account used by NEAR Foundation will have a limited allowance.

The storage rent will be obviously applied to the entire account, it is not essential whether vesting/locking computation is going to be done in such a manner that it reduces vested or unvested tokens.

Implementation of the token holder account should be robust to being slashes. In other words if token holder is getting slashes the smart contract
remains functional.


# Alternatives

We could deploy a contract to NEAR Foundation account and call `permanently_unstake` and `terminate` functions from it which in
turn would call the same functions on the Token Holder's account through promises, but there is no reason to do it, and it just makes the setup more complex.

We cannot really merge `permanently_unstake` and `terminate` into one function because unstaking takes time.

We could make account of Token Holder to be fully functional (e.g. by adding proxy function) but that would make it more
complex (since its balance structure is not trivial) and there is no real need to do so, since Token Holder can just move vested&unlocked balance to a different account and use it from there.


# Economics config

We are going to store economics config in a key-value pair not associated with any account and therefore not a subject
to storage rent. The key is going to be `ecfg` (notice that it is shorter than 5 characters and therefore not account can be
created on the top of it). The value is going to be a list of economics configs serialized with Borsh. We are going to use
`StateRecord::Data` to inject it into the trie.

Each economics config will have a version associated with it and the block index at which it kicks in.

Until we implement the governance mechanism NEAR Foundation account will be able to issue a special kind of transaction that overrides the key-value pair of the economics config.

