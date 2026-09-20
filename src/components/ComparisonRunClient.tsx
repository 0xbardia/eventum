"use client";

import { ArrowLeft, Check, CircleAlert, Copy, ExternalLink, RefreshCw, ShieldAlert, Wallet } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "genlayer-js";
import { studionet, testnetBradbury } from "genlayer-js/chains";
import { TransactionHashVariant } from "genlayer-js/types";
import type { Hash } from "genlayer-js/types";
import { loadPublicConfig, type PublicConfig } from "@/lib/public-config";
import { isMissingSnapshotError, registrationAction, REGISTRATION_COOLDOWN_MS } from "@/lib/registration-guard";
import { parseContractJson } from "@/lib/transaction-readback";
import { formatDate, shortHash } from "@/lib/format";
import type { ComparisonRun, MarketSnapshot, Relation } from "@/lib/types";

type WalletProvider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?: (event: string, callback: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, callback: (...args: unknown[]) => void) => void;
};

function walletProvider(): WalletProvider | null {
  return (window as Window & { ethereum?: WalletProvider }).ethereum || null;
}

function networkChain(network: PublicConfig["network"]) {
  return network === "bradbury" ? testnetBradbury : studionet;
}

function contractJson(value: unknown): Record<string, unknown> {
  const parsed = parseContractJson(value);
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error("The contract returned an invalid object.");
  return parsed;
}

function eventTone(state: string) {
  if (state.includes("DISAGREE") || state.includes("FAILED") || state.includes("REJECTED")) return "run-event run-event-risk";
  if (state.includes("VERIFIED") || state.includes("PERSISTED")) return "run-event run-event-good";
  return "run-event";
}

function runLabel(state: string) {
  return state.replaceAll("_", " ");
}

function relationSymbol(relation?: Relation) {
  if (relation === "SUBSET") return "⊂";
  if (relation === "SUPERSET") return "⊃";
  if (relation === "EQUIVALENT" || relation === "CONDITIONAL_EQUIVALENT") return "=";
  if (relation === "OVERLAPPING") return "∩";
  if (relation === "CONFLICTING") return "×";
  return "?";
}

