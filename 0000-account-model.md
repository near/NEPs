- Proposal Code Name: access_keys
- Start Date: 2019-07-08
- NEP PR: [nearprotocol/neps#0000](https://github.com/nearprotocol/neps/pull/0000)
- Issue(s): [nearprotocol/nearcore#687](https://github.com/nearprotocol/nearcore/issues/687)

# Summary
[summary]: #summary

Access keys provide limited access to an account.
Each access key belongs to some account and identified by a unique (within the account) public key.
One account may have large number of access keys.
Access keys will replace original account-level public keys.
Access keys allow to act on behalf of the account by restricting allowed transactions with the access key permissions.

# Motivation
[motivation]: #motivation

Access keys give an ability to use dApps in a secure way without asking the user to sign every transaction in the wallet.
By issuing the access key once for the application, the application can now act on behalf of the user in a restricted environment.
This enables seamless experience for the user.

Access keys also enable a few other use-cases that are discussed in details below.

# Guide-level explanation
[guide-level-explanation]: #guide-level-explanation

Here are proposed changes for the AccessKey and Account structs.  

```rust
/// `account_id,public_key` is a key in the state

account_id,public_key => AccessKey {
  /// The nonce for this 
  nonce: u64;

  /// The amount that can be spent for transaction fees by this access key from the account balance.
  /// When used, both account balance and the allowance is decreased.
  allowance: u128;

  /// Permissions TBD      
}

account_id => Account {
  balance: u128;
  code_hash: Hash;
  /// Storage usage accounts for all access keys      
  storage_usage: u64;
  storage_paid_at: BlockIndex(u64);
}
```

### Examples

#### AccessKey for a dApp by a user

This is a simple example where a user wants to use some dApp. The user has to authorize this dApp within their wallet, so the dApp knows who the user is, and also can issue simple function call transactions on behalf of this user.

To create such AccessKey a dApp generates a new key pair and passes the new public key to the user's wallet in a URL. Then the wallet asks the user to create a new AccessKey with
that points to the dApp. User has to explicitly confirm this in the wallet for AccessKey to be created.
The new access key is restricted to be only used for the app’s contract_id, but is not restricted for any method name.
The user also selects the allowance to some reasonable amount, enough for the application to issue transactions. The application might hint the user about this allowance.
Now the app can issue function call transactions on behalf of the user’s account towards the app’s contract without requiring the user to sign each transaction.

An access key example for chess app from user `vasya.near` (using old permissions model):
```rust
vasya.near,c5d312f3 => AccessKey {
    nonce: 0,
    
    allowance: 1_000_000_000,
    
    contract_id: "chess.app",
    
    method_name: None,
}
```

#### AccessKey issued by a dApp

This is an example where the dApp wants to pay for the user, or it doesn't want to go through the user's sign-in flow. For whatever reason the dApp decided to issue an access key directly for their account.

For this to work there should be one account with funds (that dApp controls on the backend) which creates access keys for the users.
The difference from the example above is there is only one account that creates multiple access keys (one per user) towards one other contract.
So for the contract to differentiate users, the contract has to use the public key of the access key instead of sender's account ID.

There are some caveats with this approach:
- The dApp is required to have a backend and to have some sybil resistance for users. It's to prevent abuse by bots.
- Writing contract is more complicated, since the contract now needs to handle both real users through common transactions and the ephemeral users through the access keys (by mapping their public keys to user names).

An access key example for chess app paid by the chess app from `chess.funds` account (using old permissions model):
```rust
chess.funds,2bc2b3b => AccessKey {
    nonce: 0,
    
    allowance: 5_000_000,
    
    contract_id: "chess.app",
    
    method_name: None,
}
```

#### AccessKey through a proxy

This examples demonstrates how to have more granular control on top of built-in access key restrictions.

Let's say a user wants to:
- limit the number of calls the access key can make per minute
- support multiple contracts with the same access key
- select which methods name can be called and which can't
- transfer funds from the account up to a certain limit 
- stake from the account, but prevent withdrawing funds

To make it work, we need to have a custom logic at every call.
We can achieve this by running a portion of a smart contract code before any action.
A user can deploy a code on their account and restrict access key to their account and to a method name, e.g. `proxy`.
Now this access key will only be able to issue transactions on behalf of the user that goes to the user's contract code and calls method `proxy`.
The `proxy` method can find out which access key is used by comparing public keys and verify the request before executing it.

E.g. the access key should only be able to call `chess.app` at most 3 times per 20 block and can transfer at most 1M tokens to the `chess.app`.
The `proxy` function internally can validate that this access key is used, fetch its config, validate the passed arguments and proxy the transaction.
A `proxy` method might take the following arguments for a function call:
```json
{
  "action": "call",
  "contract_id": "chess.app",
  "method_name": "move",
  "args": "{...serialized args...}",
  "amount": 0
}
```

In this case the `action` is `call`, so the function checks the `amount` to be within the withdrawal limit, check that the contract name is `chess.app` and if there were the last 3 calls were not in the last 20 blocks issue an async call to the `chess.app`.
The same `proxy` function in theory can handle other actions, e.g. staking or vesting.

The benefit of having a proxy function on your own account is that it doesn't require additional receipt, because the account's state and the code are available at the transaction verification time.

# Reference-level explanation
[reference-level-explanation]: #reference-level-explanation

This is the technical portion of the NEP. Explain the design in sufficient detail that:

- Its interaction with other features is clear.
- It is reasonably clear how the feature would be implemented.
- Corner cases are dissected by example.

The section should return to the examples given in the previous section, and explain more fully how the detailed proposal makes those examples work.


# Drawbacks
[drawbacks]: #drawbacks

Why should we *not* do this?

# Rationale and alternatives
[rationale-and-alternatives]: #rationale-and-alternatives

- Why is this design the best in the space of possible designs?
- What other designs have been considered and what is the rationale for not choosing them?
- What is the impact of not doing this?

# Unresolved questions
[unresolved-questions]: #unresolved-questions

- What parts of the design do you expect to resolve through the NEP process before this gets merged?
- What parts of the design do you expect to resolve through the implementation of this feature before stabilization?
- What related issues do you consider out of scope for this NEP that could be addressed in the future independently of the solution that comes out of this NEP?

# Future possibilities
[future-possibilities]: #future-possibilities

Think about what the natural extension and evolution of your proposal would
be and how it would affect the project as a whole in a holistic
way. Try to use this section as a tool to more fully consider all possible
interactions with the project in your proposal.
Also consider how the this all fits into the roadmap for the project
and of the relevant sub-team.

This is also a good place to "dump ideas", if they are out of scope for the
NEP you are writing but otherwise related.

If you have tried and cannot think of any future possibilities,
you may simply state that you cannot think of anything.

Note that having something written down in the future-possibilities section
is not a reason to accept the current or a future NEP. Such notes should be
in the section on motivation or rationale in this or subsequent NEPs.
The section merely provides additional information.
