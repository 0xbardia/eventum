# Polymarket Provider ↔ Frozen Contract Field Matrix

This is the focused registration compatibility audit for protocol
`eventum/1.1.1` at `0x96F23489C251135965b13303A991b2B9579bdF19`.

The adapter produces the registration arguments in `src/lib/db.ts` from the
normalized evidence in `src/lib/providers/polymarket.ts`. The frozen contract
accepts the same 16 positional fields in
`contracts/eventum.py::register_market_snapshot`.

| Registration field | Adapter representation | Frozen contract expectation | Classification |
|---|---|---|---|
| `platform` | Constant `polymarket` | Supported provider, normalized and validated | EXACTLY ALIGNED |
| `platform_market_id` | Gamma `id` as a string | Source market ID used for Gamma corroboration | EXACTLY ALIGNED |
| `source_url` | Canonical HTTPS Polymarket URL | Allowlisted host and path identifying the source market | EXACTLY ALIGNED |
| `title` | Gamma `question` | Must match corroborated Gamma question | EXACTLY ALIGNED |
| `description` | Gamma `description` | Must match corroborated Gamma description | EXACTLY ALIGNED |
| `outcomes_json` | `JSON.stringify(evidence.outcomes)` | JSON array parsed and validated by the contract | EXACTLY ALIGNED |
| `resolution_rules` | Same Gamma description | Must match corroborated Gamma description | EXACTLY ALIGNED |
| `resolution_source` | Gamma `resolutionSource`, or empty string | Optional; non-empty value must match Gamma | OPTIONAL |
| `open_time` | Gamma `startDate` verbatim | Compared with corroborated Gamma `startDate` | EXACTLY ALIGNED |
| `close_time` | Gamma `endDate` verbatim | Compared with corroborated Gamma `endDate` | EXACTLY ALIGNED |
| `resolution_deadline` | Empty string | Optional bounded text; not provided by this adapter | OPTIONAL |
| `clarifications` | Empty string | Optional bounded text; not provider corroboration | OPTIONAL |
| `retrieved_at` | Server retrieval timestamp | Required bounded text; excluded from snapshot identity | METADATA ONLY |
| `source_hash` | SHA-256 of canonical full Gamma payload | Must be a 64-character hex string; authoritative corroboration hash is contract-derived | METADATA ONLY |
| `normalized_facts_json` | Canonical JSON of normalized provider facts | Bounded JSON object; threshold is checked when present | METADATA ONLY |
| `canonical_event_hint` | Parent event identity hint, normally `polymarket:event:<id>` | Must be compatible with corroborated parent evidence, then contract-derived | EXACTLY ALIGNED on verified parent-ID path |

## Time-field invariant

`startDate` and `endDate` are copied without conversion. The adapter does not
substitute `startDateIso` or `endDateIso`, and missing authoritative fields stay
empty. This preserves representation identity across Gamma → adapter payload →
contract corroboration.
