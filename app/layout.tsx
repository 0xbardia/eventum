import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { SiteHeader } from "@/components/SiteHeader";
import { getConfig } from "@/lib/config";
import "./globals.css";

const config = getConfig();

export const metadata: Metadata = {
  title: "Eventum — Semantic interoperability for prediction markets",
  description: "Consensus-backed market relationships for prediction-market infrastructure.",
  metadataBase: new URL(config.APP_URL),
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <SiteHeader />
        <div id="main-content">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
