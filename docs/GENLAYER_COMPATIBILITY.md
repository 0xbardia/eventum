# GenLayer compatibility record

Verified 2026-09-11 UTC against the current official documentation and the
installed toolchain. Version-sensitive facts should be rechecked before a
future contract redeploy.

## Network

| Environment | RPC | Chain ID | Status |
|---|---|---:|---|
| Studionet | `https://studio.genlayer.com/api` | `61999` | deployed and verified |
| Bradbury | `https://rpc-bradbury.genlayer.com` | `4221` | optional follow-up; not required for release |
| Studio-dev | `https://studio-dev.genlayer.com/api` | `61997` | RC/development environment |

Official references: [networks](https://docs.genlayer.com/developers/networks),
[Intelligent Contract introduction](https://docs.genlayer.com/developers/intelligent-contracts/introduction),
[testing](https://docs.genlayer.com/developers/intelligent-contracts/testing),
[deployment](https://docs.genlayer.com/developers/intelligent-contracts/tools/genlayer-studio/deploying-contract),
[GenLayerJS](https://docs.genlayer.com/developers/decentralized-applications/genlayer-js).

## Installed versions

- `genlayer` CLI `0.39.2`
- `genlayer-js` `1.1.8`
- `genlayer-test` `0.29.2`
- `genvm-linter` `0.11.0`
- contract dependency pin `py-genlayer` magic comment:
  `1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`

The npm `latest` tag was `genlayer-js@1.1.8` at this verification date;
`2.0.0-rc.1` was a prerelease. Eventum stays on the stable tag because its
current `createClient`/`readContract`/`writeContract`/finalization path is
deployed and verified on Studionet. The current docs describe the v2 fee
estimation flow; the installed stable v1 package exposes no compatible fee
estimator, and the recorded Studionet writes finalized with zero native value.
Re-profile fees before adopting v2 or a fee-charging deployment.

## API decisions

The deployed source uses the current contract decorators
`@gl.public.view`/`@gl.public.write`, `gl.vm.run_nondet_unsafe`, and
`gl.nondet.exec_prompt(..., response_format="json")`. The frontend and read
verifier use `createClient`, `readContract`, `writeContract`,
`waitForTransactionReceipt`, and `TransactionHashVariant.LATEST_FINAL` from
the installed GenLayerJS package. `TransactionHashVariant` is imported from
`genlayer-js/types`; it is not a top-level export in the pinned package.

The wallet flow waits for `TransactionStatus.FINALIZED` and requires
`ExecutionResult.FINISHED_WITH_RETURN` before rendering success. Reads use an
account-free client and the latest finalized variant.

The prior Studio write flow for the superseded populated fixture accepted zero
native value and returned finalized majority-agree receipts. The submitted
operator deployment now has certified finalized snapshot and comparison writes;
the current browser flow still requires a funded wallet for new writes. No
undocumented fee API was invented; fee/transaction behavior should be
re-profiled when the network or SDK changes.

## Current verified deployment

- address: `0x96F23489C251135965b13303A991b2B9579bdF19`
- protocol: `eventum/1.1.1`
- source SHA-256: `4c198184c7a48485cba207c5f6037cd701e27c69c4ab76192a5bfd76803434d5`
- deployment transaction: `0x77b3c1a0361a3bb1c3ade7618210b4c202356ba645be7ce88b744fdf1579a3e7`
- deployment status/result: `FINALIZED / MAJORITY_AGREE`
- deployment execution hash: not recorded in the repository evidence
- verification date: `2026-09-20 UTC`

The source hash, transaction evidence, and all read/write results are
maintained in `deployments/studionet.json` and `docs/STUDIO_VERIFICATION.md`.

## Test environment note

`genlayer-test==0.29.2` expected a runner archive named
`genvm-universal.tar.xz`, while the official v0.3.0-rc7 release exposed
`genvm-runners-all.tar.xz`. The official archive was downloaded into the
Direct Mode cache with the expected local filename. This is a reproducible
environment workaround, not a contract modification.

## RPC operating note

The unauthenticated Studionet endpoint returned `Rate limit exceeded: 30
requests per minute` during burst QA and later `Rate limit exceeded: 500
requests per hour` from the shared release host. Release browser runs are
therefore serialized and the application surfaces unavailable reads instead
of substituting cache data. A future high-traffic deployment needs an
approved RPC quota or provider plan; this is an external network limit, not a
contract result.
