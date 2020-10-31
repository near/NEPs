# Contract Self-Identification ([NEP-xx](https://github.com/nearprotocol/NEPs/pull/xx))

Version `0.0.1`

## Summary
[summary]: #summary

A standard interface for contract allowing self-identification, version information, supported standard interfaces and audit verification.

This NEP also includes author identification and gas%-benefit-sharing mechanism, in order to create incentives for smart contract authors and lure developers into the NEAR ecosystem.

## Changelog

### `0.0.1`

- Initial Proposal

## Motivation
[motivation]: #motivation

It's almost impossible to determine what contract is deployed to an account without out-of-band data.

A contract satisfying this standard can be identified and verified without resorting to pre-known data or data acquisition mechanisms other than blockchain standard access.

Prior art:
- TBD

## Guide-level explanation
[guide-level-explanation]: #guide-level-explanation

A contract implementing this standard would allow users to:
- Determine name, version & source code of the contract, e.g. `name:"fungible-token", version:"1.0.0"`
- Get a list of standards this contract satisfies, e.g. `standards:["NEP-21","NEP-211"]`
- Get the url of the contract code, e.g. `source:"http://github.com/author/contract"`
- Get audit signatures for the current contract hash
- Get exact information on the total funds managed
- Benefit deployers and contract authors with gas-benefits

To satisfy this NEP the contract must implement 4 (four) methods: 

1. `get_contract_info():string as ContractInfo` returning a JSON structure as described below (typescript):

```typescript
type ContractInfo = {
   dataVersion: number = 1; // determines the rest of the fields
   name: string = ""; // contract-code short name
   version: string = "0.0.1"; //contract-code semver
   source: string = ""; //contract source code URL, e.g. http://github.com/author/contract
   standards: string[] = []; // standards this contract satisfies
   authorAccountId: string=""; //near account of the author of the code
}
```

2. `get_contract_audits():string as AuditsArray` returning a JSON structure as described below (typescript):

```typescript
type AuditsArray = Audit[];

type Audit = {
   auditorAccountId: string = ""; // auditor near Account Id
   auditorPublicKey: string = ""; // auditor public key
   timestamp: string = ""; //timestamp of the audit, in Date.toJSON format, e.g. "2020-03-30T13:42:49.137Z"
   codeHash: string = ""; //contract's audited code hash, must match deployed code hash
   lockLevel: number = 0; // lock level (see below) 
   signature: string = ""; //timestamp+codeHash+lockLevel signed with the auditor's private key
}
```

3. `get_total_managed_balance()->U128` Gets total accounted-for balance for this contract. 

The difference between this number and the native account balance is gas%-benfits to be distributed.

This function can also help automated tools to acquire exact managed balance along contract details, in order to compile NEAR DApps/DEFI dashboards, for example.

4. `distribute_gas_benefits()` Distribute gas benefits between this contract account deployer/controller and the author(s) of the contract code.


### Details on the fields:
- **dataVersion**. In future iterations of this NEP, new fields migth be added to `ContractInfo`, this number will be increased. All `dataVersions` are backwards compatible, meaning `dataVersion=2` **can only add fields** to `dataVersion=1`'s structure

