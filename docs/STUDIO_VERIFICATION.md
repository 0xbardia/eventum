# Studionet verification

Current verified deployment: `0xB4260CDFf766Bf56C2C623A748082a51932870F8` on
Studionet chain `61999`, using
`https://studio.genlayer.com/api` and GenLayerJS `1.1.8`.

The local `contracts/eventum.py` source and deployed contract source have the
same SHA-256:
`f92810de3e381bea9938fc38c55b2ba0625274f239ecf617905539019f5496d4`.

Deployment transaction:
`0x06e4b609359b0d2c06c76523de261f5519ac41496966d25970f7024af44b8a1a`  
Execution hash:
`0xb517ce1138ca86fd753e4570ca277c5a1b8219e03807e257d6df9c101b3ee9ba`  
Deployment lifecycle: `FINALIZED / MAJORITY_AGREE`.

The older `0x04435B28bA9c57A7abFA1eb6b804218fca67249c` deployment and earlier
addresses remain historical lineage only; they are not current runtime or
wallet targets.

## Public read-method matrix

All 11 public reads are exercised with
`TransactionHashVariant.LATEST_FINAL`. The current populated state includes
two finalized snapshots, one accepted comparison, and one direct graph edge.

| Method | Result |
|---|---|
| `get_protocol_version` | `eventum/1.0.0` |
| `get_market_count` | `2` |
| `get_comparison_count` | `1` |
| `get_market_snapshot` | Snapshot A and B read back |
| `get_latest_market_snapshot` | Snapshot A and B latest pointers match |
| `get_market_ids` | Both snapshot IDs returned |
| `get_comparison` | Accepted comparison read back |
| `get_latest_comparison` | Pair lookup returns the accepted comparison |
| `get_relationship` | Directional relationship returned |
| `get_comparison_ids` | Accepted comparison ID returned |
| `get_graph_edges` | One direct edge returned |

Absent-object reads continue to fail closed with the SDK's expected contract
execution error rather than creating placeholder records.

## Current live evidence

The exact snapshot and comparison transaction hashes, IDs, semantic fields,
reverse relationship, and production route checks are maintained in the
release evidence under `artifacts/` and are also verifiable through `/status`,
`/markets`, `/comparisons`, and `/graph` in the live application.

The current deployment is immutable. Contract changes require a new source
hash, a new deployment, source provenance, runtime migration, and a fresh
read/write certification.
