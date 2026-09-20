# Consensus lifecycle

Eventum uses GenLayer to adjudicate natural-language settlement rules inside an
Intelligent Contract. A model's answer is a proposal, not automatically a
state transition.

## Stages

1. The contract constructs a quoted-evidence prompt from normalized snapshots.
2. A leader returns a bounded structured semantic proposal.
3. Validators independently evaluate the evidence and stable decision fields.
4. GenLayer reaches a consensus outcome.
5. Only an accepted, successfully executed transaction can persist a
   comparison; the application then performs a finalized read-back.
6. Verification is bounded and automatic. It polls the same submitted hash,
   pauses while the document is hidden, and never resubmits a write.

## Important outcomes

| Outcome | Meaning |
|---|---|
| `MAJORITY_AGREE` | Consensus accepted the proposal; execution still needs verification. |
| `MAJORITY_DISAGREE` | Validators did not accept the proposal; no comparison is persisted. |
| `FINISHED_WITH_RETURN` | The execution returned a value; it does not by itself prove consensus or persistence. |
| Verification pending | A finalized transaction lacks enough execution data for a safe conclusion. |
| `EXECUTION_FAILED` | Contract execution failed; no comparison is treated as persisted. |
| `RPC_UNAVAILABLE` | Verification is temporarily unavailable; the submitted hash remains preserved. |

The UI keeps application run state and onchain comparison state separate. A
rejected run remains a useful forensic record and is never rendered as an
accepted result or graph edge.

For `MAJORITY_DISAGREE` and `CONSENSUS_REJECTED`, the product states plainly:
“GenLayer validators did not accept the proposed semantic relationship, so no
comparison was persisted onchain.” It also shows `Persisted onchain: NO` and
`Run remains auditable: YES`. Model-output, execution, and RPC failures retain
distinct explanations.

## Forensic example

The historical comparison transaction beginning
`0x2a2777166e8ea1ef3c8d2c8090d3e49694f6efc5ceffe7f045e8a2d8126ffc87` reached
finalization and returned a leader proposal, but ended in `MAJORITY_DISAGREE`.
It therefore has an application run record and no onchain Comparison. This is
the expected distinction between execution, consensus, and persistence.

## Recovery

Once a transaction hash exists, the run persists it and reconciles that same
hash. Refresh, navigation, RPC interruption, and PM2 restart must lead to
verification or a truthful failure state; they must never suggest a blind
duplicate submission.

## Dispute and remediation boundary

An accepted comparison is an immutable direct graph edge in protocol `1.1.1`.
The contract exposes no dispute, challenge, or correction mutation, and the
application must not silently overwrite an accepted edge. A disputed result
may be flagged in offchain operational documentation while the historical edge
remains auditable. Protocol-level correction requires a separately reviewed
future protocol version, migration, or explicitly reviewed governance design.

The historical transaction
`0xc4e66d1c057e01fcbdbc0446ed7cc555e0d32016b7d034fbef2513aecd141679`
finalized consensus and was correctly rejected by the contract because the
submitted source evidence did not match Gamma. The defect was adapter field
selection (`startDateIso`/`endDateIso` instead of `startDate`/`endDate`), not
contract comparison semantics; the transaction is historical evidence only.
