---
NEP: xxxx
Title: Deterministic ML-DSA-65 Key Derivation from BIP-39 Seeds (SLIP-10)
Authors: Vladyslav Savchyn (@vsavchyn-dev), Ricky Lalwani (@r-near)
Status: Draft
DiscussionsTo: https://github.com/near/neps/pull/0000
Type: Wallet Standard
Requires: 645
Version: 1.0.0
Created: 2026-07-30
LastUpdated: 2026-07-30
---

## Summary

With the introduction of [NEP-645], users got access to PQ transaction signatures on NEAR Protocol, allowing them to protect their accounts against a future quantum computer threat by adding an ML-DSA-65 access key. Meanwhile, self-custodial HD wallets, which serve as the main point of entry for users on NEAR, don't have a specification to follow on how to derive those keys deterministically.

[SLIP-10] specification doesn't yet cover ML-DSA and has an open PR ([slips#1968]) that proposes adding it.

This NEP specifies the standard on how wallets should deterministically derive ML-DSA-65 key pairs from a BIP-39 mnemonic using [SLIP-10] hardened-only derivation, aligned with the construction proposed in [slips#1968].

## Motivation

NEAR Protocol is one of the early adopters of post-quantum keys, and users need a way to deterministically derive their ML-DSA-65 access keys, similar to how it's done with Ed25519 keys specified in [SLIP-10]. This has several applications, for instance enabling recovery of the key from a BIP-39 mnemonic alone, and cross-wallet portability.

Currently, there is only an open PR ([slips#1968]) that proposes a way to derive ML-DSA keys, but the timeline of its acceptance is not clear. Meanwhile, proprietary derivations are already appearing and the cost of not standardizing grows with every wallet that ships one.

## Specification

The keywords "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt).

### Overview

Wallet uses `HMAC-SHA512` as specified in [SLIP-10] over a seed derived from a [BIP-39] mnemonic with curve string `ML-DSA-65 seed` over a hardened-only [BIP-44]-style path `m/44'/397'/0'/0'/index'`, where `397'` is NEAR coin type specified in [SLIP-44]. This will result in 32-byte node secret used as the seed for ML-DSA-65 key generation ([FIPS 204]), making key pair usable on-chain as specified in [NEP-645] (gated by protocol feature `ProtocolFeature::PostQuantumSignatures`, active since protocol version 85).

### Scope

**In scope (this NEP):**

- ML-DSA-65 deterministic key derivation using `ML-DSA.KeyGen_internal` ([FIPS 204]) and [SLIP-10] with [BIP-39] seed.

**Out of scope:**

- Derivation for other ML-DSA key variants and a way to generate them (while possible, NEAR only enables ML-DSA-65).
- Derivation for other key types available for users on NEAR (Ed25519 and Secp256k1).
- Definition for a non-hardened ML-DSA keys (see [Child Key Derivation](#child-key-derivation)).
- Post-derivation usage of the ML-DSA-65 keys by wallets (account discovery, key rotation).

### Master Key Generation

The key generation MUST follow the [SLIP-10] process described below.

The use of the node secret as key generation seed is specified in [Key Pair Generation](#key-pair-generation-fips-204).

Let S be a seed byte sequence of 128 to 512 bits in length. This is the same as the seed byte sequence used in [BIP-32]. The value of S SHOULD be the binary seed obtained from a [BIP-39] mnemonic and optional passphrase.

Let Curve be the ASCII string used as the HMAC-SHA512 key, identifying the signature scheme. This NEP defines derivation only for `Curve = "ML-DSA-65 seed"`.

1. Calculate I = HMAC-SHA512(Key = Curve, Data = S)
2. Split I into two 32-byte sequences, I<sub>L</sub> and I<sub>R</sub>.
3. Use I<sub>L</sub> as master node secret, and I<sub>R</sub> as master chain code.

For ML-DSA the last step always succeeds (note that there is no step 4 compared to [SLIP-10]), as any 32-byte sequence is a valid seed for the ML-DSA key generation.

### Child Key Derivation

Similar to ed25519 and curve25519 in [SLIP-10], only hardened key generation from private parent key to private child key is supported.

The function CKDpriv((k<sub>par</sub>, c<sub>par</sub>), i) &rarr; (k<sub>i</sub>, c<sub>i</sub>) computes a child extended node secret from the parent extended node secret:

1. Check whether i ≥ 2<sup>31</sup> (whether the child is a hardened key).
   - If so (hardened child): let I = HMAC-SHA512(Key = c<sub>par</sub>, Data = 0x00 || k<sub>par</sub> || ser<sub>32</sub>(i)). (Note: The 0x00 pads the node secret to make it 33 bytes long.)
   - If not (normal child): return failure.
2. Split I into two 32-byte sequences, I<sub>L</sub> and I<sub>R</sub>.
3. The returned child node secret k<sub>i</sub> is I<sub>L</sub>. The returned chain code c<sub>i</sub> is I<sub>R</sub>.

The HMAC-SHA512 function is specified in [RFC 4231](https://datatracker.ietf.org/doc/html/rfc4231).

### Derivation Path

TODO(vsavchyn-dev): write down the path spec, how it looks most of the time for users on NEAR with `near-cli-rs`.

### Recoverability

TODO(vsavchyn-dev): WIP

### Key Pair Generation (FIPS 204)

For ML-DSA-65, the derived 32-byte value I<sub>L</sub> (node secret) MUST be used as the seed for deterministic key generation. The seed is used directly with the `ML-DSA.KeyGen_internal` function as specified in [FIPS 204] to generate ML-DSA-65 key pair, for which a 32-byte seed is sufficient per specification. Resulting key pair MUST be serialized following [NEP-645] to have SHA3-256(ML-DSA-65) hash stored on NEAR.

However, the public key in this NEP is serialized as: 0x00 || pk, where pk is the raw 1952-byte public key from the ML-DSA-65 key generation. This format is used for computing node fingerprints to match [SLIP-10] test vectors.

TODO(vsavchyn-dev): WIP put test vector for ML-DSA-65 that were run through impl.

## Reference Implementation

TODO(vsavchyn-dev): WIP

## Security Implications

TODO(vsavchyn-dev): WIP, mention probable HMAC seed -> ML-DSA generation concern.

## Alternatives

### Waiting for SLIP-0010 to adopt ML-DSA upstream

The construction in this NEP is proposed upstream in [slips#1968]. Waiting for it to merge was considered, but rejected. The upstream review is unresolved not on the construction itself, but on where it should live: reviewers have questioned whether hardened-only schemes belong in SLIP-0010 at all, or in a new SLIP dedicated to NIST algorithms. Meanwhile, ML-DSA-65 keys are already on NEAR ([NEP-645], protocol version 85), and wallets that want to offer them must derive them somehow and leaving derivation schemes to individual wallets might create problems in a long-term.

### A distinct derivation path for post-quantum keys

Other ecosystems introduce a new purpose or coin type when adding a signature scheme (BIP-49/84/86), so that a bare mnemonic identifies the key type from the path alone. However, SLIP-0010's own model separates schemes by the Curve string at the master key generation, making keys at identical paths cryptographically unrelated.

## Future possibilities

- Expanding the specification to other ML-DSA variants if it would be required by new NEP.

## Consequences

### Positive

- Wallets on NEAR have standardized way to derive ML-DSA-65 keys for users, aligned with [slips#1968] and [QIP-2](https://github.com/Quantus-Network/improvement-proposals/blob/main/qip-0002.md).
- Reuses existing path convention on NEAR and SLIP-0010 specification, so wallets extend existing derivation code instead of adding a new stack.

### Neutral

- Hardened-only derivation that is inherent to ML-DSA. Despite that, users on NEAR can use hardened-only derivation for Ed25519 and Secp256k1 keys.
- The path does not identify the scheme, as scheme identity lives in the Curve string. Wallets must treat the Ed25519 and ML-DSA-65 trees as independent and scan both during recovery.
- Wallets with pre-existing proprietary ML-DSA derivations face a one-time key rotation to become compliant (covered in [Backwards Compatibility](#backwards-compatibility)).

### Negative

- If [slips#1968] merges in modified form, NEAR is permanently locked to this construction (see [Backwards Compatibility](#backwards-compatibility) below).
- Recovery becomes more expensive: a bare-mnemonic recovery must derive and check two trees (Ed25519 + ML-DSA-65) instead of one.

### Backwards Compatibility

This NEP is an off-chain wallet standard. It introduces no protocol changes, no new on-chain types, and no changes to how existing keys behave once added to an account - all of that is defined by [NEP-645]. Derivation of the classical key types is likewise unaffected: the Ed25519 tree and ML-DSA-65 tree are separated at the master key generation, so this NEP cannot change any key an existing wallet derives. In that regard, NEP is backwards compatible.

However, two compatibility risks are worth mentioning:

- **Wallets that already ship a proprietary ML-DSA-65 derivation** will derive different keys from the same mnemonic than this standard. Those keys remain valid on-chain, but a compliant wallet will not re-derive them during recovery. Migration is a standard key rotation: add key derived as specified by this NEP using `AddKey` action, then remove the legacy key using `DeleteKey` action.
- **Upstream PR to SLIP-0010 might be merged in modified form**, or as a different SLIP. In that case, it might be better for wallets to disregard new SLIP standard and continue using the standard specified by this NEP, as derived keys cannot be re-derived under different parameters without breaking recovery of existing accounts.

## Changelog

[The changelog section provides historical context for how the NEP developed over time. Initial NEP submission should start with version 1.0.0, and all subsequent NEP extensions must follow [Semantic Versioning](https://semver.org/). Every version should have the benefits and concerns raised during the review. The author does not need to fill out this section for the initial draft. Instead, the assigned reviewers (Subject Matter Experts) should create the first version during the first technical review. After the final public call, the author should then finalize the last version of the decision context.]

### 1.0.0 - Initial Version

> Placeholder for the context about when and who approved this NEP version.

#### Benefits

> List of benefits filled by the Subject Matter Experts while reviewing this version:

- Benefit 1
- Benefit 2

#### Concerns

> Template for Subject Matter Experts review for this version:
> Status: New | Ongoing | Resolved

|   # | Concern | Resolution | Status |
| --: | :------ | :--------- | -----: |
|   1 |         |            |    New |
|   2 |         |            |        |

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).

<!-- links -->

[NEP-645]: https://github.com/near/NEPs/blob/master/neps/nep-0645.md
[SLIP-10]: https://github.com/satoshilabs/slips/blob/master/slip-0010.md
[BIP-32]: https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki
[BIP-39]: https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki
[BIP-44]: https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki
[SLIP-44]: https://github.com/satoshilabs/slips/blob/master/slip-0044.md
[FIPS 204]: https://csrc.nist.gov/pubs/fips/204/final
[slips#1968]: https://github.com/satoshilabs/slips/pull/1968
