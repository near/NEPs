# Contract Self-Identification ([NEP-129](https://github.com/nearprotocol/NEPs/pull/129))

Version `0.1.0`

## Summary
[summary]: #summary

A standard interface for contract allowing self-identification, version information, supported standard interfaces, author and auditor.

## Changelog

### `0.1.0`

- Heavy simplification. Only contract identification.

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
- Get the author near account 
- Get the auditor near account (possibly for contract hash validation via aditor's provided mechanisms)

To satisfy this NEP the contract must implement 1 (one) method: 

1. `get_contract_info():string as ContractInfo` returning a JSON structure as described below (typescript):

```typescript
type ContractInfo = {
   dataVersion: number = 1; // determines the rest of the fields
   name: string = ""; // contract-code short name
   version: string = "0.0.1"; //contract-code semver
   source: string = ""; //contract source code URL, e.g. http://github.com/author/contract
   standards: string[] = []; // standards this contract satisfies
   authorAccountId: string=""; //near account of the author of the code
   auditorAccountId: string=""; //near account of the auditor of the code
}
```

### Details on the fields:
- **dataVersion**. In future iterations of this NEP, new fields migth be added to `ContractInfo`, this number will be increased. All `dataVersions` are backwards compatible, meaning `dataVersion=2` **can only add fields** to `dataVersion=1`'s structure

### Use Cases 

Alice wants to trade only with audited NEP-21 tokens. She receives an account name as a token source. Before interacting with the account her code can:

* perform basic account validation (check that there are no full-access keys on the contract)

* call `get_contract_info`

* verify the contract supports NEP-21 `standards.include("NEP-21")`

* use `auditorAccountId` to check the contracts code hash and audit info (depending on the auditor's mechanism to do that)

If all the above is correct, her code adds the contract as an audited NEP-21 Token.


## Reference-level explanation
[reference-level-explanation]: #reference-level-explanation

* Contract side:

  * Reference implementation in Rust: TODO 
  * Reference implementation in AS: TODO 


### Interface Example (ts/pseudocode):

```typescript
/********************************/
/* CONTRACT Self Identification */
/********************************/
const CONTRACT_NAME = "FunTokAMM"
const CONTRACT_VERSION = "0.0.1"
const AUTHOR_ACCOUNT_ID = "luciotato.near"
var AuditorAccountId = "auditors.near"
/// get information about this contract
/// returns JSON string according to [NEP-129](https://github.com/nearprotocol/NEPs/pull/129)
public function get_contract_info():string {
    return `{
      "dataVersion":1, 
      "name":"${CONTRACT_NAME}",
      "version":"${CONTRACT_VERSION}", 
      "source":"http://github.com/luciotato/fun-tok-amm",
      "standards":["NEP-129","NEP-21","NEP-122","NEP-301"], 
      "authorAccountId":"${AUTHOR_ACCOUNT_ID}",
      "auditorAccountId":"${AuditorAccountId}"
      }` 
}

/// set auditor information for this contract
public function set_auditor_account_id(accountId:string) {
  AuditorAccountId=accountId;
  saveState();
}

```

## Drawbacks
[drawbacks]: #drawbacks

TBD 

## Unresolved questions
[unresolved-questions]: #unresolved-questions

- Reference implementations

## Future possibilities
[future-possibilities]: #future-possibilities

- Automated audit validation

  * There should be a NEP-standard contract in the referenced auditor's near account, so the validation can be done automatically and on-chain

  * There should be a NEP extending this one to include standard mechanisms and license models to guarantee RTSP (Remember to Share Profits) with the contract's author's, to encourage independent SC development.

- Quis custodiet ipsos custodes? Auditing Auditors

  * There should be an in-chain Auditor's key registry (AKR), so keys can be validated and compomised keys can be denonunced. e.g. Audtor Alice's private key is stolen. From now on all Alice's signatures with that public key are not to be trusted. The public key is published in-chain in the AKR with `"status":"compromised"`. Contracts should update their contract info to remove the auditor's account reference and replace it with a new one.

  * The AKR should be a community governed DAO 
  
