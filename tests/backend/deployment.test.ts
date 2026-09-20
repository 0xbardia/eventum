import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("Studionet deployment evidence matches the frozen contract and schema", () => {
  const deployment = JSON.parse(readFileSync("deployments/studionet.json", "utf8")) as {
    contractAddress: string;
    protocol: string;
    protocolVersion: string;
    contractSourceSha256: string;
    deploymentTx: string;
    publicReadMethods: string[];
    publicWriteMethods: string[];
    readVerification: { count: number };
    writeVerification: { count: number; operations: { count: number }[]; status?: string };
  };
  const source = readFileSync("contracts/eventum.py");
  const sourceSha = createHash("sha256").update(source).digest("hex");
  const configuredAddress = readFileSync(".env.example", "utf8").match(/^GENLAYER_CONTRACT_ADDRESS=(.+)$/m)?.[1];
  const methods = [...source.toString().matchAll(/@gl\.public\.(view|write)\s*\n\s+def\s+(\w+)/g)];
  const reads = methods.filter((match) => match[1] === "view").map((match) => match[2]);
  const writes = methods.filter((match) => match[1] === "write").map((match) => match[2]);

  assert.equal(deployment.contractAddress, configuredAddress);
  assert.equal(deployment.protocol, "eventum/1.1.1");
  assert.equal(deployment.protocolVersion, "eventum/1.1.1");
  assert.equal(deployment.contractSourceSha256, sourceSha);
  assert.match(deployment.deploymentTx, /^0x[a-f0-9]{64}$/);
  assert.deepEqual(deployment.publicReadMethods, reads);
  assert.deepEqual(deployment.publicWriteMethods, writes);
  assert.equal(deployment.readVerification.count, reads.length);
  assert.equal(deployment.writeVerification.count, deployment.writeVerification.operations.reduce((sum, operation) => sum + operation.count, 0));
  assert.ok(deployment.writeVerification.count > 0);
  assert.notEqual(deployment.writeVerification.status, "PENDING_EXTERNAL_WALLET");
});
