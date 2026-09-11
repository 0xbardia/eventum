import Link from "next/link";
import { ensureForensicComparisonRun, listComparisonRuns } from "@/lib/db";
import { formatDate, shortHash } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function ComparisonHistoryPage() {
  ensureForensicComparisonRun();
  const runs = listComparisonRuns();
  return <main className="page-shell"><section className="route-header"><div className="container"><div className="eyebrow">EVENTUM / COMPARISON HISTORY</div><h1>Runs, preserved.</h1><p>Every comparison attempt has its own durable record. A rejected consensus remains visible as a run, never as a fabricated onchain result.</p></div></section><section className="container history-content"><div className="history-toolbar"><div><div className="section-kicker">APPLICATION RECORDS</div><h2>{runs.length} run{runs.length === 1 ? "" : "s"}</h2></div><Link className="button button-primary" href="/compare">Start a run</Link></div>{runs.length ? <div className="history-list">{runs.map((run) => { const accepted = run.persistedOnchain; const rejected = run.state === "MAJORITY_DISAGREE"; return <Link className="history-row" href={`/comparisons/runs/${run.runId}`} key={run.runId}><div className="history-main"><div className="history-topline"><span className={`history-status ${accepted ? "history-status-accepted" : rejected ? "history-status-rejected" : ""}`}>{accepted ? "PERSISTED ONCHAIN" : rejected ? "CONSENSUS REJECTED" : "COMPARISON RUN"}</span><span className="mono">{run.relation ? runLabel(run.relation) : runLabel(run.state)}</span></div><h2>{run.snapshots?.[0]?.title || shortHash(run.snapshotAId, 8)} <span aria-hidden="true">↔</span> {run.snapshots?.[1]?.title || shortHash(run.snapshotBId, 8)}</h2><p>{formatDate(run.createdAt)}</p></div><span className="history-arrow" aria-hidden="true">↗</span></Link>; })}</div> : <div className="empty-state"><h2>No runs yet.</h2><p>Prepare two supported markets to create the first durable comparison run.</p></div>}</section></main>;
}

function runLabel(value: string) {
  return value.replaceAll("_", " ");
}