- **Audit.lockLevel**. Is this contract locked and not upgradeable?

  * `lockLevel=0`: (default) The contract can add full-access keys to itself with an owner's call => the code can change at any time => need to verify code hash  before every critical call

  * `lockLevel=1`: Owner-pattern, The contract can be staged and redeployed (See [NEP-123](https://github.com/nearprotocol/NEPs/pull/123)) => need to verify code hash before every critical call. The user can override requirements based on deployment governance for this specific account.

  * `lockLevel=2`: Non-upgradable => the code can't change => the audit signature needs to be verified only once

- **AuthorAccountId**. Used in `distribute_gas_benefits()` to sent to the author(s) a percentage of gas benefits 

### Use Cases

All use cases include a basic validation consisting in listing account keys and checking that there are not full-access keys in the account.

### Use Case 1

Alice wants to interact with audited contracts level 1 only. Before interacting with an account her code can determine the account's contract lock level by:

* basic account validation

* call `get_contract_audits`

* loop over `audits` to see if there's an auditor she trusts and lockLevel=>1

* verify audit info signature with her trusted copy of the auditor's public key

* verify deployed contract code hash

If all of the above succeed, her code adds the contract to its cache of level 1 contracts.

### Use case 2

Bob wants to trade with fully-trustable NEP-21 tokens. He receives an account name as a token source. Before interacting with the account his code can:

* basic account validation

* call `get_contract_info`

* verify the contract supports NEP-21 `standards.include("NEP-21")`

* call `get_contract_audits`

* loop over `audits` to see if there's an auditor he trusts and lockLevel=>2

* verify audit info signature with his trusted copy of the auditor's public key

* verify deployed contract code hash

If all the obove succeed, his code adds the contract as a fully-trustable, non-upgradeable NEP-21 Token.


## Reference-level explanation
[reference-level-explanation]: #reference-level-explanation

* Contract side:

  * Reference implementation in Rust: TODO 
  * Reference implementation in AS: TODO 

* Client's side:

  * Use case 1, reference implementation: TODO 
  * Use case 2, reference implementation: TODO 


### Interface Example (ts/pseudocode):

```typescript
/********************************/
/* CONTRACT Self Identification */
/********************************/
const CONTRACT_NAME = "FunTokAMM"
const CONTRACT_VERSION = "0.0.1"
const AUTHOR_ACCOUNT_ID = "luciotato.near"
/// get information about this contract
/// returns JSON string according to [NEP-xxx](https://github.com/nearprotocol/NEPs/pull/xx)
public function get_contract_info():string {
    return `{
      "dataVersion":1, 
      "name":"${CONTRACT_NAME}",
      "version":"${CONTRACT_VERSION}", 
      "source":"http://github.com/luciotato/fun-tok-amm",
      "standards":["NEP-21","NEP-122","NEP-301"], 
      "authorAccountId":"${AUTHOR_ACCOUNT_ID}"
      }` 
}

/// returns audit information about this contract
/// data must be a JSON string according to [NEP-xxx](https://github.com/nearprotocol/NEPs/pull/xx)
public function get_audit_info():string {
    return env.store.get("audits-NEP-xx").toString()
}

// Sets audit information about this contract
// data must be a JSON string according to [NEP-xxx](https://github.com/nearprotocol/NEPs/pull/xx)
// Owner's method
public function set_audit_info(auditData:string) {
    assertOwner()
    env.store.set("audits-NEP-xx",data)
}

//Distribute gas benefits (typescript/pseudocode)
// 50% gas benefits are sent to a contract located at "gas-benefits.{current-contract-account}
// 50% gas benefits are sent to a contract located at "gas-benefits.{AUTHOR_ACCOUNT_ID}
// benefits are sent to a contract to allow those accounts to manage or further distribute those benefits
public function distribute_gas_benefits() {
    assert(env.predecessorAccoutId==this.ownerId 
        || env.predecessorAccoutId==AUTHOR_ACCOUNT_ID)
    //compute gas benefits
    const managed_balance = this.get_total_managed_balance()
    if (managed_balance < env.account_balance){
      //compute gas benefits
      const gas_benefits = env.account_balance - managed_balance
      assert(gas_benefits>=TEN_NEAR) //minimmun balance to distribute
      gas_benefits -= TWO_NEAR //always leave 2 extra NEAR in this contract account
      // inform the contract name & version to distribution contracts
      const contractNameAndVersion = {contractName:CONTRACT_NAME,version:CONTRACT_VERSION}
      //send 50% to gas-benefits.${env.current_account}
      const p1=env.PromiseNew("call",`gas-benefits.${env.current_account}`,
          "distribution",contractNameAndVersion
          ,TEN_TGAS,gas_benefits.shiftRight(1)) //50%
      //send 50% to gas-benefits.${AUTHOR_ACCOUNT_ID}
      const p2=env.PromiseNew("call",`gas-benefits.${AUTHOR_ACCOUNT_ID}`,
          "distribution",contractNameAndVersion
          ,TEN_TGAS,gas_benefits.shiftRight(1)) //50%
      env.PromiseAnd(p1,p2) //call both in parallel
    }
}

```

## Drawbacks
[drawbacks]: #drawbacks

- Too much power to auditing firms. OTOH it can create a thriving audit market
- Hard to get traction without a valid audit
- Too high requirements from the users (always require a level 2)

## Rationale and alternatives
[rationale]: #rationale

### Design decisions rationale

Information getting is split into two functions because the first one (contract_info) is supposed to return static data hard-coded into the contract code, while the second (audit_info) is data that can vary during contract lifetime.


## Unresolved questions
[unresolved-questions]: #unresolved-questions

- Reference implementations


## Future possibilities
[future-possibilities]: #future-possibilities

- Quis custodiet ipsos custodes? Auditing Auditors

  * There should be an in-chain Auditor's key registry (AKR), so keys can be validated and compomised keys can be denonunced. e.g. Audtor Alice's private key is stolen. From now on all Alice's signatures with that public key are not to be trusted. The public key is published in-chain in the AKR with `"status":"compromised"`. Contracts should update their contract info to remove the audits signed by that key and replace them for new ones.
  * The AKR should be a community governed DAO 
  
