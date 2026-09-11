import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { ContractProof } from "@/components/ContractProof";

export const dynamic = "force-dynamic";

const dimensions = [
  ["ACTOR", "MATCH", "Who or what the rule names"],
  ["EVENT", "MATCH", "The event being settled"],
  ["ASSET", "MATCH", "The measured instrument"],
  ["THRESHOLD", "DIFFERENT", "The boundary that changes the set"],
  ["TIME", "MATCH", "The published settlement window"],
  ["SOURCE", "MATCH", "The resolution authority"],
  ["OUTCOMES", "MATCH", "The labels exposed to a reader"],
] as const;

const taxonomy = [
  ["EQUIVALENT", "Same settlement", "Both rule sets resolve the same way across materially relevant interpretations."],
  ["CONDITIONAL_EQUIVALENT", "Requires a condition", "Compatible only under a stated assumption; not an unconditional identity."],
  ["SUBSET", "Directional", "Every positive outcome of this rule is also positive in the other rule."],
  ["SUPERSET", "Directional", "This rule contains the other rule's positive settlement set."],
  ["OVERLAPPING", "Partial intersection", "Some world states intersect, but neither rule contains the other."],
  ["CONFLICTING", "Material conflict", "A material settlement criterion points the rules in incompatible directions."],
  ["UNRELATED", "No shared event", "The evidence does not establish a common event or outcome space."],
  ["AMBIGUOUS", "Fail closed", "The evidence is not strong enough to authorize a semantic conclusion."],
];

