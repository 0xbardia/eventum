# Clarification Record: Eventum Protocol

**Date**: 2026-09-08  
**Status**: Resolved by repository, current GenLayer documentation, and
product constraints; no open clarification markers remain.

## Decisions

1. **Graph semantics**: Store and display direct comparison edges only. No
   union-find or transitive closure is allowed in version 1; all-pairs proof is
   deferred because it would add an unsafe and expensive merge policy.
2. **Evidence source**: Ship one verified Polymarket Gamma adapter. Unsupported
   providers receive an explicit response instead of brittle scraping. A
   manual evidence import is deferred until an actual integration requires it.
3. **Persistence**: Use a permission-restricted atomic JSON file for the single
   application process's raw evidence/cache and keep the contract authoritative.
   SQLite/PostgreSQL are not justified by the initial deployment shape.
4. **Consensus result**: Persist bounded stable fields, not arbitrary model
   output or confidence. Free-form rationale is explanatory and never drives
   relation or aggregation safety.
5. **Identity**: Derive snapshot IDs and canonical event keys deterministically
   in contract code. Never accept an LLM-invented identifier as authoritative.
6. **Operations**: Studionet is the required deployment target. Bradbury is an
   optional follow-up and does not conceal an external network or credential
   outage.
7. **Economic scope**: No token, staking, governance, admin override, or
   challenge path is included in the minimum protocol.
8. **Aggregation identity**: A consensus response cannot authorize aggregation
   merely by setting a boolean. The contract requires equal outcome
   cardinality, complete coverage, one-to-one mapping, and a safe derived
   identity before persisting `safe_to_aggregate=true`.
