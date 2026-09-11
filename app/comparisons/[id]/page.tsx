import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";
import { MarketPreview } from "@/components/MarketPreview";
import { RelationBadge } from "@/components/RelationBadge";
import { ServerEmpty } from "@/components/ServerEmpty";
import { getComparison, getSnapshot } from "@/lib/genlayer";
import type { Comparison, MarketSnapshot, Relation } from "@/lib/types";
import { formatDate, shortText } from "@/lib/format";

export const dynamic = "force-dynamic";

function relationSymbol(relation: Relation) {
  if (relation === "EQUIVALENT" || relation === "CONDITIONAL_EQUIVALENT") return "=";
  if (relation === "SUBSET") return "⊂";
  if (relation === "SUPERSET") return "⊃";
  if (relation === "OVERLAPPING") return "∩";
  if (relation === "CONFLICTING") return "×";
  return "?";
}

function compactTitle(title: string) {
  return shortText(title.replace(/^Will\s+/i, "").replace(/[?]$/, ""), 52);
}

function thresholdText(title: string) {
  return title.match(/\$\s?[\d,.]+(?:[KMB])?/i)?.[0] || "Not explicit";
}

function thresholdValue(value: string) {
  const match = value.replace(/[$,\s]/g, "").match(/^([\d.]+)([KMB])?$/i);
  if (!match) return null;
  const multiplier = match[2]?.toUpperCase() === "B" ? 1_000_000_000 : match[2]?.toUpperCase() === "M" ? 1_000_000 : match[2]?.toUpperCase() === "K" ? 1_000 : 1;
  return Number(match[1]) * multiplier;
}

function directionText(relation: Relation, a: MarketSnapshot, b: MarketSnapshot) {
  const left = compactTitle(a.title);
  const right = compactTitle(b.title);
  if (relation === "SUBSET") return `${left} is contained by ${right}. Every positive settlement in Market A is positive in Market B; the reverse is not guaranteed.`;
  if (relation === "SUPERSET") return `${left} contains ${right}. Market A admits every positive settlement in Market B, plus additional states.`;
  if (relation === "EQUIVALENT") return `${left} and ${right} share the same settlement meaning under the published evidence.`;
  if (relation === "CONDITIONAL_EQUIVALENT") return `${left} and ${right} align only under the conditions recorded in the evidence.`;
  return `Eventum recorded ${relation.replaceAll("_", " ")} for this exact snapshot order. Read the material differences before reusing the edge.`;
}

function directionLabel(relation: Relation) {
  if (relation === "SUBSET") return "Market A is contained by Market B";
  if (relation === "SUPERSET") return "Market A contains Market B";
  if (relation === "EQUIVALENT") return "Market A and Market B settle alike";
  if (relation === "CONDITIONAL_EQUIVALENT") return "Market A and Market B align conditionally";
  return `Market A → Market B: ${relation.replaceAll("_", " ")}`;
}

function DifferenceTable({ a, b }: { a: MarketSnapshot; b: MarketSnapshot }) {
  const thresholdA = thresholdText(a.title);
  const thresholdB = thresholdText(b.title);
  return <table className="difference-table"><thead><tr><th>Field</th><th>Market A</th><th>Market B</th></tr></thead><tbody><tr><th>Threshold</th><td className={thresholdA !== thresholdB ? "difference" : ""}>{thresholdA}</td><td className={thresholdA !== thresholdB ? "difference" : ""}>{thresholdB}</td></tr><tr><th>Window</th><td>{formatDate(a.openTime)} → {formatDate(a.closeTime)}</td><td>{formatDate(b.openTime)} → {formatDate(b.closeTime)}</td></tr><tr><th>Resolution source</th><td>{a.resolutionSource || a.providerLabel}</td><td>{b.resolutionSource || b.providerLabel}</td></tr><tr><th>Outcomes</th><td>{a.outcomes.join(" / ")}</td><td>{b.outcomes.join(" / ")}</td></tr></tbody></table>;
}

