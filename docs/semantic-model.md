# Semantic model

Eventum asks whether two authored prediction-market rules resolve identically
under materially relevant interpretations. Titles and embeddings are not the
decision authority.

## Relations

| Relation | Meaning | Direction |
|---|---|---|
| `EQUIVALENT` | Same settlement set under the published rules. | Symmetric |
| `CONDITIONAL_EQUIVALENT` | Equivalent only under an explicit condition. | Symmetric, conditional |
| `SUBSET` | Every positive settlement case in A is represented by B, while B may cover more cases. | A → B |
| `SUPERSET` | A contains B's positive settlement cases. | A → B |
| `OVERLAPPING` | Some cases intersect, but neither set contains the other. | Symmetric |
| `CONFLICTING` | Shared context with genuinely incompatible settlement behavior. | Symmetric |
| `TEMPORAL_MISMATCH` | A material time, deadline, timezone, or period difference. | Symmetric |
| `SOURCE_MISMATCH` | A material resolution-authority or fallback-source difference. | Symmetric |
| `OUTCOME_MISMATCH` | Published outcome spaces do not safely correspond. | Symmetric |
| `UNRELATED` | No shared event/action/entity supports a relationship. | Symmetric |
| `AMBIGUOUS` | Evidence or consensus is insufficient for a safe classification. | Symmetric |

Reverse lookup inverts `SUBSET`/`SUPERSET` and inverts direction-aware outcome
mapping. A direct graph edge exists only for a persisted onchain comparison.

## Safety

`safe_to_compare` means the evidence supports a useful semantic comparison. It
does not mean the markets can be merged. `safe_to_aggregate` is stricter: the
outcome mapping must be complete, known, and one-to-one over the relevant
outcome spaces. Many-to-one, one-to-many, incomplete, or unknown mappings must
remain non-aggregatable.

For example, an `≤ $80,000` BTC-low rule contains the positive cases of an
`≤ $77,500` rule when actor, event, window, source, and outcomes align. In the
requested ordering, the broader rule is `SUPERSET` and the narrower rule is
`SUBSET`; that directional relationship is not equivalence and does not
authorize naive aggregation.

## Precedence

The adjudication distinguishes unrelated or insufficient evidence first, then
tests equivalence, directional containment, explicit conditional equivalence,
partial overlap, and genuine conflict or specialized mismatches. This avoids
using “can resolve differently” as a definition of conflict, because subset
markets can also resolve differently in valid world states.
