# Research Notes: Eventum Protocol

## GenLayer source-of-truth findings

Verified against current official GenLayer documentation and the official
`genlayerlabs/genlayer-js` and `genlayerlabs/genlayer-cli` repositories on
2026-09-09.

- An Intelligent Contract extends `gl.Contract`, uses `from genlayer import *`,
  and marks public reads/writes with `@gl.public.view` and `@gl.public.write`.
- Persistent state must use GenLayer storage types such as `TreeMap` and
  `DynArray`, with storage-safe dataclasses when structured records are needed.
- Nondeterministic web and LLM work must occur inside a function passed to the
  Equivalence Principle / VM nondeterministic runner. Storage is copied into
  memory before entering that boundary and mutations happen after consensus.
- `gl.nondet.exec_prompt(..., response_format="json")` gives structured model
  data, but the contract must still validate enums, bounds, outcome keys, and
  stable decision fields.
- A custom leader/validator path is appropriate here: validators independently
  re-evaluate the same evidence and compare canonical stable fields; rationale
  is not consensus identity.
- Direct Mode is deterministic and useful for contract logic and mocked
  nondeterminism. It does not replace real Studio consensus verification.
- Studionet is the current stable Studio network: RPC
  `https://studio.genlayer.com/api`, chain ID `61999`; Bradbury is chain ID
  `4221` at `https://rpc-bradbury.genlayer.com`.

## Provider findings

The public Polymarket Gamma endpoint
`https://gamma-api.polymarket.com/markets?limit=1&active=true` returned a real
JSON market on 2026-09-08. Its record exposes a provider ID, question,
description, outcomes, start/end dates, resolution source, and event metadata.
The adapter treats all returned text as untrusted evidence and does not use
prices or liquidity as semantic inputs.

## Decision log

- One verified provider beats several unverified adapters.
- Direct graph edges beat an unjustified equivalence cluster.
- Safe structured output beats a confidence score.
- An atomic JSON cache beats a new database service for this single-process
  deployment.
