import { CheckCircle2, CircleAlert, ExternalLink } from "lucide-react";
import { getPublicConfig } from "@/lib/config";
import type { ContractStatus } from "@/lib/types";

export function StatusPanel({ status }: { status: ContractStatus }) {
  const explorer = getPublicConfig().explorerUrl;
  return (
    <div className="status-card">
      <div className="status-dot" style={{ color: status.contractReachable ? "#166534" : "#a16207" }}>{status.contractReachable ? <CheckCircle2 size={16} aria-hidden="true" /> : <CircleAlert size={16} aria-hidden="true" />} {status.contractReachable ? "Contract reachable" : status.configured ? "Contract read failed" : "Contract not configured"}</div>
      <h2 style={{ marginTop: 18 }}>{status.contractReachable ? "Live deployment" : status.configured ? "Deployment unavailable" : "Release evidence pending"}</h2>
      <p>{status.contractReachable ? "The configured RPC answered the protocol version read. This is a live network check, not a local fixture." : status.configured ? "The deployment is configured, but its RPC did not answer this finalized read. No cached relationship is shown as authoritative." : "This environment has no deployed contract configured. No placeholder contract result is shown."}</p>
      <div className="data-list">
        <div><dt>Network</dt><dd>{status.network}</dd></div>
        <div><dt>Chain ID</dt><dd className="mono">{status.chainId}</dd></div>
        <div><dt>RPC</dt><dd className="mono">{status.rpcUrl}</dd></div>
        <div><dt>Address</dt><dd className="mono">{status.contractAddress || "Not configured"}</dd></div>
        {status.protocolVersion && <div><dt>Protocol</dt><dd className="mono">{status.protocolVersion}</dd></div>}
      </div>
      {status.contractReachable && <a className="button button-secondary" style={{ marginTop: 22 }} href={explorer} target="_blank" rel="noreferrer">Open explorer <ExternalLink size={14} aria-hidden="true" /></a>}
    </div>
  );
}