function ThresholdView({ a, b, relation }: { a: MarketSnapshot; b: MarketSnapshot; relation: Relation }) {
  const thresholdA = thresholdText(a.title);
  const thresholdB = thresholdText(b.title);
  const valueA = thresholdValue(thresholdA);
  const valueB = thresholdValue(thresholdB);
  if (valueA === null || valueB === null || valueA === valueB || !["SUBSET", "SUPERSET"].includes(relation)) return null;
  const min = Math.min(valueA, valueB);
  const span = Math.max(valueA, valueB) - min;
  const positionA = `${14 + ((valueA - min) / span) * 70}%`;
  const positionB = `${14 + ((valueB - min) / span) * 70}%`;
  const aIsLower = valueA < valueB;
  const lower = aIsLower ? thresholdA : thresholdB;
  const higher = aIsLower ? thresholdB : thresholdA;
  const middle = aIsLower ? ["NO", "YES"] : ["YES", "NO"];
  return <section className="threshold-compare" aria-label="Numeric threshold relationship"><div className="section-kicker">THRESHOLD INCLUSION</div><h3>One settlement set contains the other.</h3><p>The markers and state bands are derived from the published market titles; the contract relation remains authoritative.</p><div className="threshold-rail"><span className="threshold-marker threshold-marker-a" style={{ left: positionA }} data-label={thresholdA} /><span className="threshold-marker threshold-marker-b" style={{ left: positionB }} data-label={thresholdB} /></div><div className="threshold-legend"><span>lower threshold</span><span>higher threshold</span></div><div className="threshold-readout"><div className="section-kicker">WORLD-STATE ILLUSTRATION</div><table><thead><tr><th>BTC low</th><th>Market A</th><th>Market B</th></tr></thead><tbody><tr><th>≤ {lower}</th><td>YES</td><td>YES</td></tr><tr><th>{lower}–{higher}</th><td>{middle[0]}</td><td>{middle[1]}</td></tr><tr><th>&gt; {higher}</th><td>NO</td><td>NO</td></tr></tbody></table></div></section>;
}

