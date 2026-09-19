"use client";

import { ArrowRight, CircleAlert, Fingerprint, Network, ScanSearch } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MarketPreview } from "@/components/MarketPreview";
import { loadPublicConfig, type PublicConfig } from "@/lib/public-config";
import type { MarketSnapshot } from "@/lib/types";

type Prepared = {
  comparisonVersion: string;
  snapshots: [MarketSnapshot, MarketSnapshot];
  registerArgs: [string[], string[]];
};

function semanticRows([a, b]: [MarketSnapshot, MarketSnapshot]) {
  const rows = [
    ["Provider", a.providerLabel, b.providerLabel],
    ["Outcomes", a.outcomes.join(" / "), b.outcomes.join(" / ")],
    ["Window", `${a.openTime || "Not published"} → ${a.closeTime || "Not published"}`, `${b.openTime || "Not published"} → ${b.closeTime || "Not published"}`],
    ["Resolution source", a.resolutionSource || "Not published", b.resolutionSource || "Not published"],
  ] as const;
  return rows.map(([label, left, right]) => ({ label, state: left === right ? "MATCH" : "DIFFERENT", detail: left === right ? left : `${left} / ${right}` }));
}

export function CompareWorkspace() {
  const router = useRouter();
  const [urls, setUrls] = useState<[string, string]>(["", ""]);
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [runtimeConfig, setRuntimeConfig] = useState<PublicConfig | null>(null);
  const [phase, setPhase] = useState<"idle" | "preparing" | "ready" | "creating" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    void loadPublicConfig().then(setRuntimeConfig).catch(() => setMessage("Runtime configuration is unavailable. No run was created."));
  }, []);

  async function prepare(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPhase("preparing");
    setMessage("");
    try {
      const response = await fetch("/api/comparisons/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls, comparisonVersion: "1.0.0" }),
      });
      const body = (await response.json()) as { snapshots?: MarketSnapshot[]; registerArgs?: string[][]; error?: { message?: string } };
      if (!response.ok || !body.snapshots || !body.registerArgs || body.snapshots.length !== 2 || body.registerArgs.length !== 2) {
        throw new Error(body.error?.message || "The markets could not be resolved.");
      }
      setPrepared({
        comparisonVersion: "1.0.0",
        snapshots: body.snapshots as [MarketSnapshot, MarketSnapshot],
        registerArgs: body.registerArgs as [string[], string[]],
      });
      setPhase("ready");
    } catch (error) {
      setPhase("error");
      setMessage(error instanceof Error ? error.message : "The comparison could not be prepared.");
    }
  }

  async function createRun() {
    if (!prepared || !runtimeConfig || phase === "creating") return;
    setPhase("creating");
    setMessage("");
    try {
      const response = await fetch("/api/comparisons/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          snapshotAId: prepared.snapshots[0].snapshotId,
          snapshotBId: prepared.snapshots[1].snapshotId,
          comparisonVersion: prepared.comparisonVersion,
          snapshots: prepared.snapshots,
          registerArgs: prepared.registerArgs,
        }),
      });
      const body = (await response.json()) as { run?: { runId?: string }; error?: { message?: string } };
      if (!response.ok || !body.run?.runId) throw new Error(body.error?.message || "The comparison run could not be created.");
      router.push(`/comparisons/runs/${body.run.runId}`);
    } catch (error) {
      setPhase("error");
      setMessage(error instanceof Error ? error.message : "The comparison run could not be created.");
    }
  }

  return (
    <div className="instrument-grid compare-instrument">
      <div>
        <form className="panel instrument-panel" onSubmit={prepare}>
          <div className="panel-header"><div className="section-kicker">01 / SOURCES</div><h2>Compare published rules</h2><p>Resolve two real Polymarket URLs before any wallet action. A run is created only after both evidence records are ready.</p></div>
          <div className="panel-body">
            <div className="notice">Provider boundary: Polymarket Gamma API only. Unsupported URLs fail clearly; no web-scraping fallback is used.</div>
            <div className="compare-inputs">
              {urls.map((url, index) => <label className="field" htmlFor={`market-url-${index}`} key={index}><span className="field-label"><span>MARKET {index === 0 ? "A" : "B"}</span><span className="field-index" aria-hidden="true">0{index + 1}</span></span><input id={`market-url-${index}`} type="url" placeholder="https://polymarket.com/market/..." value={url} onChange={(event) => setUrls((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item) as [string, string])} required /></label>)}
            </div>
            <div className="form-actions"><button className="button button-primary" type="submit" disabled={phase === "preparing" || phase === "creating"}>{phase === "preparing" ? "Resolving evidence…" : "Resolve markets"} <ArrowRight size={16} aria-hidden="true" /></button>{prepared && <button className="button button-secondary" type="button" onClick={() => void createRun()} disabled={phase === "creating" || !runtimeConfig}>{phase === "creating" ? "Creating run…" : "Create comparison run"} <ArrowRight size={16} aria-hidden="true" /></button>}</div>
            {message && <p className="error-text" role="alert"><CircleAlert size={15} aria-hidden="true" style={{ verticalAlign: "-3px", marginRight: 5 }} />{message}</p>}
          </div>
        </form>
        {prepared && <section className="preview-section"><div className="section-heading compact-heading"><div><div className="section-kicker">02 / EVIDENCE</div><h2>Read before signing.</h2></div><p>These previews are offchain evidence. The dedicated run page owns wallet state, transaction hashes, reconciliation, and recovery.</p></div><div className="semantic-axis" aria-label="Comparable evidence fields"><div className="semantic-axis-head"><div><div className="section-kicker">SEMANTIC AXIS</div><h3>What the evidence says.</h3></div><p>Only fields present in both normalized records are shown. A difference is a reason to inspect—not a similarity score.</p></div><div className="semantic-axis-grid">{semanticRows(prepared.snapshots).map((row) => <div className="semantic-axis-row" key={row.label}><span>{row.label}<small className="axis-detail">{row.detail}</small></span><strong className={row.state === "DIFFERENT" ? "axis-different" : ""}>{row.state}</strong></div>)}</div></div><div className="preview-grid">{prepared.snapshots.map((snapshot) => <MarketPreview key={snapshot.snapshotId} market={snapshot} />)}</div><div className="evidence-handoff"><span>03 / ADJUDICATION</span><strong>When the evidence is ready, create one durable semantic run.</strong></div></section>}
      </div>
      <aside className="instrument-aside">
        <div className="protocol-panel">
          <div className="section-kicker">PROTOCOL SURFACE</div>
          <h2>Meaning before motion.</h2>
          <p>Eventum evaluates the rule, not the market’s popularity. Every attempt gets a durable audit trail before a transaction can begin.</p>
          <div className="axis-list">
            <div><Fingerprint size={16} aria-hidden="true" /><span>Actor / asset</span><b>same or different</b></div>
            <div><ScanSearch size={16} aria-hidden="true" /><span>Event / threshold</span><b>settlement logic</b></div>
            <div><Network size={16} aria-hidden="true" /><span>Time / authority</span><b>rule boundaries</b></div>
          </div>
          <dl className="data-list instrument-data">
            <div><dt>Network</dt><dd>{runtimeConfig?.network || "Loading…"}</dd></div>
            <div><dt>Chain</dt><dd className="mono">{runtimeConfig?.chainId || "—"}</dd></div>
            <div><dt>Contract</dt><dd className="mono">{runtimeConfig?.contractAddress || "Loading…"}</dd></div>
            <div><dt>Persistence</dt><dd>Per-run server record</dd></div>
          </dl>
        </div>
        <div className="callout callout-dark"><span className="section-kicker">NO BLIND RETRIES</span><p>Once a transaction hash exists, the run reconciles that same hash. Refreshing or reopening never creates a replacement write.</p></div>
      </aside>
    </div>
  );
}
