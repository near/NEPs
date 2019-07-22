- Proposal Name: `account_name_system`
- Start Date: 2019-07-21
- NEP PR: [nearprotocol/neps#0000](https://github.com/nearprotocol/neps/pull/0000)

# Summary
[summary]: #summary

The Account Name System is a hierarchical and decentralized naming system for accounts, contracts and applications running on the NEAR blockchain.
It describes rules with which a new account names can be registered.

# Motivation
[motivation]: #motivation

NEAR uses readable account names for easier access to accounts and applications. 
On the other hand this creates a problem of squatting names as well as possible issues with known names be taken by fraudulent entities.

The ANS follows ideas in DNS, where top authority only needs to decide on registering top level domains and the rest is done by domain registrars.
In this document we will describe rules for top level account names (TLAs) and enumerate few possible designs for sub-registrars that can run on TLAs.

Result of this design should be implemented on the runtime level of the NEAR protocol for TLA registration.

# Guide-level explanation
[guide-level-explanation]: #guide-level-explanation

`CreateAccount` transaction type should contain next fields:
```protobuf
message CreateAccountTransaction {
    /// Nonce of the given transaction for originator's access key.
    uint64 nonce = 1;
    /// Originator's account id.
    string originator_id = 2;
    /// New account's id.
    string new_account_id = 3;
    /// Amount of money to allocate on the new account.
    Uint128 amount = 4;
    /// Code to deploy at the given account.
    bytes code = 5;
    /// Access keys to attach to given account
    repeated AccessKey access_keys = 6;
}
```

Here, important to note that `CreateAccount` is created by some other account. 

The next rules apply for relationship between `originator_id` and `new_account_id`:

- `new_account_id` can only contain characters from the [a-z0-9@._-] set. And be 5-32 characters long.
- If `new_account_id` is suppose to be TLA, it can not contain any separators (e.g. `@._-`).
- If `new_account_id` is not suppose to be TLA, it's suffix must contain `'.' + originator_id`. For example, if `originator_id` is `'com'`, then this account can register `google.com` or `facebook.com` but can not register `googlecom` or `facebook@com`.

Because TLAs are important as backbone of naming system, we require that `CreateAccount` transaction that creates TLA domain attach an extra `X` NEAR tokens which will be burned by the system. Where `X` is the function of length of the TLA name.

We can also describe for example an account name registrars that operates only via smart contract (vs a user facing registrars like wallets and exchanges). For example a `com` TLA can be contract based registrars that requires some extra payment can now provide service to users to register sub-names at this TLA via next contract:

```rust
impl DomainRegistrar {
    /// Call createAccount method with desired name, code and access keys, plus attach the extra payment to register a sub-account under this registrar.
    pub fn createAccount(&mut self, account_id: string, code: Vec<u8>, access_keys: Vec<AccessKey>) {
        // Check that amount sent is above required cost and withdraw it.
        assert!(ENV.amount > ACCOUNT_NAME_COST);
        ENV.withdraw(ACCOUNT_NAME_COST);
        // Because runtime will validate that this name is not taken as well as other required things, we can just proxy it there. The rest of the amount in the transaction will be deposited there.
        ENV.create_account(account_id, code, access_keys);
    }
}
```

Note, that if you want to allow sub-sub account registrars, you must implement this logic yourself. For example by dis-allowing names with separators.

We can also expect some registrars to consume data from Oracles to provide some form of identity to the names. For example `com` can actually only register names that are proved to be real domains via an oracle.

Now user can use their existing account provided by wallet to register an account under specific sub-account. We also expect that more often it will be developers who register specific names for their applications.

# Reference-level explanation
[reference-level-explanation]: #reference-level-explanation

Next changes must be made:
- Change `CreateTransaction` format to described above,
- `System` call `create_account` now must check that rules described above,
- Expose `create_account` pre-compile in WASM runtime, to allow for sub-registrars.
- Define price for registration of TLAs based on the name.
- Do initial TLA creation at genesis block

# Drawbacks
[drawbacks]: #drawbacks

There may be issues with ppl squatting TLAs by just getting them at the beginning of the protocol when prices will be naturally cheaper. 

To limit this, we want to pre-register a set of names in the genesis and provide them to community leaders as well as 

# Rationale and alternatives
[rationale-and-alternatives]: #rationale-and-alternatives

Part of the value of readable names is to instill confidence in users about applications they are using. For example if you see `some-app.com` you can trust that this is reasonably legit app as it got a `.com` name. 

Same goes to adding ability for `username@email.com` to connect user's emails and accounts. This may require additional work on the price side as we don't want to expose users emails and transaction history.

Other possibility include:
- Not doing any limitations on registering accounts. This is not good because will lead to squatting interesting names and not giving users confidence.
- Use meaningless ids for accounts. It will be extremely hard for users to remember that. Also will limit a lot of use cases where multiple users need to interact.

# Unresolved questions
[unresolved-questions]: #unresolved-questions

Pricing of the registration of TLA should be reasonable for names with reasonable length independent of the price of the underlaying token.

Right now sub-registrars by default can register any name including with separators. Which means that an account `blah.com` doesn't own `*.blah.com` namespace. We may need to restrict usage of `'.'` on system level to allow that easily.

# Future possibilities
[future-possibilities]: #future-possibilities

The future work on this includes expanding what `system` contract can do to allow for richer implementations of sub-registrars. We also expect standardization in sub-registrars beyond one described here.

Additionally, we expect more work on privacy side here to enable account names be used by users but not associated directly with their transaction history.
