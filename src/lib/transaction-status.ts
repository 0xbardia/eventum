import {
  executionResultNumberToName,
  ExecutionResult,
  transactionResultNumberToName,
  transactionsStatusNumberToName,
} from "genlayer-js/types";

type RecordLike = Record<string, unknown>;

function record(value: unknown): RecordLike | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as RecordLike : null;
}

function normalized(value: unknown): string | undefined {
  return typeof value === "string" && value ? value.toUpperCase() : undefined;
}

export function transactionStatusName(value: unknown): string | undefined {
  const item = record(value);
  if (!item) return undefined;
  const raw = item.statusName ?? item.status_name ?? item.status;
  if (typeof raw === "number" || (typeof raw === "string" && /^\d+$/.test(raw))) {
    return (transactionsStatusNumberToName as Record<string, string>)[String(raw)]?.toUpperCase();
  }
  return normalized(raw);
}

export function transactionExecutionResultName(value: unknown): ExecutionResult | undefined {
  const item = record(value);
  if (!item) return undefined;

  const direct = item.txExecutionResultName ?? item.tx_execution_result_name;
  if (direct === ExecutionResult.FINISHED_WITH_RETURN || direct === ExecutionResult.FINISHED_WITH_ERROR) {
    return direct;
  }
  const numeric = item.txExecutionResult;
  if (typeof numeric === "number" || (typeof numeric === "string" && /^\d+$/.test(numeric))) {
    const mapped = (executionResultNumberToName as Record<string, ExecutionResult>)[String(numeric)];
    if (mapped) return mapped;
  }

  const consensus = record(item.consensus_data ?? item.consensusData);
  const receipts = consensus?.leader_receipt;
  const leader = Array.isArray(receipts) ? record(receipts[0]) : record(receipts);
  const nestedResult = record(leader?.result);
  const executionResult = normalized(leader?.execution_result);
  const resultStatus = normalized(nestedResult?.status);
  if (executionResult === "SUCCESS" || executionResult === "FINISHED_WITH_RETURN" || resultStatus === "RETURN") {
    return ExecutionResult.FINISHED_WITH_RETURN;
  }
  if (executionResult === "ERROR" || executionResult === "FINISHED_WITH_ERROR" || resultStatus === "ERROR") {
    return ExecutionResult.FINISHED_WITH_ERROR;
  }
  return undefined;
}

export function transactionResultName(value: unknown): string | undefined {
  const item = record(value);
  if (!item) return undefined;
  const direct = item.resultName ?? item.result_name;
  if (typeof direct === "string" && direct) return direct.toUpperCase();
  const raw = item.result;
  if (typeof raw === "number" || (typeof raw === "string" && /^\d+$/.test(raw))) {
    return (transactionResultNumberToName as Record<string, string>)[String(raw)]?.toUpperCase();
  }
  return undefined;
}

export type TransactionClassification = {
  state: "success" | "execution-error" | "consensus-error" | "verification-pending" | "pending";
  statusName?: string;
  executionResultName?: ExecutionResult;
  consensusResultName?: string;
};

export function classifyTransaction(value: unknown): TransactionClassification {
  const statusName = transactionStatusName(value);
  const executionResultName = transactionExecutionResultName(value);
  const consensusResultName = transactionResultName(value);
  const details = consensusResultName ? { consensusResultName } : {};
  if (statusName !== "ACCEPTED" && statusName !== "FINALIZED") {
    return { state: "pending", statusName, executionResultName, ...details };
  }
  if (consensusResultName && consensusResultName !== "MAJORITY_AGREE") {
    return { state: "consensus-error", statusName, executionResultName, ...details };
  }
  if (!executionResultName) return { state: "verification-pending", statusName, ...details };
  if (executionResultName === ExecutionResult.FINISHED_WITH_RETURN) {
    return { state: "success", statusName, executionResultName, ...details };
  }
  return { state: "execution-error", statusName, executionResultName, ...details };
}

// genlayer-js@1.1.8 does not export the newer isSuccessful helper. This is its
// documented predicate: a decided status plus FINISHED_WITH_RETURN.
export function isSuccessful(value: unknown): boolean {
  return classifyTransaction(value).state === "success";
}
