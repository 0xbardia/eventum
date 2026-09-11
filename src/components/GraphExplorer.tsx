"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { RelationBadge } from "@/components/RelationBadge";
import { shortHash, shortText } from "@/lib/format";
import type { GraphEdge, MarketSnapshot } from "@/lib/types";

type GraphMarketLabel = Pick<MarketSnapshot, "title" | "platform">;

export function GraphExplorer({ edges, markets = {} }: { edges: GraphEdge[]; markets?: Record<string, GraphMarketLabel> }) {
  const [selected, setSelected] = useState<GraphEdge | null>(edges[0] || null);
  const nodes = useMemo(() => Array.from(new Set(edges.flatMap((edge) => [edge.snapshotAId, edge.snapshotBId]))), [edges]);

  if (!edges.length) return <div className="empty-state"><h2>Direct graph is empty</h2><p>Only persisted consensus-backed comparisons appear here. Eventum never fills the canvas with inferred transitive edges.</p></div>;

  const positions = nodes.map((node, index) => ({
    node,
    left: nodes.length === 2 ? (index === 0 ? 25 : 75) : 12 + ((index * 31) % 76),
    top: nodes.length === 2 ? 46 : 19 + ((index * 47) % 65),
  }));

  return (
    <div className="graph-layout">
      <div className="graph-mobile-list" aria-label="Accessible direct relationship list">
        {edges.map((edge) => <Link href={`/comparisons/${edge.comparisonId}`} key={edge.comparisonId}><span className="section-kicker">DIRECT EDGE</span><strong>{shortText(markets[edge.snapshotAId]?.title || shortHash(edge.snapshotAId, 7), 34)} <span aria-hidden="true">{edge.relation === "SUBSET" ? "⊂" : edge.relation === "SUPERSET" ? "⊃" : "↔"}</span> {shortText(markets[edge.snapshotBId]?.title || shortHash(edge.snapshotBId, 7), 34)}</strong><RelationBadge relation={edge.relation} /><small>{edge.safeToCompare ? "Safe to compare" : "Not safe to compare"} · {edge.safeToAggregate ? "Aggregatable" : "Aggregation not authorized"}</small></Link>)}
      </div>
      <div className="graph-canvas" aria-label="Interactive direct comparison graph">
        <svg className="graph-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <defs><marker id="eventum-edge-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M1 1 7 4 1 7" fill="none" stroke="var(--color-accent)" strokeWidth="1.2" /></marker></defs>
          {edges.map((edge) => {
            const a = positions.find((item) => item.node === edge.snapshotAId);
            const b = positions.find((item) => item.node === edge.snapshotBId);
            if (!a || !b) return null;
            return <line className="graph-edge-line" key={edge.comparisonId} x1={a.left} y1={a.top} x2={b.left} y2={b.top} markerEnd="url(#eventum-edge-arrow)" />;
          })}
        </svg>
        {edges.map((edge) => {
          const a = positions.find((item) => item.node === edge.snapshotAId);
          const b = positions.find((item) => item.node === edge.snapshotBId);
          if (!a || !b) return null;
          return <span className="graph-edge-label" key={`${edge.comparisonId}-label`} style={{ left: `${(a.left + b.left) / 2}%`, top: `${(a.top + b.top) / 2}%` }}>{edge.relation}</span>;
        })}
        {positions.map((item) => (
          <button
            key={item.node}
            type="button"
            className="graph-ui-node"
            style={{ left: `${item.left}%`, top: `${item.top}%` }}
            onClick={() => setSelected(edges.find((edge) => edge.snapshotAId === item.node || edge.snapshotBId === item.node) || null)}
          >
            <small>{markets[item.node]?.platform || "Snapshot"}</small>
            <strong>{shortText(markets[item.node]?.title || shortHash(item.node, 7), 38)}</strong>
            <span className="mono">{shortHash(item.node, 7)}</span>
          </button>
        ))}
      </div>
      <aside className="panel">
        <div className="panel-header"><h2>Direct edges</h2><p>{edges.length} consensus-backed relationship{edges.length === 1 ? "" : "s"}; no inferred closure.</p></div>
        <div className="panel-body">
          <div className="graph-list">
            {edges.map((edge) => <button type="button" key={edge.comparisonId} onClick={() => setSelected(edge)}><RelationBadge relation={edge.relation} /><div className="mono graph-edge-summary">{shortHash(edge.snapshotAId, 5)} <span aria-hidden="true">→</span> {shortHash(edge.snapshotBId, 5)}</div></button>)}
          </div>
          {selected && <div className="result-card graph-selected" style={{ marginTop: 16, padding: 16 }}><h3>Selected edge</h3><p className="mono hash-wrap">{selected.comparisonId}</p><p>{selected.safeToAggregate ? "Aggregation identity marked safe." : "Aggregation not authorized by this edge."}</p><Link className="text-link" href={`/comparisons/${selected.comparisonId}`}>Inspect result <span aria-hidden="true">→</span></Link></div>}
        </div>
      </aside>
    </div>
  );
}
