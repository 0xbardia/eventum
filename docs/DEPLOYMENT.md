# Deployment

## Contract release

The exact tested `contracts/eventum.py` source hash is recorded in
`deployments/studionet.json`. The current finalized Studionet deployment is:

```text
address: 0xB4260CDFf766Bf56C2C623A748082a51932870F8
network: studionet
chain: 61999
rpc: https://studio.genlayer.com/api
source sha256: f92810de3e381bea9938fc38c55b2ba0625274f239ecf617905539019f5496d4
deployment tx: 0x06e4b609359b0d2c06c76523de261f5519ac41496966d25970f7024af44b8a1a
deployment execution hash: 0xb517ce1138ca86fd753e4570ca277c5a1b8219e03807e257d6df9c101b3ee9ba
status: FINALIZED / MAJORITY_AGREE
```

The earlier `0x04435B28bA9c57A7abFA1eb6b804218fca67249c` deployment is retained
only as historical lineage in `deployments/studionet.json`.

Use the current official [Studio deployment flow](https://docs.genlayer.com/developers/intelligent-contracts/tools/genlayer-studio/deploying-contract)
or the pinned CLI only after Direct Mode tests and source-hash review pass.
Never deploy an untested prompt change and never replace the address in
production without updating the evidence file and rerunning every read/write
gate.

## Application release

```bash
cd /root/eventum
pnpm install --frozen-lockfile
pnpm typecheck && pnpm lint && pnpm test
pnpm contract:lint && pnpm contract:test
pnpm build
pm2 start ecosystem.config.cjs --only eventum
pm2 save
```

The application binds only to the configured `APP_HOST`/`APP_PORT` listener.
`ecosystem.config.cjs` is a dedicated PM2 process and does not manage any other
application.

## Environment

Create the only runtime configuration file from the safe template:

~~~
cp .env.example .env
chmod 600 .env
~~~

The application validates configuration during Next.js config loading and again
at server access boundaries. Missing required values, invalid URLs/addresses,
invalid numeric limits, or server/public GenLayer drift fail closed.

| Variable group | Variables | Visibility | Required |
|---|---|---|---|
| Application | `NODE_ENV`, `APP_ENV`, `APP_URL`, `APP_HOST`, `APP_PORT`, `DATABASE_PATH`, `LOG_LEVEL` | Server/framework | Yes |
| GenLayer runtime | `GENLAYER_NETWORK`, `GENLAYER_RPC_URL`, `GENLAYER_CHAIN_ID`, `GENLAYER_CONTRACT_ADDRESS`, `GENLAYER_EXPLORER_URL`, `GENLAYER_STUDIO_URL` | Server; safe subset returned at runtime | Yes in production |
| Provider | `POLYMARKET_GAMMA_API_BASE_URL`, `POLYMARKET_GAMMA_API_ALLOWED_HOSTS`, `POLYMARKET_ALLOWED_HOSTS` | Server | Yes |
| Limits | `FETCH_TIMEOUT_MS`, `FETCH_MAX_BYTES`, `MAX_REQUEST_BODY_BYTES`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX` | Server | Yes |
| Verification fixtures | `EVENTUM_VERIFY_SNAPSHOT_A`, `EVENTUM_VERIFY_SNAPSHOT_B`, `EVENTUM_VERIFY_COMPARISON_ID` | Optional deployment tooling | Only for a populated deployment with matching fixture IDs |
| Deployment secret | `DEPLOYER_PRIVATE_KEY` | Server only | Optional; no application runtime use |

The canonical `GENLAYER_*` values are loaded from `.env` by
`scripts/run-next.cjs` at process start. The browser fetches the safe subset
from `GET /api/runtime-config` with no-store caching. Changing
`GENLAYER_CONTRACT_ADDRESS` and restarting only `eventum` is therefore enough;
the already-built browser bundle contains no contract address. Do not put
`DEPLOYER_PRIVATE_KEY`, API keys, passwords, or other secrets in public
variables. The current `.env.example` contains no secret values.

After a future contract deployment, update the canonical runtime variables to
the new verified address, restart only `eventum`, and rerun the deployment
provenance plus read/write verification gates. A rebuild is needed for code
changes, not for a runtime address rotation. Never use a fallback address.

## Reverse proxy

The Eventum nginx vhost proxies `eventum.bydx.fun` to `127.0.0.1:4187`, adds
compatible security headers, preserves WebSocket/streaming upgrade headers,
and redirects HTTP to HTTPS. Before changing nginx, back up only the Eventum
file, run `nginx -t`, and reload the existing master with `nginx -s reload` on
this host (the systemd unit is inactive). Existing vhosts must remain
untouched.

## Rollback

Keep the previous Eventum build and vhost backup. To roll back, stop only the
`eventum` PM2 process, restore the prior Eventum release files, validate the
vhost, and start the same process. A contract deployment is immutable; a
rollback changes the configured read/write address only after a separately
verified deployment record exists.
