import { ArrowUpRight, Check, CircleAlert } from "lucide-react";
import Link from "next/link";
import { getContractStatus } from "@/lib/genlayer";
import { shortHash } from "@/lib/format";
import type { ContractStatus } from "@/lib/types";

export async function ContractProof() {
  const status: ContractStatus = await getContractStatus().catch((error): ContractStatus => ({
    configured: false,
    network: "unknown",
    chainId: 0,
    rpcUrl: "",
    contractAddress: "",
    checkedAt: new Date().toISOString(),
    contractReachable: false,
    error: error instanceof Error ? error.message : "Status unavailable",
  }));
  return (
    <div className="proof-grid">
      <div className="proof-panel">
        <h3>Proof of record</h3>
        <p>Eventum stores the relationship decision, evidence hashes, and outcome map on the Intelligent Contract.</p>
        <div style={{ marginTop: 20 }}>
          <div className="proof-line"><span>Network</span><strong className="proof-value">{status.network} · {status.chainId || "—"}</strong></div>
          <div className="proof-line"><span>Protocol</span><strong className="proof-value mono">{status.protocolVersion || "Not read"}</strong></div>
          <div className="proof-line"><span>Contract</span><strong className="proof-value mono">{status.contractAddress ? shortHash(status.contractAddress, 8) : "Not configured"}</strong></div>
          <div className="proof-line"><span>Read status</span><strong className="proof-value status-dot" style={{ color: status.contractReachable ? "#166534" : "#a16207" }}>{status.contractReachable ? "Reachable" : status.configured ? "Unavailable" : "Awaiting deployment"}</strong></div>
        </div>
      </div>
      <div className="proof-panel">
        <h3>{status.contractReachable ? "Live contract connected" : status.configured ? "Contract read unavailable" : "Evidence before theater"}</h3>
        <p>{status.contractReachable ? "This page is reading the configured deployed contract. Open Status for the network check and exact address." : status.configured ? "The configured address is retained, but this RPC read did not succeed. Eventum does not substitute cached state for the contract." : "The product never substitutes a made-up comparison while the contract is unavailable. Configure the tested deployment to enable writes."}</p>
        <div className="hero-actions" style={{ marginTop: 24 }}>
          <Link className="button button-secondary" href="/status">Inspect status <ArrowUpRight size={15} aria-hidden="true" /></Link>
          {!status.contractReachable && <span className="status-dot" style={{ alignSelf: "center" }}><CircleAlert size={15} aria-hidden="true" /> {status.configured ? "RPC unavailable" : "Contract not configured"}</span>}
          {status.contractReachable && <span className="status-dot" style={{ alignSelf: "center", color: "#166534" }}><Check size={15} aria-hidden="true" /> Live read verified</span>}
        </div>
      </div>
    </div>
  );
}
