import assert from "node:assert/strict";
import { test } from "node:test";
import "./test-env";
import { GET } from "../../app/api/runtime-config/route";

test("runtime config exposes the canonical server contract", async () => {
  const address = "0x2222222222222222222222222222222222222222";
  const previous = process.env.GENLAYER_CONTRACT_ADDRESS;
  process.env.GENLAYER_CONTRACT_ADDRESS = address;
  try {
    const response = GET(new Request("http://localhost/api/runtime-config", { headers: { "x-real-ip": "198.51.100.99" } }));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      network: "studionet",
      rpcUrl: "https://studio.genlayer.com/api",
      chainId: 61999,
      contractAddress: address,
      protocol: "eventum/1.1.1",
      explorerUrl: "https://explorer-studio.genlayer.com/",
      studioUrl: "https://studio.genlayer.com/contracts",
    });
  } finally {
    if (previous === undefined) delete process.env.GENLAYER_CONTRACT_ADDRESS;
    else process.env.GENLAYER_CONTRACT_ADDRESS = previous;
  }
});
