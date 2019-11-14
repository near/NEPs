- Proposal Name: move-operator
- Start Date: 2019-11-14
- NEP PR: [nearprotocol/neps#0000](https://github.com/nearprotocol/neps/pull/0000)

# Summary
[summary]: #summary

Move operator provides an API for developers to make sure their contracts are always consistent independent of how they are used by other developers.

# Motivation
[motivation]: #motivation

In async environment it is easy to start using locks on data and "yank" data, but this can lead to dead locks or lost data. 
This can be due to logical flaw in the developers code, error in someone else's code or attack.

An important thing for any contract writer, is that no third party contract should be able to violate the invariants / make state inconsistent. Currently it's very hard to write a contract like this and we want to make sure developers don't need to worry about this.

For example if you are building a fungible token contract `fun_token` with locks, if someone calls:
```
fun_token.lock(account_id, amount).then(|| {
  assert(some_reason);
})
```

This will lead to lock forever, because `fun_token` doesn't receive callback of failure of it's own callback.

# Guide-level explanation
[guide-level-explanation]: #guide-level-explanation

Proposed idea is based on "move" semantics.

If you contract contains some data (amount of tokens, NFT, etc) that must not be lost even as there are async calls coming, developer can use `move(<collection>, <key>, <update function>)` on it, which records in the async execution flow the information that was moved and knows how to return it. Note, that update function must be invertable.

Here is high level example with non fungible token `nft`:

```
impl FunToken {
    fn transferFrom(account_id, amount) {
        move(self.amounts, account_id, |data| {
            // check & reduce allowance
            data.amount -= amount;
            self.amounts[context.predeccessor] += amount;
        })
    }
}
impl NFT {
    fn transfer(token_id) {
        move(self.tokens, token_id, |data| {
            data.owner = context.predeccessor
        });
    }
}
```

Now as a user of such contract I can be very sloppy:
```
NFT.transfer(some_id).then(|res| {
    fun_token.trasferFrom(account_id, 100).then(|res| {
        if res.is_err() assert!("Fail to withdraw 100 tokens");
        if some_other_reason assert!("Fail still");
        ...
        fun_token.transferTo()
    })
})
```

We transfer token to another person, and then try to retrieve money from them. 
If money are not retrieved, the automatic callback gets called to return moved item.

# Reference-level explanation
[reference-level-explanation]: #reference-level-explanation

TODO

# Drawbacks
[drawbacks]: #drawbacks

TODO

# Rationale and alternatives
[rationale-and-alternatives]: #rationale-and-alternatives

TODO

# Unresolved questions
[unresolved-questions]: #unresolved-questions

TODO

# Future possibilities
[future-possibilities]: #future-possibilities

TODO
