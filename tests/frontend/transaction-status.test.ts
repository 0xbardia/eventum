import assert from "node:assert/strict";
import { test } from "node:test";
import { ExecutionResult } from "genlayer-js/types";
import { classifyTransaction, isSuccessful, transactionExecutionResultName } from "../../src/lib/transaction-status";

test("Studio finalized return receipts classify as successful", () => {
  const transaction = {
    status: 7,
    consensus_data: {
      leader_receipt: [{ execution_result: "SUCCESS", result: { status: "return" } }],
    },
  };
  assert.equal(transactionExecutionResultName(transaction), ExecutionResult.FINISHED_WITH_RETURN);
  assert.deepEqual(classifyTransaction(transaction), {
    state: "success",
    statusName: "FINALIZED",
    executionResultName: ExecutionResult.FINISHED_WITH_RETURN,
  });
  assert.equal(isSuccessful(transaction), true);
});

test("accepted and finalized SDK return results are successful", () => {
  assert.equal(isSuccessful({ statusName: "ACCEPTED", txExecutionResultName: ExecutionResult.FINISHED_WITH_RETURN }), true);
  assert.equal(isSuccessful({ statusName: "FINALIZED", txExecutionResultName: ExecutionResult.FINISHED_WITH_RETURN }), true);
});

test("finalized execution errors are failures", () => {
  const result = classifyTransaction({ statusName: "FINALIZED", consensus_data: { leader_receipt: [{ execution_result: "ERROR", result: { status: "error" } }] } });
  assert.equal(result.state, "execution-error");
  assert.equal(result.executionResultName, ExecutionResult.FINISHED_WITH_ERROR);
  assert.equal(isSuccessful({ statusName: "FINALIZED", txExecutionResultName: ExecutionResult.FINISHED_WITH_ERROR }), false);
});

test("finalized transactions without execution data remain verification-pending", () => {
  const result = classifyTransaction({ statusName: "FINALIZED", resultName: "MAJORITY_AGREE" });
  assert.equal(result.state, "verification-pending");
  assert.equal(isSuccessful({ statusName: "FINALIZED", resultName: "MAJORITY_AGREE" }), false);
});

test("finalized consensus disagreement is not a successful state-changing write", () => {
  const result = classifyTransaction({
    status: 7,
    result: 7,
    consensus_data: { leader_receipt: [{ execution_result: "SUCCESS", result: { status: "return" } }] },
  });
  assert.deepEqual(result, {
    state: "consensus-error",
    statusName: "FINALIZED",
    executionResultName: ExecutionResult.FINISHED_WITH_RETURN,
    consensusResultName: "MAJORITY_DISAGREE",
  });
  assert.equal(isSuccessful({ status: 7, result: 7, txExecutionResultName: ExecutionResult.FINISHED_WITH_RETURN }), false);
});
