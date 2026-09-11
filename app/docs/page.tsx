import Link from "next/link";

const sections = [
  ["overview", "Overview"],
  ["protocol", "Protocol"],
  ["consensus", "Consensus"],
  ["runs", "Comparison runs"],
  ["integration", "Integration"],
  ["limitations", "Limitations"],
];

export default function DocsPage() {
  return (
    <main className="page-shell">
      <section className="route-header"><div className="container"><div className="eyebrow">EVENTUM / DOCUMENTATION</div><h1>Protocol notes.</h1><p>A short field guide to snapshots, relationships, and the contract boundary. The repository contains the complete implementation and release evidence.</p></div></section>
      <div className="container docs-layout">
        <nav className="docs-nav" aria-label="Documentation sections">{sections.map(([id, label]) => <a href={`#${id}`} key={id}>{label}</a>)}</nav>
        <article>
          <section id="overview" className="doc-section"><h2>Overview</h2><p>Eventum is the semantic interoperability layer for prediction markets. It asks whether two independently authored markets would resolve identically under all materially relevant interpretations of their published rules.</p><p>It is not an odds feed, a market resolver, or an LLM similarity score. The protocol asset is the immutable snapshot, the consensus-backed relationship, and the direct evidence graph.</p></section>
          <section id="protocol" className="doc-section"><h2>Protocol</h2><h3>Snapshot before judgment</h3><p>A snapshot includes the provider market ID, canonical URL, title, description, outcome labels, resolution rules, authority, time fields, clarifications, retrieval timestamp, source hash, and normalized semantic facts. A changed source is a new version.</p><h3>Relationships</h3><p>The contract accepts eleven bounded relations: EQUIVALENT, CONDITIONAL_EQUIVALENT, SUBSET, SUPERSET, OVERLAPPING, CONFLICTING, TEMPORAL_MISMATCH, SOURCE_MISMATCH, OUTCOME_MISMATCH, UNRELATED, and AMBIGUOUS.</p><p>For shared evidence, classification first rejects unrelated or insufficient material. It then tests equivalence, directional containment, explicit conditional equivalence, partial overlap, and genuine conflict. A higher BTC upper-bound threshold contains a lower one; it is a SUPERSET, not CONFLICTING merely because the two rules can settle differently.</p><pre className="code-block">{["{", "  relation: \"TEMPORAL_MISMATCH\",", "  safe_to_compare: false,", "  safe_to_aggregate: false,", "  outcome_mapping: {},", "  reason_codes: [\"TIME_WINDOW_CONFLICT\"],", "  material_differences: [\"…\"],", "  evidence_hashes: [\"…\", \"…\"]", "}"].join("\n")}</pre></section>
          <section id="consensus" className="doc-section"><h2>Consensus</h2><p>Market text is untrusted data. The Intelligent Contract puts it inside explicit evidence delimiters, requests structured JSON, validates every bounded field, and independently re-runs the semantic task in the validator function. Validators agree on stable decision fields; explanatory prose is not consensus-critical.</p><p>If a model response is malformed, Eventum fails closed with MODEL_OUTPUT_INVALID. If validators disagree, no comparison is persisted. Genuine ambiguity remains distinct from an invalid model response. There is no protocol confidence percentage.</p></section>
          <section id="runs" className="doc-section"><h2>Comparison runs</h2><p>Each attempt receives a durable application run before wallet activity. Its run page owns the evidence, lifecycle, transaction hashes, consensus outcome, recovery, and read-back state.</p><p>A run is not automatically an onchain comparison. Rejected consensus can be preserved as CONSENSUS REJECTED while the contract correctly contains no comparison record. Refresh, navigation, and a PM2 restart recover the same run record and never authorize a blind duplicate write.</p><p>Use <Link href="/comparisons">History</Link> to review attempts, <Link href="/compare">Compare</Link> to prepare a new run, and <Link href="/status">Status</Link> for configured deployment evidence.</p></section>
          <section id="integration" className="doc-section"><h2>Integration</h2><p>The first adapter is the public Polymarket Gamma API. The application accepts public /market/&lt;slug&gt;, single-market /event/&lt;slug&gt;, and exact child-market /event/&lt;event&gt;/&lt;market&gt; URLs. Harmless query strings and fragments are removed during canonicalization; unsupported providers return a visible error rather than silently scraping.</p><p>Use <Link href="/graph">Graph</Link> for direct edges and inspect the source hashes on every result.</p></section>
          <section id="limitations" className="doc-section"><h2>Limitations</h2><ul><li>The first adapter does not assert canonical cross-market event hints, so a Polymarket preview may not authorize safe aggregation.</li><li>Studionet writes require a funded EIP-1193 wallet and can remain pending while GenLayer consensus progresses.</li><li>Only direct comparison edges are displayed. The graph deliberately does not infer A = C from A = B and B = C.</li><li>This internal review is not a third-party security audit.</li></ul></section>
        </article>
      </div>
    </main>
  );
}
