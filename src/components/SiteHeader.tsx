"use client";

import { ArrowUpRight, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BrandMark } from "@/components/BrandMark";

const links = [
  ["Compare", "/compare"],
  ["History", "/comparisons"],
  ["Markets", "/markets"],
  ["Graph", "/graph"],
  ["Docs", "/docs"],
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const active = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
  return (
    <header className="site-header">
      <div className="nav-inner">
        <Link className="brand" href="/" onClick={() => setOpen(false)}>
          <BrandMark size="md" />
          <span className="brand-wordmark">EVENTUM</span>
        </Link>
        <nav className="nav-links" aria-label="Primary navigation">
          {links.map(([label, href]) => <Link key={href} href={href} aria-current={active(href) ? "page" : undefined}>{label}</Link>)}
        </nav>
        <Link className="nav-cta" href="/compare">Run comparison <ArrowUpRight size={15} aria-hidden="true" /></Link>
        <button className="menu-button" type="button" aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((value) => !value)}>
          {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>
      </div>
      {open && <nav id="mobile-navigation" className="mobile-nav" aria-label="Mobile navigation">
        {links.map(([label, href]) => <Link key={href} href={href} aria-current={active(href) ? "page" : undefined} onClick={() => setOpen(false)}>{label}</Link>)}
        <Link className="button button-primary" href="/compare" onClick={() => setOpen(false)}>Run comparison <ArrowUpRight size={15} aria-hidden="true" /></Link>
      </nav>}
    </header>
  );
}