export function ComparisonRunClient({ initialRun }: { initialRun: ComparisonRun }) {
  const [run, setRun] = useState(initialRun);
  const [runtimeConfig, setRuntimeConfig] = useState<PublicConfig | null>(null);
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState("");
  const reconcileLock = useRef(false);
  const startLock = useRef(false);
  const registrationCooldown = useRef(new Map<string, number>());
  const runRef = useRef(run);

  useEffect(() => {
    runRef.current = run;
  }, [run]);

  const wrongNetwork = Boolean(runtimeConfig && chainId !== null && chainId !== runtimeConfig.chainId);
  const forensic = !run.registerArgs;
  const terminal = ["PERSISTED_ONCHAIN", "MAJORITY_DISAGREE", "CONSENSUS_REJECTED", "EXECUTION_FAILED"].includes(run.state);
  const canStart = Boolean(run.snapshots && run.registerArgs && runtimeConfig?.contractAddress === run.contractAddress);

  useEffect(() => {
    void loadPublicConfig().then(setRuntimeConfig).catch(() => setMessage("Runtime configuration is unavailable. Existing run data remains preserved."));
  }, []);

  const refreshWallet = useCallback(async () => {
    const current = walletProvider();
    if (!current) return;
    try {
      const accounts = (await current.request({ method: "eth_accounts" })) as string[];
      const rawChain = String(await current.request({ method: "eth_chainId" }));
      const nextChain = rawChain.startsWith("0x") ? parseInt(rawChain, 16) : Number(rawChain);
      setAccount(accounts[0] || "");
      setChainId(accounts[0] ? nextChain : null);
    } catch {
      setAccount("");
      setChainId(null);
    }
  }, []);

  useEffect(() => {
    const current = walletProvider();
    if (!current) return;
    const changed = () => void refreshWallet();
    current.on?.("accountsChanged", changed);
    current.on?.("chainChanged", changed);
    const timer = window.setTimeout(() => void refreshWallet(), 0);
    return () => {
      window.clearTimeout(timer);
      current.removeListener?.("accountsChanged", changed);
      current.removeListener?.("chainChanged", changed);
    };
  }, [refreshWallet]);

  async function updateRun(patch: Record<string, unknown>) {
    const response = await fetch(`/api/comparisons/runs/${run.runId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const body = (await response.json()) as { run?: ComparisonRun; error?: { message?: string } };
    if (!response.ok || !body.run) throw new Error(body.error?.message || "The run could not be persisted.");
    setRun(body.run);
    return body.run;
  }

  async function connect() {
    const current = walletProvider();
    if (!current) throw new Error("A browser wallet is required for onchain writes.");
    const accounts = (await current.request({ method: "eth_requestAccounts" })) as string[];
    const rawChain = String(await current.request({ method: "eth_chainId" }));
    const nextChain = rawChain.startsWith("0x") ? parseInt(rawChain, 16) : Number(rawChain);
    if (!accounts[0]) throw new Error("The wallet did not return an account.");
    setAccount(accounts[0]);
    setChainId(nextChain);
    if (!runtimeConfig || nextChain !== runtimeConfig.chainId) throw new Error(`Wrong network. Eventum requires ${runtimeConfig?.network || "Studionet"} (${runtimeConfig?.chainId || 61999}).`);
    return { account: accounts[0], wallet: current };
  }

  const reconcileNow = useCallback(async () => {
    if (reconcileLock.current) return runRef.current;
    reconcileLock.current = true;
    try {
      const response = await fetch(`/api/comparisons/runs/${runRef.current.runId}?reconcile=1`, { cache: "no-store" });
      const body = (await response.json()) as { run?: ComparisonRun; error?: { message?: string } };
      if (!response.ok || !body.run) throw new Error(body.error?.message || "Verification is temporarily unavailable. Your submitted transaction has not been resubmitted.");
      setRun(body.run);
      return body.run;
    } finally {
      reconcileLock.current = false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    let attempt = 0;
    const delays = [2000, 3000, 5000, 8000, 10000, 10000, 10000];
    const schedule = () => {
      const current = runRef.current;
      const active = Boolean(current.comparisonTx || current.snapshotBTx || current.snapshotATx) && !current.persistedOnchain && !["MAJORITY_DISAGREE", "CONSENSUS_REJECTED", "EXECUTION_FAILED"].includes(current.state);
      if (cancelled || !active) return;
      timer = window.setTimeout(async () => {
        if (cancelled) return;
        if (!document.hidden) {
          try { await reconcileNow(); } catch { setMessage("Verification is temporarily unavailable. Your submitted transaction has not been resubmitted."); }
          attempt += 1;
        }
        schedule();
      }, document.hidden ? 10000 : delays[Math.min(attempt, delays.length - 1)]);
    };
    const onVisibility = () => {
      if (!document.hidden) {
        attempt = 0;
        void reconcileNow().catch(() => setMessage("Verification is temporarily unavailable. Your submitted transaction has not been resubmitted."));
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    schedule();
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reconcileNow, run.comparisonTx, run.snapshotATx, run.snapshotBTx, run.persistedOnchain, run.state]);

  async function registerSnapshot(client: ReturnType<typeof createClient>, snapshot: MarketSnapshot, args: string[], index: 0 | 1, currentRun: ComparisonRun) {
    let existing: Record<string, unknown> | null = null;
    let lookup: "missing" | "unavailable" | { sourceHash: string } = "missing";
    try {
      existing = contractJson(await client.readContract({ address: run.contractAddress as `0x${string}`, functionName: "get_latest_market_snapshot", args: [snapshot.platform, snapshot.platformMarketId], transactionHashVariant: TransactionHashVariant.LATEST_FINAL, jsonSafeReturn: true }));
      lookup = { sourceHash: String(existing.source_hash || "") };
    } catch (error) {
      lookup = isMissingSnapshotError(error) ? "missing" : "unavailable";
    }
    const action = registrationAction(lookup, args[13]);
    if (action === "wait") throw new Error("The existing snapshot could not be verified; no registration write was submitted.");
    if (action === "skip") {
      return reconcileNow();
    }
    const txField = index === 0 ? "snapshotATx" : "snapshotBTx";
    const prior = index === 0 ? currentRun.snapshotATx : currentRun.snapshotBTx;
    let hash = prior as Hash | undefined;
    if (!hash) {
      const cooldownKey = `${snapshot.snapshotId}:${args[13].toLowerCase()}`;
      const lastAttempt = registrationCooldown.current.get(cooldownKey);
      if (lastAttempt !== undefined && Date.now() - lastAttempt < REGISTRATION_COOLDOWN_MS) {
        throw new Error("This snapshot registration is cooling down while the existing attempt is verified.");
      }
      registrationCooldown.current.set(cooldownKey, Date.now());
      hash = await client.writeContract({ address: run.contractAddress as `0x${string}`, functionName: "register_market_snapshot", args: args as never[], value: 0n }) as Hash;
      return updateRun({ [txField]: hash });
    }
    return reconcileNow();
  }

  async function startRun() {
    if (startLock.current || busy || !canStart || !run.snapshots || !run.registerArgs) return;
    startLock.current = true;
    setBusy(true);
    setMessage("");
    try {
      let currentRun = await reconcileNow();
      if (currentRun.persistedOnchain || ["MAJORITY_DISAGREE", "CONSENSUS_REJECTED", "EXECUTION_FAILED"].includes(currentRun.state)) return;
      const config = runtimeConfig;
      if (!config || config.contractAddress !== run.contractAddress) throw new Error("Runtime contract does not match the contract recorded for this run.");
      const connected = await connect();
      const client = createClient({ chain: networkChain(config.network), endpoint: config.rpcUrl, account: connected.account as `0x${string}`, provider: connected.wallet as never });
      for (const index of [0, 1] as const) {
        const expectedState = index === 0 ? "SNAPSHOT_A_VERIFIED" : "SNAPSHOT_B_VERIFIED";
        if (currentRun.state === expectedState || (index === 1 && currentRun.state === "PERSISTED_ONCHAIN")) continue;
        const next = await registerSnapshot(client, currentRun.snapshots![index], currentRun.registerArgs![index], index, currentRun);
        if (!next) return;
        currentRun = next;
        if (currentRun.state !== expectedState) return;
      }
      currentRun = await reconcileNow();
      if (currentRun.persistedOnchain) return;
      let comparisonHash = currentRun.comparisonTx as Hash | undefined;
      if (!comparisonHash) {
        comparisonHash = await client.writeContract({ address: currentRun.contractAddress as `0x${string}`, functionName: "compare_markets", args: [currentRun.snapshotAId, currentRun.snapshotBId, currentRun.comparisonVersion] as never[], value: 0n }) as Hash;
        currentRun = await updateRun({ comparisonTx: comparisonHash });
      }
      if (currentRun.persistedOnchain) setMessage("Run verified successfully. The comparison is now a persisted onchain result.");
      else setMessage("Comparison submitted. Verification will continue automatically using the same transaction hash.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The run could not continue. Its existing hashes were preserved.");
    } finally {
      setBusy(false);
      startLock.current = false;
    }
  }

  async function refreshRun() {
    setRefreshing(true);
    try {
      const response = await fetch(`/api/comparisons/runs/${run.runId}`, { cache: "no-store" });
      const body = (await response.json()) as { run?: ComparisonRun };
      if (response.ok && body.run) setRun(body.run);
    } finally {
      setRefreshing(false);
    }
  }

  async function retryVerification() {
    setRefreshing(true);
    try {
      const next = await reconcileNow();
      setMessage(next.persistedOnchain ? "Run verified successfully. The comparison is now a persisted onchain result." : next.failureReason || "Verification retried against the same transaction hash; no new transaction was submitted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Verification is temporarily unavailable. Your submitted transaction has not been resubmitted.");
    } finally {
      setRefreshing(false);
    }
  }

  async function copy(value: string, label: string) {
    await navigator.clipboard?.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(""), 1200);
  }

  const runStatus = useMemo(() => run.persistedOnchain ? "PERSISTED ONCHAIN" : run.state === "MAJORITY_DISAGREE" ? "CONSENSUS REJECTED" : runLabel(run.state), [run]);
  const explorer = runtimeConfig?.explorerUrl || "";
  const relationshipSummary = run.relation && run.snapshots ? `${shortHash(run.snapshots[0].snapshotId, 7)} ${relationSymbol(run.relation)} ${shortHash(run.snapshots[1].snapshotId, 7)}` : "Awaiting accepted consensus";

  return (
    <main className="page-shell">
      <section className="run-hero"><div className="container"><div className="run-hero-top"><Link href="/comparisons" className="back-link"><ArrowLeft size={14} aria-hidden="true" /> Comparison history</Link><button className="icon-button" type="button" onClick={() => void refreshRun()} disabled={refreshing} aria-label="Refresh comparison run"><RefreshCw size={16} aria-hidden="true" className={refreshing ? "spin-once" : ""} /></button></div><div className="eyebrow">EVENTUM / COMPARISON RUN</div><div className="run-title-row"><div><h1>{runStatus}</h1><p>Run <span className="mono">{run.runId}</span> · created {formatDate(run.createdAt)}</p></div><span className={`run-state ${run.persistedOnchain ? "run-state-good" : run.state === "MAJORITY_DISAGREE" ? "run-state-risk" : ""}`}>{runLabel(run.state)}</span></div></div></section>
      <section className="container run-content">
        {message && <div className="run-alert" role="alert"><CircleAlert size={17} aria-hidden="true" /><span>{message}</span></div>}
        <div className="run-grid">
          <div>
            <section className="run-section"><div className="section-heading compact-heading"><div><div className="section-kicker">EVIDENCE FRAME</div><h2>Two published rules.</h2></div><p>The run keeps the exact prepared pair beside every lifecycle event. Offchain evidence is descriptive; onchain state remains authoritative.</p></div><div className="run-markets">{run.snapshots?.map((market, index) => <article className="run-market" key={market.snapshotId}><div className="run-market-label"><span>MARKET {index === 0 ? "A" : "B"}</span><span>v{market.version}</span></div><h3>{market.title}</h3><p>{market.description}</p><dl className="data-list"><div><dt>Platform</dt><dd>{market.providerLabel}</dd></div><div><dt>Outcomes</dt><dd>{market.outcomes.join(" / ")}</dd></div><div><dt>Window</dt><dd>{formatDate(market.openTime)} → {formatDate(market.closeTime)}</dd></div><div><dt>Source hash</dt><dd className="mono">{shortHash(market.sourceHash, 8)}</dd></div><div><dt>Source evidence hash</dt><dd className="mono">{market.sourceEvidenceHash ? shortHash(market.sourceEvidenceHash, 8) : "Generated onchain"}</dd></div></dl></article>) || <div className="run-market-placeholder"><ShieldAlert size={20} aria-hidden="true" /><p>Snapshot evidence is available from the current onchain IDs above.</p></div>}</div></section>
            <section className="run-section"><div className="section-kicker">CONSENSUS TIMELINE</div><h2>Protocol truth, in order.</h2><div className="run-timeline" aria-label="Comparison run lifecycle">{run.events.map((event, index) => <div className={eventTone(event.state)} key={`${event.at}-${index}`}><div className="run-event-marker">{event.state.includes("REJECTED") || event.state.includes("DISAGREE") ? <ShieldAlert size={14} aria-hidden="true" /> : event.state.includes("VERIFIED") || event.state.includes("PERSISTED") ? <Check size={14} aria-hidden="true" /> : <span>{String(index + 1).padStart(2, "0")}</span>}</div><div><strong>{runLabel(event.state)}</strong><time>{formatDate(event.at)}</time>{event.detail && <p>{event.detail}</p>}</div></div>)}</div></section>
          </div>
          <aside className="run-aside">
            <section className="protocol-panel run-panel"><div className="section-kicker">RUN CONTROL</div><h2>{forensic ? "Forensic record" : "Resume safely"}</h2><p>{forensic ? "This real attempt is preserved as application history. The leader returned a proposal, validators rejected consensus, and no onchain comparison exists." : "This page owns the wallet and transaction lifecycle. Refresh, navigation, and PM2 restarts recover from the server record."}</p>{!forensic && <div className="form-actions"><button className="button button-primary" type="button" onClick={() => void startRun()} disabled={busy || !canStart || wrongNetwork || terminal}>{busy ? "Working the run…" : wrongNetwork ? "Wrong network" : run.persistedOnchain ? "Run verified" : terminal ? "Run is terminal" : "Connect wallet & begin run"} <Wallet size={15} aria-hidden="true" /></button></div>}<dl className="data-list instrument-data"><div><dt>Wallet</dt><dd className="mono">{account ? shortHash(account, 7) : "Not connected"}</dd></div><div><dt>Network</dt><dd>{run.network} · {run.chainId}</dd></div><div><dt>Contract</dt><dd className="mono">{shortHash(run.contractAddress, 9)}</dd></div><div><dt>Persistence</dt><dd>{run.persistedOnchain ? "Onchain + run record" : "Run record only"}</dd></div></dl></section>
            <section className="run-panel result-card"><div className="section-kicker">TRANSACTION REFERENCES</div>{(["snapshotATx", "snapshotBTx", "comparisonTx"] as const).map((field) => { const value = run[field]; return <div className="reference-row" key={field}><span>{field === "snapshotATx" ? "Snapshot A" : field === "snapshotBTx" ? "Snapshot B" : "Comparison"}</span>{value ? <div><button className="hash-button mono" type="button" onClick={() => void copy(value, field)} title="Copy transaction hash">{copied === field ? "Copied" : shortHash(value, 9)} <Copy size={13} aria-hidden="true" /></button>{explorer && <a className="hash-external" href={`${explorer.replace(/\/$/, "")}/tx/${value}`} target="_blank" rel="noreferrer" aria-label={`Open ${field} in explorer`}><ExternalLink size={13} aria-hidden="true" /></a>}</div> : <em>Not submitted</em>}</div>; })}</section>
            {["MAJORITY_DISAGREE", "CONSENSUS_REJECTED", "EXECUTION_FAILED", "RPC_UNAVAILABLE", "VERIFICATION_PENDING"].includes(run.state) && <section className={`callout ${run.state === "MAJORITY_DISAGREE" || run.state === "CONSENSUS_REJECTED" || run.state === "EXECUTION_FAILED" ? "callout-risk" : "callout-dark"}`}><strong>{run.state === "EXECUTION_FAILED" ? "EXECUTION FAILED" : run.state === "RPC_UNAVAILABLE" ? "VERIFICATION UNAVAILABLE" : run.state === "VERIFICATION_PENDING" ? "VERIFICATION PENDING" : "CONSENSUS NOT ACCEPTED"}</strong><p>{run.failureReason || (run.state === "VERIFICATION_PENDING" ? "The submitted transaction has not been fully verified yet. Your transaction has not been resubmitted." : run.state === "RPC_UNAVAILABLE" ? "Verification is temporarily unavailable. Your submitted transaction has not been resubmitted." : "GenLayer validators did not accept the proposed semantic relationship, so no comparison was persisted onchain.")}</p>{(run.state === "MAJORITY_DISAGREE" || run.state === "CONSENSUS_REJECTED" || run.state === "EXECUTION_FAILED") && <dl className="data-list"><div><dt>Persisted onchain</dt><dd>NO</dd></div><div><dt>Run remains auditable</dt><dd>YES</dd></div></dl>}{run.leaderRelation && <p className="run-proposal">Leader proposal: <strong>{runLabel(run.leaderRelation)}</strong></p>}{!forensic && (run.comparisonTx || run.snapshotATx || run.snapshotBTx) && !["MAJORITY_DISAGREE", "CONSENSUS_REJECTED", "EXECUTION_FAILED", "PERSISTED_ONCHAIN"].includes(run.state) && <button className="button button-secondary" type="button" onClick={() => void retryVerification()} disabled={refreshing}>{refreshing ? "Verifying…" : "Retry verification"}</button>}</section>}
          </aside>
        </div>
        {run.persistedOnchain && run.comparisonId && <section className="run-result-strip"><div><div className="section-kicker">PERSISTED RESULT</div><div className="run-relationship-mini">{relationshipSummary}</div><h2>{runLabel(run.relation || "COMPARISON")}</h2><p>{run.safeToCompare ? "Safe to compare" : "Not safe to compare"} · {run.safeToAggregate ? "safe to aggregate" : "aggregation not authorized"}</p></div><Link className="button button-secondary" href={`/comparisons/${run.comparisonId}`}>Open result <ExternalLink size={15} aria-hidden="true" /></Link></section>}
      </section>
    </main>
  );
}
