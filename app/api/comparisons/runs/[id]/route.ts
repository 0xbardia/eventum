import { errorResponse, parseBody, rateLimitResponse, readJson, response, withApiHeaders } from "@/lib/api";
import { getComparisonRun, getComparisonRunRecord, updateComparisonRun } from "@/lib/db";
import { ReconciliationError, reconcileComparisonRun, validateTransactionClaim } from "@/lib/run-reconciliation";
import { updateComparisonRunSchema } from "@/lib/schemas";
import { getSession } from "@/lib/session";
import { readTransaction } from "@/lib/genlayer";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = rateLimitResponse(request);
  if (limited) return limited;
  const { id } = await context.params;
  let run = getComparisonRun(id);
  if (!run) return withApiHeaders(response({ error: { code: "COMPARISON_RUN_NOT_FOUND", message: "Comparison run not found." } }, 404));
  const session = getSession(request);
  const record = getComparisonRunRecord(id);
  if (new URL(request.url).searchParams.get("reconcile") === "1" && session && record?.ownerSessionHash === session.hash) {
    try {
      run = await reconcileComparisonRun(id);
    } catch (error) {
      if (error instanceof ReconciliationError) return withApiHeaders(response({ error: { code: error.code, message: error.message } }, error.status));
      return withApiHeaders(errorResponse(error));
    }
  }
  return withApiHeaders(response({ run, authority: "application-persistence" }));
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const limited = rateLimitResponse(request);
    if (limited) return limited;
    const { id } = await context.params;
    const session = getSession(request);
    if (!session) return withApiHeaders(response({ error: { code: "COMPARISON_RUN_AUTH_REQUIRED", message: "This comparison run requires its owning application session." } }, 401));
    const current = getComparisonRunRecord(id);
    if (!current) return withApiHeaders(response({ error: { code: "COMPARISON_RUN_NOT_FOUND", message: "Comparison run not found." } }, 404));
    if (!current.ownerSessionHash) return withApiHeaders(response({ error: { code: "COMPARISON_RUN_READ_ONLY", message: "Historical comparison runs are readable but cannot be modified." } }, 403));
    if (current.ownerSessionHash !== session.hash) return withApiHeaders(response({ error: { code: "COMPARISON_RUN_FORBIDDEN", message: "This comparison run belongs to another application session." } }, 403));
    const body = parseBody(updateComparisonRunSchema, await readJson(request));
    const fields = Object.entries(body).filter(([, value]) => value !== undefined);
    if (fields.length !== 1) return withApiHeaders(response({ error: { code: "INVALID_TRANSACTION_CLAIM", message: "Submit exactly one transaction hash claim at a time." } }, 400));
    const [field, hash] = fields[0] as ["snapshotATx" | "snapshotBTx" | "comparisonTx", string];
    const existing = current[field];
    if (existing && existing !== hash) return withApiHeaders(response({ error: { code: "TRANSACTION_ALREADY_BOUND", message: "A different transaction hash is already bound to this run stage." } }, 409));
    if (existing) return withApiHeaders(response({ run: getComparisonRun(id), authority: "application-persistence" }));
    if (["PERSISTED_ONCHAIN", "MAJORITY_DISAGREE", "CONSENSUS_REJECTED", "EXECUTION_FAILED"].includes(current.state)) {
      return withApiHeaders(response({ error: { code: "COMPARISON_RUN_TERMINAL", message: "This comparison run is terminal and cannot accept another transaction." } }, 409));
    }
    if (!existing) {
      try {
        const observed = await readTransaction(hash);
        if (observed) validateTransactionClaim(observed, current, field === "comparisonTx" ? "comparison" : field === "snapshotATx" ? "snapshotA" : "snapshotB");
      } catch (error) {
        if (error instanceof ReconciliationError) throw error;
        // The hash may not be indexed yet. It is stored as a claim and reconciled later.
      }
    }
    const detail = "Transaction hash persisted as a claim; server verification will reconcile this same hash.";
    const event = current.state === "SUBMITTED" ? undefined : { state: "SUBMITTED", at: new Date().toISOString(), detail };
    return withApiHeaders(response({ run: updateComparisonRun(id, { [field]: hash, state: "SUBMITTED" }, event), authority: "application-persistence" }));
  } catch (error) {
    if (error instanceof ReconciliationError) return withApiHeaders(response({ error: { code: error.code, message: error.message } }, error.status));
    return withApiHeaders(errorResponse(error));
  }
}
