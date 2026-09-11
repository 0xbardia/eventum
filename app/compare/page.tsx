import { CompareWorkspace } from "@/components/CompareWorkspace";

export default function ComparePage() {
  return (
    <main className="page-shell">
      <section className="workspace-hero v3-workspace-hero"><div className="container"><div className="eyebrow">EVENTUM / COMPARE INSTRUMENT</div><h1>Test the settlement.</h1><p>Bring two published markets into one evidence frame. The question is not whether they sound alike; it is whether every materially relevant rule produces the same settlement.</p><div className="hero-signal" aria-label="Eventum evaluates actor, event, threshold, time, authority, and outcomes"><span>ACTOR</span><i /> <span>EVENT</span><i /> <span>THRESHOLD</span><i /> <span>TIME</span><i /> <span>AUTHORITY</span><i /> <span>OUTCOMES</span></div><div className="compare-phase-rail" aria-label="Comparison workflow"><span className="compare-phase-active"><b>01</b> Sources</span><span><b>02</b> Evidence</span><span><b>03</b> Adjudication</span></div></div></section>
      <section className="workspace"><div className="container"><CompareWorkspace /></div></section>
    </main>
  );
}
