# Quickstart: Eventum

```sh
cd /root/eventum
cp .env.example .env
python3 -m venv .venv
.venv/bin/pip install -r contracts/requirements-dev.txt
pnpm install
pnpm contract:test
pnpm lint
pnpm typecheck
pnpm build
pnpm start
```

The local app is expected at `http://localhost:4187`. The checked-in example
points at the verified Studionet deployment for read-only inspection. Writes
still require an EIP-1193 wallet on chain `61999`; if the address is removed,
the app deliberately shows a configuration state and does not fabricate
comparisons.