export default async function ComparisonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let comparison: Comparison | null = null;
  let markets: [MarketSnapshot, MarketSnapshot] | null = null;
  try {
    const loaded = await getComparison(id);
    const loadedMarkets = await Promise.all([getSnapshot(loaded.snapshotAId), getSnapshot(loaded.snapshotBId)]);
    comparison = loaded;
    markets = loadedMarkets as [MarketSnapshot, MarketSnapshot];
  } catch {
    comparison = null;
  }
  if (!comparison || !markets) return <main className="page-shell"><section className="container empty-page"><ServerEmpty title="Comparison not available" detail="Only a finalized onchain comparison can become a shareable result page." /></section></main>;
  const [a, b] = markets;
  const symbol = relationSymbol(comparison.relation);
  return <main className="page-shell">
    <section className="result-page-header"><div className="container result-header-grid"><div><Link href="/compare" className="muted back-link-dark"><ArrowLeft size={14} aria-hidden="true" /> Compare</Link><div className="eyebrow">EVENTUM / DIRECT ONCHAIN EDGE</div><h1>Meaning, preserved.</h1><p>Consensus-backed relationship <span className="mono">{comparison.comparisonId}</span>.</p></div><div><div className="result-header-equation" aria-label={`Market A ${comparison.relation.replaceAll("_", " ")} Market B`}><span>{compactTitle(a.title)}</span><strong>{symbol}</strong><span>{compactTitle(b.title)}</span></div><div className="result-page-meta" aria-label="Comparison summary"><div><span>ORDER</span><strong>A <b>→</b> B</strong></div><div><span>RELATION</span><strong>{comparison.relation.replaceAll("_", " ")}</strong></div><div><span>VERSION</span><strong className="mono">{comparison.comparisonVersion}</strong></div></div><div className="result-direction-callout"><span>READ IN ORDER</span><strong>{directionLabel(comparison.relation)}</strong></div></div></div></section>
    <section className="container result-content">
      <section className="result-card semantic-report result-frame"><div className="semantic-report-header"><div><div className="section-kicker">SETTLEMENT COMPATIBILITY</div><h2>Read the relationship in order.</h2></div><RelationBadge relation={comparison.relation} /></div><table className="semantic-table"><tbody><tr><th>Snapshot order</th><td><strong>Market A</strong><span>{a.title}</span><span className="mono">v{a.version} · {a.platformMarketId}</span></td><td><strong>Market B</strong><span>{b.title}</span><span className="mono">v{b.version} · {b.platformMarketId}</span></td></tr><tr><th>Window</th><td>{a.openTime || "Not published"} → {a.closeTime || "Not published"}</td><td>{b.openTime || "Not published"} → {b.closeTime || "Not published"}</td></tr><tr><th>Resolution source</th><td>{a.resolutionSource || a.providerLabel}</td><td>{b.resolutionSource || b.providerLabel}</td></tr></tbody></table></section>
      <div className="result-layout">
        <div>
          <section className="result-hero relation-hero"><div className="eyebrow">ONCHAIN RELATIONSHIP</div><div className="relationship-visual"><div className="relationship-equation"><span className="relationship-term">{compactTitle(a.title)}</span><strong className="relationship-operator" aria-label={`Market A ${comparison.relation.replaceAll("_", " ")} Market B`}>{symbol}</strong><span className="relationship-term">{compactTitle(b.title)}</span></div><p className="relationship-caption">Market A → Market B · direction is defined by the persisted snapshot order.</p><div className="relationship-direction"><span>ORDERED READ</span><strong>{directionLabel(comparison.relation)}</strong></div></div><h2>{comparison.relation.replaceAll("_", " ")}</h2><p>{directionText(comparison.relation, a, b)} {comparison.conciseRationale}</p><div className="safety-grid"><div className="safety-item"><span>Safe to compare</span><strong>{comparison.safeToCompare ? "YES" : "NO"}</strong></div><div className="safety-item"><span>Safe to aggregate</span><strong>{comparison.safeToAggregate ? "YES" : "NO"}</strong></div></div></section>
          <ThresholdView a={a} b={b} relation={comparison.relation} />
          <section className="result-card result-mapping"><div className="section-kicker">OUTCOME RELATIONSHIP</div><h3>Direction-aware mapping</h3>{Object.keys(comparison.outcomeMapping).length ? <table className="mapping"><thead><tr><th>Market A</th><th>Market B</th></tr></thead><tbody>{Object.entries(comparison.outcomeMapping).map(([source, targets]) => <tr key={source}><td>{source}</td><td>{targets.join(" · ")}</td></tr>)}</tbody></table> : <p>No safe mapping was established.</p>}</section>
          <section className="result-card"><div className="section-kicker">SEMANTIC EVIDENCE</div><h3>Material differences</h3><DifferenceTable a={a} b={b} />{comparison.materialDifferences.length > 0 && <ul className="result-list">{comparison.materialDifferences.map((item) => <li key={item}>{item}</li>)}</ul>}</section>
        </div>
        <div>
          <section className="result-card"><RelationBadge relation={comparison.relation} /><h3 className="card-title-spaced">Why this edge exists</h3><ul className="reason-list">{comparison.reasonCodes.length ? comparison.reasonCodes.map((code) => <li key={code}><span className="reason-mark" aria-hidden="true" />{code.replaceAll("_", " ")}</li>) : <li><span className="reason-mark" aria-hidden="true" />No reason codes recorded</li>}</ul></section>
          <section className="result-card"><div className="section-kicker">GENLAYER CONSENSUS / TRANSACTION</div><h3 className="card-title-spaced">Accepted direct edge</h3><p>{comparison.transactionHash ? <span className="mono hash-wrap">{comparison.transactionHash}</span> : "Persisted by accepted consensus; the originating run owns the transaction reference when available."}</p><p className="technical-meta">Protocol {comparison.comparisonVersion} · direct edge</p></section>
          <section className="result-card"><div className="section-kicker">PROVENANCE</div><h3 className="card-title-spaced">Evidence references</h3><p className="mono hash-wrap">{comparison.snapshotAId}</p><p className="mono hash-wrap">{comparison.snapshotBId}</p><p className="mono hash-wrap evidence-hashes">{comparison.evidenceHashes.join(" · ")}</p><CopyButton value={comparison.comparisonId} /></section>
          <section className="result-card result-links"><Link href={`/markets/${a.snapshotId}`}>Open Market A <ArrowRight size={14} aria-hidden="true" /></Link><Link href={`/markets/${b.snapshotId}`}>Open Market B <ArrowRight size={14} aria-hidden="true" /></Link><Link href="/graph">View in graph <ExternalLink size={14} aria-hidden="true" /></Link></section>
          <div className="preview-grid result-previews"><MarketPreview market={a} /><MarketPreview market={b} /></div>
        </div>
      </div>
    </section>
  </main>;
}
