# Operations

## Health checks

```bash
curl -fsS https://eventum.bydx.fun/api/health
curl -fsS https://eventum.bydx.fun/api/status
pm2 show eventum
pm2 logs eventum --lines 100 --nostream
```

`/api/health` checks the local atomic cache. `/api/status` performs a finalized
read of the configured contract and is the protocol reachability check. A 200
health response alone does not prove GenLayer reachability.

## Runtime model

There is one PM2 process named `eventum`, one localhost-only listener controlled
by `APP_HOST`/`APP_PORT`, and one JSON cache path controlled by
`DATABASE_PATH`. Logs are structured JSON from route failures and do not
include private environment values or raw provider payloads. Provider requests
are bounded and rate-limited per forwarded/request address.

The runtime reads `.env` through the small Next launcher. Keep `.env` mode
`0600`; never expose `DEPLOYER_PRIVATE_KEY` to the browser. If a GenLayer
address, chain, network, or RPC changes, update the canonical `GENLAYER_*`
variables and restart only `eventum`. The browser reloads its safe configuration
from `/api/runtime-config`; no rebuild is needed for an environment-only
rotation. The process fails configuration validation instead of selecting a
different contract.

For a contract rotation, record the value before restart, run
`pm2 restart eventum`, then check `/api/health`, `/api/status`, and
`/api/runtime-config`. Confirm the reported address and protocol before opening
the write flow.

## Cache care

The cache directory is mode `0700`; the file is mode `0600`. It may be backed up
before maintenance. Deleting it removes previews/cache metadata only, not
onchain snapshots or comparisons. On restart, an empty cache is valid and the
contract remains the source of truth.

## Incident handling

1. Check `pm2 show eventum` and `/api/health`.
2. Check `/api/status` and the configured RPC.
3. Inspect only Eventum logs and the Eventum nginx vhost.
4. If the provider is down, keep the app up and surface provider errors.
5. If the contract is unreachable, do not substitute cached relationship data
   as authoritative.
6. Record transaction hashes and external outages in the release evidence.

The public Studionet RPC can return `30 requests per minute` and
`500 requests per hour` rate-limit errors. Serialize release probes, avoid
polling every page aggressively, and obtain an approved higher-quota RPC
configuration before operating at sustained traffic.
