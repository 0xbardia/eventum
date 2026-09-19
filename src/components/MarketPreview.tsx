import { ExternalLink } from "lucide-react";
import { formatDate, shortHash } from "@/lib/format";
import type { MarketSnapshot } from "@/lib/types";

export function MarketPreview({ market }: { market: MarketSnapshot }) {
  return (
    <article className="market-preview">
      <div className="market-preview-top"><div className="eyebrow">{market.platform} · {market.authority === "onchain" ? "snapshot" : "preview"}</div><span className="market-version">v{market.version}</span></div>
      <h3>{market.title}</h3>
      <p>{market.description}</p>
      <dl className="data-list">
        <div><dt>Outcomes</dt><dd>{market.outcomes.join(" / ")}</dd></div>
        <div><dt>Open</dt><dd>{formatDate(market.openTime)}</dd></div>
        <div><dt>Close</dt><dd>{formatDate(market.closeTime)}</dd></div>
        <div><dt>Resolution source</dt><dd>{market.resolutionSource || "Not published"}</dd></div>
        <div><dt>Snapshot</dt><dd className="mono">{shortHash(market.snapshotId)}</dd></div>
        <div><dt>Submitted source hash</dt><dd className="mono">{shortHash(market.sourceHash)}</dd></div>
        <div><dt>Source evidence hash</dt><dd className="mono">{market.sourceEvidenceHash ? shortHash(market.sourceEvidenceHash) : "Generated onchain"}</dd></div>
      </dl>
      <a className="source-link" href={market.sourceUrl} target="_blank" rel="noreferrer">Open published source <ExternalLink size={13} aria-hidden="true" /></a>
    </article>
  );
}
