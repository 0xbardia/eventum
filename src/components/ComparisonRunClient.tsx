"use client";

import { ArrowLeft, Check, CircleAlert, Copy, ExternalLink, RefreshCw, ShieldAlert, Wallet } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "genlayer-js";
import { studionet, testnetBradbury } from "genlayer-js/chains";
import { TransactionHashVariant, TransactionStatus } from "genlayer-js/types";
import type { Hash } from "genlayer-js/types";
import { loadPublicConfig, type PublicConfig } from "@/lib/public-config";
import { assertSnapshotReadback, parseContractJson } from "@/lib/transaction-readback";
import { classifyTransaction, transactionExecutionResultName } from "@/lib/transaction-status";
import { formatDate, shortHash } from "@/lib/format";
import type { Comparison, ComparisonRun, MarketSnapshot, Relation } from "@/lib/types";

type WalletProvider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?: (event: string, callback: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, callback: (...args: unknown[]) => void) => void;
};

type TransactionReader = {
  getTransaction(args: { hash: Hash }): Promise<unknown>;
  request(args: { method: "eth_getTransactionByHash"; params: [Hash] }): Promise<unknown>;
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

function comparisonFromContract(value: unknown): Comparison {
  const item = contractJson(value);
  return {
    comparisonId: String(item.comparison_id),
    snapshotAId: String(item.snapshot_a_id),
    snapshotBId: String(item.snapshot_b_id),
    relation: String(item.relation) as Comparison["relation"],
    safeToCompare: Boolean(item.safe_to_compare),
    safeToAggregate: Boolean(item.safe_to_aggregate),
    canonicalEventKeyIfSafe: String(item.canonical_event_key_if_safe || ""),
    outcomeMapping: (item.outcome_mapping || {}) as Comparison["outcomeMapping"],
    reasonCodes: Array.isArray(item.reason_codes) ? item.reason_codes.map(String) : [],
    materialDifferences: Array.isArray(item.material_differences) ? item.material_differences.map(String) : [],
    conciseRationale: String(item.concise_rationale || ""),
    evidenceHashes: Array.isArray(item.evidence_hashes) ? item.evidence_hashes.map(String) : [],
    comparisonVersion: String(item.comparison_version),
    createdAt: String(item.created_at || ""),
    direct: true,
    authority: "onchain",
  };
}

async function fullTransaction(client: TransactionReader, hash: Hash): Promise<unknown> {
  const sdkTransaction = await client.getTransaction({ hash });
  if (transactionExecutionResultName(sdkTransaction)) return sdkTransaction;
  try {
    const raw = await client.request({ method: "eth_getTransactionByHash", params: [hash] });
    if (raw && typeof raw === "object" && !Array.isArray(raw) && sdkTransaction && typeof sdkTransaction === "object") {
      const rawRecord = raw as Record<string, unknown>;
      const sdkRecord = sdkTransaction as Record<string, unknown>;
      return { ...rawRecord, ...sdkRecord, consensus_data: sdkRecord.consensus_data ?? rawRecord.consensus_data };
    }
  } catch {
    // Keep the SDK result as the read-only fallback; no write is safe here.
  }
  return sdkTransaction;
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

  const wrongNetwork = Boolean(runtimeConfig && chainId !== null && chainId !== runtimeConfig.chainId);
  const forensic = !run.registerArgs;
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

  async function transition(state: string, detail: string, patch: Record<string, unknown> = {}) {
    return updateRun({ ...patch, state, eventState: state, eventDetail: detail });
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

  async function readClient(config: PublicConfig) {
    return createClient({ chain: networkChain(config.network), endpoint: config.rpcUrl });
  }

  async function waitForTransaction(client: TransactionReader & { waitForTransactionReceipt(args: { hash: Hash; status: TransactionStatus; interval: number; retries: number }): Promise<unknown> }, hash: Hash, operation: string) {
    await transition("CONSENSUS_PENDING", `${operation} submitted; awaiting GenLayer consensus.`);
    try {
      await client.waitForTransactionReceipt({ hash, status: TransactionStatus.FINALIZED, interval: 3000, retries: 100 });
    } catch {
      // The hash remains durable; reconciliation below decides whether it is safe to continue.
    }
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        const observed = await fullTransaction(client, hash);
        const classification = classifyTransaction(observed);
        if (classification.state === "consensus-error") {
          await transition("MAJORITY_DISAGREE", `${operation} finalized without accepting consensus. No replacement transaction is safe.`, {
            consensusOutcome: classification.consensusResultName,
            executionResult: classification.executionResultName,
            persistedOnchain: false,
            failureReason: "Consensus rejected the proposal; no onchain comparison was persisted.",
          });
          throw new Error(`${operation} reached FINALIZED but consensus did not accept it.`);
        }
        if (classification.state === "execution-error") {
          await transition("EXECUTION_FAILED", `${operation} finalized with a contract execution error.`, { executionResult: classification.executionResultName, persistedOnchain: false, failureReason: "The contract execution returned an error." });
          throw new Error(`${operation} execution failed after finalization.`);
        }
        if (classification.state === "success") {
          await transition("FINALIZED_VERIFYING", `${operation} finalized; verifying the contract read-back.`, { consensusOutcome: classification.consensusResultName, executionResult: classification.executionResultName });
          return observed;
        }
      } catch (error) {
        if (error instanceof Error && /consensus did not accept|execution failed/.test(error.message)) throw error;
      }
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 700));
    }
    await transition("VERIFICATION_PENDING", `${operation} is finalized or submitted, but execution verification is temporarily unavailable.`);
    throw new Error(`${operation} remains verification-pending. The same transaction hash is preserved; do not submit again.`);
  }

  async function registerSnapshot(client: ReturnType<typeof createClient>, snapshot: MarketSnapshot, args: string[], index: 0 | 1) {
    let existing: Record<string, unknown> | null = null;
    try {
      existing = contractJson(await client.readContract({ address: run.contractAddress as `0x${string}`, functionName: "get_latest_market_snapshot", args: [snapshot.platform, snapshot.platformMarketId], transactionHashVariant: TransactionHashVariant.LATEST_FINAL, jsonSafeReturn: true }));
    } catch {
      // A fresh deployment has no latest snapshot yet; the registration is still the only write path.
    }
    if (existing?.snapshot_id === snapshot.snapshotId) {
      assertSnapshotReadback(existing, snapshot);
      await transition(index === 0 ? "SNAPSHOT_A_VERIFIED" : "SNAPSHOT_B_VERIFIED", `Snapshot ${index === 0 ? "A" : "B"} already matches the finalized onchain record.`);
      return;
    }
    const txField = index === 0 ? "snapshotATx" : "snapshotBTx";
    const prior = index === 0 ? run.snapshotATx : run.snapshotBTx;
    let hash = prior as Hash | undefined;
    if (!hash) {
      await transition("WAITING_SIGNATURE", `Waiting for wallet signature for snapshot ${index === 0 ? "A" : "B"}.`);
      hash = await client.writeContract({ address: run.contractAddress as `0x${string}`, functionName: "register_market_snapshot", args: args as never[], value: 0n }) as Hash;
      await updateRun({ [txField]: hash, state: "SUBMITTED", eventState: "SUBMITTED", eventDetail: `Snapshot ${index === 0 ? "A" : "B"} transaction submitted; hash persisted before monitoring.` });
    } else {
      await transition("SUBMITTED", `Resuming snapshot ${index === 0 ? "A" : "B"} from its existing transaction hash.`);
    }
    await waitForTransaction(client as never, hash, `Snapshot ${index === 0 ? "A" : "B"}`);
    const registered = contractJson(await client.readContract({ address: run.contractAddress as `0x${string}`, functionName: "get_latest_market_snapshot", args: [snapshot.platform, snapshot.platformMarketId], transactionHashVariant: TransactionHashVariant.LATEST_FINAL, jsonSafeReturn: true }));
    assertSnapshotReadback(registered, snapshot);
    await transition(index === 0 ? "SNAPSHOT_A_VERIFIED" : "SNAPSHOT_B_VERIFIED", `Snapshot ${index === 0 ? "A" : "B"} read-back matches the prepared evidence.`, { state: index === 0 ? "SNAPSHOT_A_VERIFIED" : "SNAPSHOT_B_VERIFIED" });
  }

  async function verifySnapshotReadback(client: ReturnType<typeof createClient>, index: 0 | 1) {
    const snapshot = run.snapshots?.[index];
    if (!snapshot) throw new Error("Snapshot evidence is unavailable for this run.");
    const value = await client.readContract({ address: run.contractAddress as `0x${string}`, functionName: "get_market_snapshot", args: [snapshot.snapshotId], transactionHashVariant: TransactionHashVariant.LATEST_FINAL, jsonSafeReturn: true });
    assertSnapshotReadback(value, snapshot);
    await transition(index === 0 ? "SNAPSHOT_A_VERIFIED" : "SNAPSHOT_B_VERIFIED", `Snapshot ${index === 0 ? "A" : "B"} read-back matches the prepared evidence.`);
  }

  async function verifyComparisonReadback(client: ReturnType<typeof createClient>) {
    const value = await client.readContract({ address: run.contractAddress as `0x${string}`, functionName: "get_latest_comparison", args: [run.snapshotAId, run.snapshotBId], transactionHashVariant: TransactionHashVariant.LATEST_FINAL, jsonSafeReturn: true });
    const comparison = comparisonFromContract(value);
    if (comparison.snapshotAId !== run.snapshotAId || comparison.snapshotBId !== run.snapshotBId || comparison.comparisonVersion !== run.comparisonVersion) throw new Error("Comparison read-back did not match this run.");
    await updateRun({ state: "PERSISTED_ONCHAIN", eventState: "READ_BACK_VERIFIED", eventDetail: "The comparison is persisted and matches the current run pair.", comparisonId: comparison.comparisonId, consensusOutcome: "MAJORITY_AGREE", executionResult: "FINISHED_WITH_RETURN", persistedOnchain: true, relation: comparison.relation, safeToCompare: comparison.safeToCompare, safeToAggregate: comparison.safeToAggregate, outcomeMapping: comparison.outcomeMapping, reasonCodes: comparison.reasonCodes, materialDifferences: comparison.materialDifferences });
  }

  async function reconcileComparison(client: ReturnType<typeof createClient>, hash: Hash) {
    await waitForTransaction(client as never, hash, "Comparison");
    await verifyComparisonReadback(client);
  }

  async function startRun() {
    if (busy || !canStart || !run.snapshots || !run.registerArgs) return;
    setBusy(true);
    setMessage("");
    try {
      const config = runtimeConfig;
      if (!config || config.contractAddress !== run.contractAddress) throw new Error("Runtime contract does not match the contract recorded for this run.");
      const connected = await connect();
      const client = createClient({ chain: networkChain(config.network), endpoint: config.rpcUrl, account: connected.account as `0x${string}`, provider: connected.wallet as never });
      await registerSnapshot(client, run.snapshots[0], run.registerArgs[0], 0);
      await registerSnapshot(client, run.snapshots[1], run.registerArgs[1], 1);
      let comparisonHash = run.comparisonTx as Hash | undefined;
      if (!comparisonHash) {
        await transition("WAITING_SIGNATURE", "Waiting for wallet signature for the comparison transaction.");
        comparisonHash = await client.writeContract({ address: run.contractAddress as `0x${string}`, functionName: "compare_markets", args: [run.snapshotAId, run.snapshotBId, run.comparisonVersion] as never[], value: 0n }) as Hash;
        await updateRun({ comparisonTx: comparisonHash, state: "SUBMITTED", eventState: "SUBMITTED", eventDetail: "Comparison transaction submitted; hash persisted before consensus monitoring." });
      }
      await reconcileComparison(client, comparisonHash);
      setMessage("Run verified successfully. The comparison is now a persisted onchain result.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The run could not continue. Its existing hashes were preserved.");
    } finally {
      setBusy(false);
    }
  }

  const reconcile = useCallback(async () => {
    if (reconcileLock.current || !runtimeConfig) return;
    const hash = run.comparisonTx || run.snapshotBTx || run.snapshotATx;
    if (!hash || run.persistedOnchain || run.state === "MAJORITY_DISAGREE" || run.state === "CONSENSUS_REJECTED") return;
    reconcileLock.current = true;
    try {
      const client = await readClient(runtimeConfig);
      const observed = await fullTransaction(client as unknown as TransactionReader, hash as Hash);
      const classification = classifyTransaction(observed);
      if (classification.state === "consensus-error") await transition("MAJORITY_DISAGREE", "The existing transaction was rejected by consensus. No new transaction was submitted.", { consensusOutcome: classification.consensusResultName, executionResult: classification.executionResultName, persistedOnchain: false, failureReason: "Consensus rejected the proposal; no onchain comparison was persisted." });
      else if (classification.state === "execution-error") await transition("EXECUTION_FAILED", "The existing transaction finalized with an execution error. No new transaction was submitted.", { executionResult: classification.executionResultName, persistedOnchain: false });
      else if (classification.state === "success") {
        await transition("FINALIZED_VERIFYING", "The existing transaction finalized; read-back verification is in progress.", { executionResult: classification.executionResultName });
        if (run.comparisonTx === hash) await verifyComparisonReadback(client);
        else await verifySnapshotReadback(client, run.snapshotBTx === hash ? 1 : 0);
      }
      else await transition("VERIFICATION_PENDING", "The existing transaction is not fully verifiable yet. No new transaction was submitted.");
    } catch {
      setMessage("Verification is temporarily unavailable. The existing transaction hash remains preserved; do not submit again.");
    } finally {
      reconcileLock.current = false;
    }
  // The reconciliation callback intentionally captures this run snapshot; live actions
  // persist their own transitions and must not trigger a second reconciliation loop.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, runtimeConfig]);

  useEffect(() => {
    const timer = window.setTimeout(() => void reconcile(), 0);
    return () => window.clearTimeout(timer);
  }, [reconcile]);

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
            <section className="run-section"><div className="section-heading compact-heading"><div><div className="section-kicker">EVIDENCE FRAME</div><h2>Two published rules.</h2></div><p>The run keeps the exact prepared pair beside every lifecycle event. Offchain evidence is descriptive; onchain state remains authoritative.</p></div><div className="run-markets">{run.snapshots?.map((market, index) => <article className="run-market" key={market.snapshotId}><div className="run-market-label"><span>MARKET {index === 0 ? "A" : "B"}</span><span>v{market.version}</span></div><h3>{market.title}</h3><p>{market.description}</p><dl className="data-list"><div><dt>Platform</dt><dd>{market.providerLabel}</dd></div><div><dt>Outcomes</dt><dd>{market.outcomes.join(" / ")}</dd></div><div><dt>Window</dt><dd>{formatDate(market.openTime)} → {formatDate(market.closeTime)}</dd></div><div><dt>Source hash</dt><dd className="mono">{shortHash(market.sourceHash, 8)}</dd></div></dl></article>) || <div className="run-market-placeholder"><ShieldAlert size={20} aria-hidden="true" /><p>Snapshot evidence is available from the current onchain IDs above.</p></div>}</div></section>
            <section className="run-section"><div className="section-kicker">CONSENSUS TIMELINE</div><h2>Protocol truth, in order.</h2><div className="run-timeline" aria-label="Comparison run lifecycle">{run.events.map((event, index) => <div className={eventTone(event.state)} key={`${event.at}-${index}`}><div className="run-event-marker">{event.state.includes("REJECTED") || event.state.includes("DISAGREE") ? <ShieldAlert size={14} aria-hidden="true" /> : event.state.includes("VERIFIED") || event.state.includes("PERSISTED") ? <Check size={14} aria-hidden="true" /> : <span>{String(index + 1).padStart(2, "0")}</span>}</div><div><strong>{runLabel(event.state)}</strong><time>{formatDate(event.at)}</time>{event.detail && <p>{event.detail}</p>}</div></div>)}</div></section>
          </div>
          <aside className="run-aside">
            <section className="protocol-panel run-panel"><div className="section-kicker">RUN CONTROL</div><h2>{forensic ? "Forensic record" : "Resume safely"}</h2><p>{forensic ? "This real attempt is preserved as application history. The leader returned a proposal, validators rejected consensus, and no onchain comparison exists." : "This page owns the wallet and transaction lifecycle. Refresh, navigation, and PM2 restarts recover from the server record."}</p>{!forensic && <div className="form-actions"><button className="button button-primary" type="button" onClick={() => void startRun()} disabled={busy || !canStart || wrongNetwork || run.persistedOnchain || run.state === "MAJORITY_DISAGREE"}>{busy ? "Working the run…" : wrongNetwork ? "Wrong network" : run.persistedOnchain ? "Run verified" : run.state === "MAJORITY_DISAGREE" ? "Consensus rejected" : "Connect wallet & begin run"} <Wallet size={15} aria-hidden="true" /></button></div>}<dl className="data-list instrument-data"><div><dt>Wallet</dt><dd className="mono">{account ? shortHash(account, 7) : "Not connected"}</dd></div><div><dt>Network</dt><dd>{run.network} · {run.chainId}</dd></div><div><dt>Contract</dt><dd className="mono">{shortHash(run.contractAddress, 9)}</dd></div><div><dt>Persistence</dt><dd>{run.persistedOnchain ? "Onchain + run record" : "Run record only"}</dd></div></dl></section>
            <section className="run-panel result-card"><div className="section-kicker">TRANSACTION REFERENCES</div>{(["snapshotATx", "snapshotBTx", "comparisonTx"] as const).map((field) => { const value = run[field]; return <div className="reference-row" key={field}><span>{field === "snapshotATx" ? "Snapshot A" : field === "snapshotBTx" ? "Snapshot B" : "Comparison"}</span>{value ? <div><button className="hash-button mono" type="button" onClick={() => void copy(value, field)} title="Copy transaction hash">{copied === field ? "Copied" : shortHash(value, 9)} <Copy size={13} aria-hidden="true" /></button>{explorer && <a className="hash-external" href={`${explorer.replace(/\/$/, "")}/tx/${value}`} target="_blank" rel="noreferrer" aria-label={`Open ${field} in explorer`}><ExternalLink size={13} aria-hidden="true" /></a>}</div> : <em>Not submitted</em>}</div>; })}</section>
            {run.state === "MAJORITY_DISAGREE" && <section className="callout callout-risk"><strong>CONSENSUS NOT ACCEPTED</strong><p>Validators did not accept the leader proposal. Funds and onchain comparison state were not created by this run. Retrying the same logical operation requires a separately reviewed contract decision.</p>{run.leaderRelation && <p className="run-proposal">Leader proposal: <strong>{runLabel(run.leaderRelation)}</strong></p>}</section>}
          </aside>
        </div>
        {run.persistedOnchain && run.comparisonId && <section className="run-result-strip"><div><div className="section-kicker">PERSISTED RESULT</div><div className="run-relationship-mini">{relationshipSummary}</div><h2>{runLabel(run.relation || "COMPARISON")}</h2><p>{run.safeToCompare ? "Safe to compare" : "Not safe to compare"} · {run.safeToAggregate ? "safe to aggregate" : "aggregation not authorized"}</p></div><Link className="button button-secondary" href={`/comparisons/${run.comparisonId}`}>Open result <ExternalLink size={15} aria-hidden="true" /></Link></section>}
      </section>
    </main>
  );
}
