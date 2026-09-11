# Implementation record: Eventum

The implementation follows the approved contract-first plan.

## Completed slices

1. `contracts/eventum.py` implements bounded immutable snapshots, deterministic
   IDs and versions, strict structured consensus adjudication, safe failures,
   inverse relationships, and direct graph edges.
2. `tests/contract/test_eventum.py` provides 35 Direct Mode cases spanning
   normal semantics, invariants, hostile evidence, output failures, consensus,
   and graph non-transitivity.
3. `src/lib/providers/polymarket.ts` is the one verified public adapter with
   URL canonicalization and SSRF defenses. `src/lib/api.ts` and route handlers
   apply body schemas, rate limits, safe errors, and onchain reads.
4. `src/lib/db.ts` is a small permission-restricted atomic JSON cache. It does
   not override finalized contract state and does not create a second relation
   engine.
5. Next.js routes and React components implement evidence preview, wallet
   lifecycle, finalized result permalink, market registry, direct graph,
   docs, status, and honest unavailable states.
6. The exact source hash was deployed to Studionet and all public reads and
   meaningful writes were verified; evidence is in `deployments/` and
   `docs/STUDIO_VERIFICATION.md`.
7. PM2, nginx, HTTPS, and Chromium production QA are release gates recorded in
   the operational docs.

## Deliberate omissions

No token, staking, governance, microservice, SQL database, fake provider,
automatic graph closure, confidence score, or challenge economics was added.
Each would expand protocol risk without a release requirement.
