import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { getPublicConfig } from "@/lib/config";
import { BrandMark } from "@/components/BrandMark";

export function Footer() {
  const publicConfig = getPublicConfig();
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-inner">
          <div>
            <Link className="brand" href="/"><BrandMark size="sm" /><span className="brand-wordmark">EVENTUM</span></Link>
            <p className="footer-copy" style={{ marginTop: 14 }}>A semantic evidence layer for researchers, agents, and market infrastructure.</p>
          </div>
          <nav className="footer-links" aria-label="Footer navigation">
            <Link href="/compare">Compare</Link>
            <Link href="/comparisons">History</Link>
            <Link href="/markets">Markets</Link>
            <Link href="/graph">Graph</Link>
            <Link href="/docs">Documentation</Link>
            <Link href="/status">Status</Link>
            <a href={publicConfig.studioUrl} target="_blank" rel="noreferrer">Studio <ArrowUpRight size={13} aria-hidden="true" /></a>
          </nav>
        </div>
        <p className="footer-meta">Protocol results are consensus-backed when a deployed contract is configured. Eventum does not publish market odds or trading advice.</p>
      </div>
    </footer>
  );
}
