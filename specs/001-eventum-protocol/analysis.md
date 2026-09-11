# Spec Kit consistency analysis

Recorded from the current Spec Kit prerequisite context at
`/root/eventum/specs/001-eventum-protocol` on 2026-09-09 UTC.

## Scope checked

- 22 functional requirements, 4 non-functional requirements, and 5 buildable
  success criteria.
- Five user stories and their acceptance scenarios.
- 23 ordered implementation/release tasks.
- Constitution v1.0.0 and plan decisions.

## Findings and closure

| ID | Category | Severity | Finding | Resolution |
|---|---|---|---|---|
| A1 | Metadata consistency | HIGH | Spec Kit’s generated `feature.json` used legacy `feature_dir`, while the current prerequisite script requires `feature_directory`. | Added the current key and reran the prerequisite gate successfully. |
| A2 | Architecture consistency | HIGH | Early plan text described SQLite/SQL migration while the implemented single-process cache is atomic JSON. | Updated clarification, data model, plan, tasks, README, and docs; removed the unused SQL migration. |
| A3 | Release coverage | HIGH | Broad browser concurrency exceeded the external Studionet read rate limit and caused server-rendered registry failures. | Added explicit unavailable states, kept the outage visible, and made Playwright release QA sequential against the real RPC. |
| A4 | Visual correctness | MEDIUM | Graph edge CSS used top-left offsets and could miss nodes. | Replaced it with percentage-coordinate SVG center-to-center lines and reran targeted browser QA. |
| A5 | Protocol safety | HIGH | Direct Mode reproduced that a model could mark a three-outcome versus two-outcome equivalent pair aggregatable through a many-to-one mapping. | Contract now requires equal cardinality and one-to-one complete mapping; the 35-case suite includes the regression and structured-output tests, and the corrected source was redeployed and reverified on Studionet. |

No unresolved contradiction between the constitution, specification, plan, or
task list remains. No requirement is intentionally implemented by a mock on a
production path.

## Coverage summary

All requirements and acceptance scenarios map to contract, backend, frontend,
security, deployment, or browser tasks. Release tasks remain evidence-gated by
the final certification checklist rather than being considered complete from a
build alone.
