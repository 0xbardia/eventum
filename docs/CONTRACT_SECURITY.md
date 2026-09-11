# Internal contract security review

This is an internal engineering review, not a third-party audit or a claim of
formal verification.

## Threat model

Attackers may submit hostile market text, oversized values, duplicate writes,
malformed JSON, misleading source hashes, adversarial outcome mappings, or
prompt-injection strings. Validators, RPC responses, and provider evidence may
be unavailable or inconsistent. A caller may query pairs in either order or
attempt to infer unsafe graph closure.

## Review findings and mitigations

| Surface | Mitigation | Evidence |
|---|---|---|
| Prompt injection in title/rules/facts | Evidence is quoted and explicitly untrusted; no evidence text is executed; strict JSON and enum validation follow the prompt. | Adversarial Direct Mode tests |
| Model hallucinated identity/outcome | Canonical key is contract-derived; mapping keys/targets must match stored labels. | Malformed-output tests |
| Unsafe outcome collapse | Aggregation additionally requires equal outcome cardinality and a complete one-to-one mapping; many-to-one results remain non-aggregatable. | Equivalent many-to-one regression test |
| Consensus disagreement | Leader and validator independently produce normalized results; stable fields must match. | Consensus tests |
| Failed nondeterministic execution | Safe `AMBIGUOUS`/failure path; state writes occur only after validated return. | Failure tests and Studio finalization |
| Snapshot mutation/replay | Content-derived IDs, immutable records, duplicate rejection, monotonic version pointers. | State/history tests |
| Pair collision/reverse inconsistency | Sorted pair key; deterministic comparison ID; explicit subset inversion and mapping inversion. | Reverse lookup tests |
| Storage/payload DoS | Bounded strings, facts, outcomes, reasons, differences, pages, and mappings. | Oversized/invalid input tests |
| Unsafe graph aggregation | Direct edge storage only; no union-find or transitive closure. | A=B/B=C graph test |
| Opaque backend authority | Backend only prepares evidence and reads the contract; it never writes a boolean result. | Architecture and integration review |

## Residual risks

- Natural-language adjudication can remain ambiguous even with consensus; the
  protocol intentionally fails safe rather than guaranteeing a result.
- Provider APIs can publish incomplete or changed fields. The adapter rejects
  insufficient rules and the source hash preserves provenance, but it cannot
  prove the provider's own correctness.
- The JSON cache is a single-process operational cache. It is atomic and
  permission-restricted but is not a replicated database.
- The contract currently has no challenge/revalidation economics. Adding those
  would require a separate protocol/security design.
- The Studio UI showed a `gen_getTransactionStatus` parameter-shape error while
  direct RPC/GenLayerJS status reads were successful; this is recorded as an
  external Studio UI issue, not suppressed as contract success.

## Review result

The current operator deployment is `0xB4260CDFf766Bf56C2C623A748082a51932870F8`
with source SHA-256
`f92810de3e381bea9938fc38c55b2ba0625274f239ecf617905539019f5496d4`.
Earlier deployment values in the historical paragraphs below are retained for
audit lineage and are not active runtime targets.

The reviewed source passed `genvm-linter` validation and 35 Direct Mode tests.
The exact tested source hash `7d45c0497d3b1466aace1b9b3f8c216ae423331f110f8d618f44a7edbb5b795a`
was deployed to Studionet at `0x04435B28bA9c57A7abFA1eb6b804218fca67249c`. Its
11 public reads were exercised against the fresh deployment. Meaningful live
writes remain `BLOCKED_EXTERNAL` because the available signing authority has
zero balance; Direct Mode covers the write semantics and no write success is
claimed here. No third-party audit claim is made.
