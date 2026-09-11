import { dbHealth } from "@/lib/db";
import { getContractStatus } from "@/lib/genlayer";
import { StatusPanel } from "@/components/StatusPanel";

export const dynamic = "force-dynamic";

export default async function StatusPage() {
  const [contract, database] = await Promise.all([
    getContractStatus(),
    Promise.resolve().then(() => {
      try {
        return dbHealth();
      } catch {
        return false;
      }
    }),
  ]);
  return <main className="page-shell"><section className="route-header"><div className="container"><div className="eyebrow">EVENTUM / STATUS</div><h1>Operational truth.</h1><p>Live configuration and reachability checks. A green cache does not imply a live contract.</p></div></section><section className="container status-grid"><StatusPanel status={contract} /><div className="status-card"><div className="status-dot" style={{ color: database ? "#166534" : "#b42318" }}>{database ? "Cache healthy" : "Cache unavailable"}</div><h2 style={{ marginTop: 18 }}>Offchain cache</h2><p>Raw provider payloads and previews are convenience state. The contract remains authoritative for semantic relationships.</p><div className="data-list"><div><dt>File-backed cache</dt><dd>{database ? "Available" : "Unavailable"}</dd></div><div><dt>Provider</dt><dd>Polymarket Gamma API</dd></div><div><dt>Writes</dt><dd>{contract.configured ? "Wallet + contract" : "Disabled"}</dd></div></div><div className="notice" style={{ marginTop: 20 }}>Status checks never publish a fabricated comparison. See the deployment evidence in the repository for transaction-level verification.</div></div></section></main>;
}
