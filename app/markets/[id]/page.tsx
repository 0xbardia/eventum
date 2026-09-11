import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { MarketPreview } from "@/components/MarketPreview";
import { ServerEmpty } from "@/components/ServerEmpty";
import { getSnapshot } from "@/lib/genlayer";
import type { MarketSnapshot } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MarketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let market: MarketSnapshot | null = null;
  let title = "Snapshot not available";
  try {
    market = await getSnapshot(id);
  } catch (error) {
    title = error instanceof Error && "code" in error && (error as { code?: string }).code === "CONTRACT_NOT_CONFIGURED" ? "Contract not configured" : title;
  }
  if (!market) return <main className="page-shell"><section className="container" style={{ padding: "100px 0" }}><ServerEmpty title={title} detail="Eventum does not substitute an offchain record for an onchain snapshot read." action="/markets" /></section></main>;
  return <main className="page-shell"><section className="route-header"><div className="container"><Link href="/markets" className="muted" style={{ fontSize: ".8rem", textDecoration: "none" }}><ArrowLeft size={14} aria-hidden="true" style={{ verticalAlign: "-3px", marginRight: 5 }} /> Registry</Link><div className="eyebrow" style={{ marginTop: 22 }}>SNAPSHOT / {market.version}</div><h1>{market.title}</h1><p>Onchain immutable snapshot from {market.providerLabel}.</p></div></section><section className="container" style={{ padding: "30px 0 80px", maxWidth: 760 }}><MarketPreview market={market} /><div className="result-card" style={{ marginTop: 18 }}><h3>Published resolution rules</h3><p>{market.resolutionRules}</p>{market.clarifications && <><h3 style={{ marginTop: 22 }}>Clarifications</h3><p>{market.clarifications}</p></>}<h3 style={{ marginTop: 22 }}>Normalized semantic facts</h3><pre className="code-block" style={{ marginTop: 10 }}>{JSON.stringify(market.normalizedFacts, null, 2)}</pre></div></section></main>;
}

