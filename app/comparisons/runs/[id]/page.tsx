import { ensureForensicComparisonRun, getComparisonRun, FORENSIC_RUN_ID } from "@/lib/db";
import { getSnapshot } from "@/lib/genlayer";
import type { ComparisonRun, MarketSnapshot } from "@/lib/types";
import { ComparisonRunClient } from "@/components/ComparisonRunClient";

export const dynamic = "force-dynamic";

export default async function ComparisonRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id === FORENSIC_RUN_ID) ensureForensicComparisonRun();
  const run = getComparisonRun(id);
  if (!run) return <main className="page-shell"><section className="container" style={{ padding: "100px 0" }}><div className="empty-state"><h1>Run not found.</h1><p>This application record does not exist or has not been persisted.</p></div></section></main>;
  const snapshots = run.snapshots || await loadSnapshots(run);
  return <ComparisonRunClient initialRun={snapshots ? { ...run, snapshots } : run} />;
}

async function loadSnapshots(run: ComparisonRun): Promise<[MarketSnapshot, MarketSnapshot] | undefined> {
  try {
    return await Promise.all([getSnapshot(run.snapshotAId), getSnapshot(run.snapshotBId)]) as [MarketSnapshot, MarketSnapshot];
  } catch {
    return undefined;
  }
}
