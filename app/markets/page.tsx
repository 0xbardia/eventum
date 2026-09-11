import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { ServerEmpty } from "@/components/ServerEmpty";
import { ContractError, getSnapshot, readContract } from "@/lib/genlayer";
import { log } from "@/lib/logger";
import type { MarketSnapshot } from "@/lib/types";
import { formatDate, shortHash, shortText } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MarketsPage() {
  let markets: MarketSnapshot[] = [];
  let state: "ready" | "unconfigured" | "unavailable" = "ready";
  try {
    const ids = await readContract("get_market_ids", [0, 20]);
    if (!Array.isArray(ids)) throw new Error("Invalid market index");
    markets = await Promise.all(ids.map((id) => getSnapshot(String(id))));
  } catch (error) {
    if (!(error instanceof ContractError)) throw error;
    state = error.code === "CONTRACT_NOT_CONFIGURED" ? "unconfigured" : "unavailable";
    if (state === "unavailable") log("error", "Market registry read unavailable", { code: error.code, status: error.status });
  }
  return (
    <main className="page-shell">
      <section className="route-header"><div className="container"><div className="eyebrow">EVENTUM / MARKET SNAPSHOTS</div><h1>Published state, preserved.</h1><p>These are immutable market snapshots registered on the configured contract. A changing source becomes a new version; it never rewrites history.</p></div></section>
      <section className="container" style={{ padding: "30px 0 80px" }}>
        {state !== "ready" ? <ServerEmpty title={state === "unconfigured" ? "Contract not configured" : "Registry temporarily unavailable"} detail={state === "unconfigured" ? "The registry does not substitute an offchain record for an onchain read." : "The configured contract did not answer this finalized read. Check Status and try again; no cached relationship is shown as authoritative."} action="/status" /> : markets.length === 0 ? <ServerEmpty title="No onchain snapshots yet" detail="The graph and registry stay empty until a real wallet registers evidence on the deployed contract." /> : <div className="list-grid">{markets.map((market) => <Link className="list-card" href={`/markets/${market.snapshotId}`} key={market.snapshotId}><div className="eyebrow">{market.platform} · v{market.version}</div><h2>{market.title}</h2><p>{shortText(market.description)}</p><div className="data-list"><div><dt>Close</dt><dd>{formatDate(market.closeTime)}</dd></div><div><dt>Snapshot</dt><dd className="mono">{shortHash(market.snapshotId)}</dd></div></div><div style={{ marginTop: 18, color: "var(--color-primary)", fontSize: ".8rem", fontWeight: 800 }}>Inspect snapshot <ArrowUpRight size={14} aria-hidden="true" style={{ verticalAlign: "-3px" }} /></div></Link>)}</div>}
      </section>
    </main>
  );
}
