# Skeptical GenLayer review gate

Reviewed 2026-09-09 UTC after the aggregation-safety redeployment and browser QA. This
is an internal reviewer simulation, not an external approval. The current
operator deployment is `0xB4260CDFf766Bf56C2C623A748082a51932870F8`; the final
release status is maintained in `artifacts/final/final-release-gates.md`.

| Challenge | Evidence-based answer | Result |
|---|---|---|
| Could this be one centralized LLM API? | The provider adapter can be centralized, but the protocol judgment is performed inside the Intelligent Contract, independently re-evaluated by validators, persisted, versioned, and reusable by any reader. A single API response would not provide that authority boundary. | PASS |
| Is the Intelligent Contract essential? | Yes. It owns snapshot validation, the quoted-evidence prompt, stable leader/validator agreement, result normalization, deterministic IDs, inverse relationships, and direct graph state. | PASS |
| Is consensus meaningful? | Leader and validator independently run the same structured semantic task; relation, safety, identity hint, and outcome mapping must match. | PASS |
| Does the contract contain real logic? | Yes: bounded schema validation, version/index mutation, prompt construction, model-output validation, canonical identity derivation, mapping inversion, and graph projection. | PASS |
| Are states and reads useful? | 11 public reads expose immutable snapshots, counts, history, direct edges, latest pair results, and protocol version. All 11 were exercised against the new finalized Studionet deployment. | PASS |
| Are results persisted? | The contract persists finalized snapshot and comparison writes; the current fresh deployment has no records because live write authority was unavailable. | PASS — capability, current state empty |
| Does the frontend use the deployment? | `.env` is canonical; the browser receives the current address from `/api/runtime-config`, and status, markets, graph, result, and wallet paths use the same runtime target. | PASS |
| Is this more than similarity? | The contract checks event, actor, action, time, threshold, authority, exceptions, outcome spaces, mapping, material differences, and every-world-state settlement compatibility. There is no confidence score. | PASS |
| Are integrations real? | Polymarket Gamma was probed and the production preview flow was exercised with real public API responses. Unsupported providers are rejected. | PASS |
| Is the demo reproducible? | The current address, deployment tx, `/status`, `/compare`, runtime reload proof, and Playwright scenarios reproduce the evidence. Live writes require funded wallet authority. | PASS — write gate external |
| Is hostile evidence tested? | The 35-case Direct Mode suite covers prompt injection, malformed JSON, unknown enums, hallucinated outcomes, oversized values, Unicode, pagination boundaries, and disagreement/failure paths. | PASS |
| Does the UI show why GenLayer matters? | It exposes relationship taxonomy, reason codes, material differences, evidence hashes, finalization states, contract address, and direct-edge semantics. | PASS |
| Are claims evidence-backed? | Adoption, liquidity, platform coverage, fake transactions, and third-party audit claims are absent. Controlled Studio fixture data is labeled as verification data. | PASS |
| Could a reviewer reproduce Studio? | The exact source hash, address, network, deployment tx, write txs, read args/results, and verifier command are recorded. | PASS |

## Remaining reviewer risks

The first release has one verified provider, requires a funded wallet for
writes, can return `AMBIGUOUS`, has no challenge/revalidation economics, and
has not claimed Bradbury compatibility. Studio's UI status poller exposed a
parameter-shape error even though direct RPC/GenLayerJS finalization succeeded.
The unauthenticated Studionet RPC also rate-limited burst QA at 30 requests per
minute and 500 requests per hour; the app fails closed and the release probe
was serialized. These are explicit limitations, not hidden acceptance claims.
