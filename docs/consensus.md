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

## Important outcomes

| Outcome | Meaning |
|---|---|
| `MAJORITY_AGREE` | Consensus accepted the proposal; execution still needs verification. |
| `MAJORITY_DISAGREE` | Validators did not accept the proposal; no comparison is persisted. |
| `FINISHED_WITH_RETURN` | The execution returned a value; it does not by itself prove consensus or persistence. |
| Verification pending | A finalized transaction lacks enough execution data for a safe conclusion. |

The UI keeps application run state and onchain comparison state separate. A
rejected run remains a useful forensic record and is never rendered as an
accepted result or graph edge.

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
