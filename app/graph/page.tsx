import { GraphExplorer } from "@/components/GraphExplorer";
import { ContractError, getGraphEdges, getSnapshot } from "@/lib/genlayer";
import { log } from "@/lib/logger";
import type { GraphEdge, MarketSnapshot } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function GraphPage() {
  let edges: GraphEdge[] = [];
  let markets: Record<string, Pick<MarketSnapshot, "title" | "platform">> = {};
  let state: "ready" | "unconfigured" | "unavailable" = "ready";
  try { edges = await getGraphEdges(); } catch (error) {
    if (!(error instanceof ContractError)) throw error;
    state = error.code === "CONTRACT_NOT_CONFIGURED" ? "unconfigured" : "unavailable";
    if (state === "unavailable") log("error", "Graph read unavailable", { code: error.code, status: error.status });
  }
  if (state === "ready" && edges.length) {
    const ids = Array.from(new Set(edges.flatMap((edge) => [edge.snapshotAId, edge.snapshotBId])));
    const loaded = await Promise.allSettled(ids.map((id) => getSnapshot(id)));
    markets = Object.fromEntries(loaded.flatMap((result) => result.status === "fulfilled" ? [[result.value.snapshotId, { title: result.value.title, platform: result.value.platform }]] : []));
  }
  return <main className="page-shell graph-page"><section className="route-header"><div className="container"><div className="eyebrow">EVENTUM / EQUIVALENCE GRAPH</div><h1>Edges you can inspect.</h1><p>{state === "ready" ? "A graph projection of direct onchain comparisons. Select an edge to inspect its relationship; no edge here implies a transitive conclusion." : state === "unconfigured" ? "The graph becomes live when a real deployment is configured. Its empty state is intentional, not generated demo data." : "The configured contract did not answer this finalized read. Check Status and try again; no inferred edge is shown."}</p></div></section><section className="container" style={{ paddingTop: 30 }}>{state === "ready" ? <GraphExplorer edges={edges} markets={markets} /> : <div className="empty-state"><h2>{state === "unconfigured" ? "Contract not configured" : "Graph temporarily unavailable"}</h2><p>{state === "unconfigured" ? "Eventum does not substitute cached relationships for contract state." : "The direct graph is unavailable until the contract read succeeds."}</p></div>}</section></main>;
}
