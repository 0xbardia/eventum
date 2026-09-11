# Tasks: Eventum Protocol and Product

## Phase 1 - Contract first

- [X] T001 Create pinned contract development requirements in
  `contracts/requirements-dev.txt` and a Direct Mode pytest configuration.
- [X] T002 Implement bounded validation, canonical JSON, IDs, and storage
  records in `contracts/eventum.py`.
- [X] T003 Implement public snapshot registration and version/history reads in
  `contracts/eventum.py`.
- [X] T004 Implement strict prompt construction, independent validation, and
  consensus-backed comparison persistence in `contracts/eventum.py`.
- [X] T005 Implement reverse relationship reads and direct-edge graph reads in
  `contracts/eventum.py`.
- [X] T006 Add normal, invariant, malformed, injection, and graph tests under
  `tests/contract/`.

## Phase 2 - Review and deploy

- [X] T007 Run contract lint/static checks and a dedicated internal security
  review; write `docs/CONTRACT_SECURITY.md`.
- [X] T008 Deploy the exact tested source to Studionet when credentials/wallet
  authority is available and write `deployments/studionet.json`.
- [X] T009 Exercise every deployed public read and meaningful write; write
  `docs/STUDIO_VERIFICATION.md` and fee evidence if applicable.

## Phase 3 - Backend boundary

- [X] T010 Implement environment validation, JSON logging, and the permission-
  restricted atomic JSON cache in `src/lib/`.
- [X] T011 Implement SSRF-safe Polymarket URL resolution and normalized evidence
  in `src/lib/providers/polymarket.ts`.
- [X] T012 Implement API routes for health, status, resolution, preparation,
  contract reads, and direct graph projection.
- [X] T013 Add backend tests for malformed bodies, SSRF, provider failures,
  limits, cache staleness, and contract response failures.

## Phase 4 - Application

- [X] T014 Build the editorial infrastructure landing page using the persisted
  Eventum design system and accessible semantic components.
- [X] T015 Build `/compare` preview, wallet, lifecycle, and result handoff using
  the real configured GenLayerJS client.
- [X] T016 Build market, comparison, graph, docs, and status routes with honest
  empty/unavailable states and mobile fallbacks.
- [X] T017 Add frontend tests for rendering untrusted text, wrong-network and
  wallet states, route errors, and keyboard/focus behavior.

## Phase 5 - Release and convergence

- [X] T018 Create all required operational/protocol/submission docs and update
  them from actual implementation evidence.
- [X] T019 Run format, lint, typecheck, tests, build, audit, and dependency
  review; fix material warnings.
- [X] T020 Run local production Chromium QA at all required viewports, capture
  screenshots, and fix runtime/overflow/accessibility defects.
- [X] T021 Deploy with a dedicated localhost-only process and eventum nginx
  vhost only after DNS/IP and config validation; verify HTTPS.
- [X] T022 Run production Chromium QA on every main route and record evidence.
- [X] T023 Perform skeptical GenLayer review and write
  `docs/GENLAYER_REVIEW_GATE.md`, then complete `docs/GENLAYER_SUBMISSION.md`
  and this convergence checklist.