export default function HomePage() {
  return (
    <main className="page-shell home-v3">
      <section className="hero home-hero v3-hero">
        <div className="container v3-hero-grid">
          <div className="hero-copy-block v3-hero-copy">
            <div className="eyebrow">EVENTUM / SEMANTIC INTEROPERABILITY</div>
            <p className="v3-hero-kicker">A protocol surface for authored market rules.</p>
            <h1>Markets can look alike. <em>Rules don&apos;t.</em></h1>
            <p className="hero-lead">Eventum turns independently published prediction markets into evidence, then asks GenLayer to determine how their settlement meanings actually relate.</p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/compare">Compare two markets <ArrowRight size={16} aria-hidden="true" /></Link>
              <Link className="button button-secondary" href="#method">See the method <ArrowUpRight size={15} aria-hidden="true" /></Link>
            </div>
            <div className="v3-hero-proof"><span>LIVE PROTOCOL SURFACE</span><span>STUDIONET / 61999</span><Link href="/status">Read status <ArrowUpRight size={13} aria-hidden="true" /></Link></div>
          </div>

          <div className="v3-signature-stage" aria-hidden="true">
            <div className="v3-stage-header"><span>SEMANTIC EDGE / CONCEPTUAL MODEL</span><span>01 — 04</span></div>
            <div className="v3-stage-board">
              <div className="v3-stage-rule v3-stage-rule-a"><span className="v3-stage-index">SOURCE A / BROADER</span><strong>BTC low<br />≤ $80K</strong><small>Published market rule</small></div>
              <div className="v3-stage-middle"><span className="v3-stage-step">INTERPRET</span><div className="v3-stage-converge"><i /><i /><b /></div><span className="v3-stage-core">RULE<br />→ EDGE</span></div>
              <div className="v3-stage-rule v3-stage-rule-b"><span className="v3-stage-index">SOURCE B / NARROWER</span><strong>BTC low<br />≤ $77.5K</strong><small>Published market rule</small></div>
            </div>
            <div className="v3-stage-axis"><span>ACTOR <b>MATCH</b></span><span>EVENT <b>MATCH</b></span><span>THRESHOLD <b className="v3-different">DIFF</b></span><span>TIME <b>MATCH</b></span><span>SOURCE <b>MATCH</b></span><span>OUTCOMES <b>MATCH</b></span></div>
            <div className="v3-stage-result"><span>RELATIONSHIP</span><strong>A ⊃ B</strong><em>SUPERSET</em></div>
            <div className="v3-stage-foot"><span>Evidence</span><span>Consensus</span><span>Persistence</span></div>
          </div>
          <p className="sr-only">Illustrative Eventum comparison: a Bitcoin low price rule at eighty thousand dollars contains a narrower seventy-seven-thousand-five-hundred-dollar rule. The live contract remains authoritative.</p>
        </div>
        <div className="container hero-index v3-hero-index"><div className="hero-index-row"><strong>01</strong><p><b>Resolve the source.</b> Bring the published rule into a structured evidence frame.</p></div><div className="hero-index-row"><strong>02</strong><p><b>Adjudicate the meaning.</b> Let independent GenLayer evaluation decide the relationship.</p></div><div className="hero-index-row"><strong>03</strong><p><b>Persist the edge.</b> Accepted results become inspectable onchain graph records.</p></div></div>
      </section>

      <section className="section section-rule v3-section v3-problem" id="problem"><div className="container"><div className="v3-section-index"><span>01</span><span>THE PROBLEM</span></div><div className="v3-sticky-story"><div className="v3-story-lead"><h2>Same wording is not a settlement identity.</h2><p>Prediction markets are authored rule systems. The material difference can live in a threshold, time window, resolution authority, or exception that a title leaves out.</p></div><div className="v3-rule-ledger"><div className="v3-ledger-top"><span>READ THE RULES BENEATH THE QUESTION</span><span>UNTRUSTED EVIDENCE</span></div><h3>Evidence before equivalence.</h3><div className="v3-ledger-row"><span>Surface</span><strong>“Will Bitcoin dip?”</strong></div><div className="v3-ledger-row"><span>Rule A</span><strong>Low ≤ $80,000</strong></div><div className="v3-ledger-row"><span>Rule B</span><strong>Low ≤ $77,500</strong></div><div className="v3-ledger-row v3-ledger-answer"><span>Eventum</span><strong>One relationship. Not one shared rule.</strong></div></div></div></div></section>

      <section className="section section-rule v3-section v3-decomposition" id="decomposition"><div className="container"><div className="v3-section-index"><span>02</span><span>SEMANTIC DECOMPOSITION</span></div><div className="v3-split-heading"><div><h2>Meaning lives in the margins.</h2></div><p>Eventum compares the dimensions that determine settlement—not the words that happen to introduce them.</p></div><div className="v3-dimension-layout"><div className="v3-dimension-statement"><span className="v3-signal-line" /><p>Seven questions turn a market question into a protocol record.</p><Link className="text-link" href="/docs#protocol">Read the evidence model <ArrowUpRight size={14} aria-hidden="true" /></Link></div><div className="v3-dimension-list">{dimensions.map(([label, state, detail], index) => <div className="v3-dimension-row" key={label}><span className="v3-dimension-number">0{index + 1}</span><strong>{label}</strong><span className={state === "DIFFERENT" ? "v3-dimension-different" : ""}>{state}</span><small>{detail}</small></div>)}</div></div></div></section>

      <section className="section band v3-consensus" id="method"><div className="container"><div className="v3-section-index v3-section-index-dark"><span>03</span><span>WHY GENLAYER</span></div><div className="v3-split-heading"><div><h2>Interpretation needs witnesses.</h2></div><p>Code can hash evidence and index edges. It cannot, by itself, decide whether two authored rule sets share settlement meaning.</p></div><div className="v3-consensus-flow" aria-label="Conceptual GenLayer consensus sequence"><div className="v3-flow-step"><span>01</span><strong>LEADER</strong><p>Proposes a structured reading of the evidence.</p></div><div className="v3-flow-line" aria-hidden="true" /><div className="v3-flow-step"><span>02</span><strong>VALIDATORS</strong><p>Independently test stable decision fields.</p></div><div className="v3-flow-line" aria-hidden="true" /><div className="v3-flow-step"><span>03</span><strong>CONSENSUS</strong><p>Accepts only a result that survives agreement.</p></div><div className="v3-flow-line" aria-hidden="true" /><div className="v3-flow-step v3-flow-persist"><span>04</span><strong>PERSIST</strong><p>Stores the direct relationship for later inspection.</p></div></div><div className="v3-consensus-note"><span>PROTOCOL TRUTH</span><strong>A leader return is a proposal. Accepted consensus is the state transition.</strong></div></div></section>

      <section className="section section-rule v3-section v3-taxonomy" id="taxonomy"><div className="container"><div className="v3-section-index"><span>04</span><span>RELATIONSHIP TAXONOMY</span></div><div className="v3-split-heading"><div><h2>Similarity is not a protocol decision.</h2></div><p>Each label names what an integrator may safely infer—and what remains outside the evidence.</p></div><div className="taxonomy-grid taxonomy-index v3-taxonomy-grid">{taxonomy.map(([tag, title, detail], index) => <div className="taxonomy-item v3-taxonomy-item" key={tag}><span className={`tag ${index === 0 ? "relation-safe" : index > 4 ? "relation-risk" : "relation-conditional"}`}>{tag}</span><h3>{title}</h3><p>{detail}</p></div>)}</div></div></section>

      <section className="section section-rule v3-section v3-graph-story" id="graph-story"><div className="container"><div className="v3-section-index"><span>05</span><span>MARKET EQUIVALENCE GRAPH</span></div><div className="v3-split-heading"><div><h2>Meaning, with edges you can audit.</h2></div><p>Snapshots are nodes. Only accepted direct comparisons become edges. No inferred closure is dressed up as protocol truth.</p></div><div className="v3-home-graph" aria-label="Conceptual direct graph with two market snapshots and one relationship"><div className="v3-graph-rule v3-graph-rule-a"><span>SNAPSHOT A</span><strong>BTC ≤ $80K</strong><small>Published record</small></div><div className="v3-graph-connection"><i /><span>SUPERSET</span><i /></div><div className="v3-graph-rule v3-graph-rule-b"><span>SNAPSHOT B</span><strong>BTC ≤ $77.5K</strong><small>Published record</small></div><div className="v3-graph-caption"><span>DIRECT EDGE / ACCEPTED CONSENSUS</span><span>NO TRANSITIVE INFERENCE</span></div></div><Link className="text-link v3-graph-link" href="/graph">Inspect the live graph <ArrowRight size={14} aria-hidden="true" /></Link></div></section>

      <section className="section band v3-proof-section"><div className="container"><div className="v3-section-index v3-section-index-dark"><span>06</span><span>LIVE PROTOCOL PROOF</span></div><div className="v3-split-heading"><div><h2>Read the source of truth.</h2></div><p>Operational status below is read from the configured deployment. Unavailable state is shown plainly; it is never replaced by a demo record.</p></div><ContractProof /></div></section>

      <section className="section section-rule v3-section v3-final-cta"><div className="container"><div className="v3-cta-line"><div><div className="section-kicker">START WITH THE QUESTION</div><h2>Would these markets resolve identically?</h2><p>Inspect two public rules before trusting a shared event identity.</p></div><Link className="button button-primary" href="/compare">Run a comparison <ArrowRight size={16} aria-hidden="true" /></Link></div></div></section>
    </main>
  );
}
