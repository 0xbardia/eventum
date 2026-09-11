import { test, expect, type Page } from "@playwright/test";

const snapshots = [
  {
    snapshotId: "a".repeat(64), marketKey: "a".repeat(64), version: 0,
    platform: "polymarket", platformMarketId: "simulated-a", sourceUrl: "https://polymarket.com/market/simulated-a",
    title: "Simulated market A", description: "Controlled browser fixture only.", outcomes: ["Yes", "No"],
    resolutionRules: "Resolve from the published source.", resolutionSource: "https://example.com/source",
    openTime: "2026-01-01T00:00:00Z", closeTime: "2026-12-31T00:00:00Z", resolutionDeadline: "", clarifications: "",
    retrievedAt: "2026-09-09T00:00:00Z", sourceHash: "c".repeat(64), normalizedFacts: {}, canonicalEventHint: "",
    providerLabel: "Polymarket Gamma API", authority: "offchain-preview",
  },
  {
    snapshotId: "b".repeat(64), marketKey: "b".repeat(64), version: 0,
    platform: "polymarket", platformMarketId: "simulated-b", sourceUrl: "https://polymarket.com/market/simulated-b",
    title: "Simulated market B", description: "Controlled browser fixture only.", outcomes: ["Yes", "No"],
    resolutionRules: "Resolve from the published source.", resolutionSource: "https://example.com/source",
    openTime: "2026-01-01T00:00:00Z", closeTime: "2026-12-31T00:00:00Z", resolutionDeadline: "", clarifications: "",
    retrievedAt: "2026-09-09T00:00:00Z", sourceHash: "d".repeat(64), normalizedFacts: {}, canonicalEventHint: "",
    providerLabel: "Polymarket Gamma API", authority: "offchain-preview",
  },
];

const currentChainId = "0xf22f";
const defaultAccount = "0x1234567890abcdef1234567890abcdef12345678";

async function installSimulatedWallet(page: Page, options: {
  account?: string;
  chainId?: string;
  rejectConnection?: boolean;
  startConnected?: boolean;
  switchRejected?: boolean;
  requestDelayMs?: number;
  sendDelayMs?: number;
} = {}) {
  await page.addInitScript(({ account, initialChainId, rejectConnection, startConnected, switchRejected, requestDelayMs, sendDelayMs }) => {
    let activeAccount = startConnected ? account : "";
    let chainId = initialChainId;
    const requests: string[] = [];
    const transactions: unknown[] = [];
    const listeners = new Map<string, Array<(value: unknown) => void>>();
    const emit = (event: string, value: unknown) => {
      if (event === "accountsChanged") activeAccount = Array.isArray(value) ? String(value[0] || "") : "";
      for (const listener of listeners.get(event) || []) listener(value);
    };
    const ethereum = {
      request: async ({ method, params }: { method: string; params?: unknown[] }) => {
        requests.push(method);
        if (method === "eth_accounts") return activeAccount ? [activeAccount] : [];
        if (method === "eth_requestAccounts") {
          if (requestDelayMs) await new Promise((resolve) => setTimeout(resolve, requestDelayMs));
          if (rejectConnection) throw new Error("User rejected the wallet request.");
          activeAccount = account;
          return [account];
        }
        if (method === "eth_chainId") return chainId;
        if (method === "wallet_addEthereumChain") {
          if (switchRejected) throw new Error("User rejected the network switch.");
          return null;
        }
        if (method === "wallet_switchEthereumChain") {
          if (switchRejected) throw new Error("User rejected the network switch.");
          chainId = String((params?.[0] as { chainId: string }).chainId);
          emit("chainChanged", chainId);
          return null;
        }
        if (method === "wallet_getSnaps") return {};
        if (method === "wallet_requestSnaps") return null;
        if (method === "eth_sendTransaction") {
          transactions.push(params?.[0]);
          if (sendDelayMs) await new Promise((resolve) => setTimeout(resolve, sendDelayMs));
          throw new Error("Controlled browser fixture blocks writes.");
        }
        return [];
      },
      on: (event: string, listener: (value: unknown) => void) => {
        listeners.set(event, [...(listeners.get(event) || []), listener]);
      },
      removeListener: (event: string, listener: (value: unknown) => void) => {
        listeners.set(event, (listeners.get(event) || []).filter((item) => item !== listener));
      },
      emit,
    };
    Object.defineProperty(window, "ethereum", { configurable: true, value: ethereum });
    Object.defineProperty(window, "__eventumWalletRequests", { configurable: true, value: requests });
    Object.defineProperty(window, "__eventumWalletTransactions", { configurable: true, value: transactions });
  }, {
    account: options.account || defaultAccount,
    initialChainId: options.chainId || currentChainId,
    rejectConnection: options.rejectConnection || false,
    startConnected: options.startConnected || false,
    switchRejected: options.switchRejected || false,
    requestDelayMs: options.requestDelayMs || 0,
    sendDelayMs: options.sendDelayMs || 0,
  });
}

async function prepareControlledComparison(page: Page) {
  await page.route("**/api/comparisons/prepare", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ comparisonVersion: "1.0.0", source: "controlled-browser-fixture", authority: "offchain-preview", snapshots, registerArgs: [[], []] }),
  }));
  await page.goto("/compare", { waitUntil: "networkidle" });
  await page.locator("#market-url-0").fill("https://polymarket.com/market/simulated-a");
  await page.locator("#market-url-1").fill("https://polymarket.com/market/simulated-b");
  await page.getByRole("button", { name: /Prepare comparison/ }).click();
  await expect(page.getByRole("heading", { name: "Evidence preview" })).toBeVisible();
}

test("simulated wallet on the wrong chain is blocked visibly", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "ethereum", { configurable: true, value: {
      request: async ({ method }: { method: string }) => method === "eth_requestAccounts" ? ["0x1111111111111111111111111111111111111111"] : method === "eth_chainId" ? "0x1" : [],
    } });
  });
  await prepareControlledComparison(page);
  await page.getByRole("button", { name: "Connect & submit" }).click();
  await expect(page.locator(".error-text")).toContainText(/Wrong network/);
  await expect(page.getByText("Wrong · 1")).toBeVisible();
  await expect(page.getByRole("button", { name: "Wrong network" })).toBeDisabled();
});

test("simulated wallet rejection is shown as an actionable failure", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "ethereum", { configurable: true, value: {
      request: async ({ method }: { method: string }) => {
        if (method === "eth_requestAccounts") throw new Error("User rejected the wallet request.");
        return [];
      },
    } });
  });
  await prepareControlledComparison(page);
  await page.getByRole("button", { name: "Connect & submit" }).click();
  await expect(page.locator(".error-text")).toContainText(/User rejected/);
  await expect(page.getByText("Failed / action needed")).toBeVisible();
});

test("no provider reports a useful installation state", async ({ page }) => {
  await page.goto("/compare", { waitUntil: "networkidle" });
  await expect(page.getByText("Not detected")).toBeVisible();
  await page.getByRole("button", { name: "Connect wallet" }).click();
  await expect(page.locator(".error-text")).toContainText(/browser wallet|install|unlock/i);
  await expect(page.getByText("Not detected")).toBeVisible();
});

test("disconnected wallet has an explicit connect action and local disconnect", async ({ page }) => {
  await installSimulatedWallet(page, { requestDelayMs: 1000 });
  await page.goto("/compare", { waitUntil: "networkidle" });
  await expect(page.getByText("Disconnected")).toBeVisible();
  await expect(page.getByRole("button", { name: "Connect wallet" })).toBeVisible();
  const requestsBeforeConnect = await page.evaluate(() => (window as Window & { __eventumWalletRequests?: string[] }).__eventumWalletRequests || []);
  expect(requestsBeforeConnect).not.toContain("eth_requestAccounts");
  await page.getByRole("button", { name: "Connect wallet" }).click();
  await expect(page.getByRole("button", { name: "Connecting…" })).toBeVisible();
  await expect(page.locator(".data-list dd").nth(0)).toContainText("0x12345");
  await expect(page.getByText("Studionet · 61999")).toBeVisible();
  await expect(page.getByText("Ready")).toBeVisible();
  await expect(page.getByRole("button", { name: "Disconnect" })).toBeVisible();
  await page.getByRole("button", { name: "Disconnect" }).click();
  await expect(page.getByText("Disconnected")).toBeVisible();
  await expect(page.getByRole("button", { name: "Connect wallet" })).toBeVisible();
  await expect(page.getByText(/Connection cleared for Eventum/)).toBeVisible();
});

test("account changes and provider disconnects update the transaction states", async ({ page }) => {
  await installSimulatedWallet(page, { startConnected: true });
  await page.goto("/compare", { waitUntil: "networkidle" });
  await expect(page.locator(".data-list dd").nth(0)).toContainText("0x12345");
  await page.evaluate(() => {
    const wallet = (window as Window & { ethereum?: { emit?: (event: string, value: unknown) => void } }).ethereum;
    wallet?.emit?.("accountsChanged", ["0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"]);
  });
  await expect(page.locator(".data-list dd").nth(0)).toContainText("0xabcde");
  await page.evaluate(() => {
    const wallet = (window as Window & { ethereum?: { emit?: (event: string, value: unknown) => void } }).ethereum;
    wallet?.emit?.("disconnect", { code: 4900, message: "Wallet disconnected" });
  });
  await expect(page.getByText("Disconnected")).toBeVisible();
  await expect(page.getByText("Not checked")).toBeVisible();
});

test("correct-chain wallet enables the write path after preview without changing runtime target", async ({ page }) => {
  await installSimulatedWallet(page);
  await prepareControlledComparison(page);
  await page.getByRole("button", { name: "Connect wallet" }).click();
  await expect(page.getByRole("button", { name: "Submit to GenLayer" })).toBeEnabled();
  const runtimeConfig = await page.evaluate(async () => {
    const response = await fetch("/api/runtime-config");
    return await response.json() as { contractAddress: string };
  });
  let readTarget = "";
  await page.route("https://studio.genlayer.com/api", async (route) => {
    const body = route.request().postDataJSON() as { id?: number; method?: string; params?: Array<{ to?: string }> };
    if (body.method === "gen_call") {
      readTarget = body.params?.[0]?.to || "";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ jsonrpc: "2.0", id: body.id || 1, error: { code: -32000, message: "Controlled target verification" } }),
      });
      return;
    }
    const result = body.method === "eth_getTransactionCount" ? "0x0" : body.method === "eth_estimateGas" ? "0x5208" : body.method === "eth_gasPrice" ? "0x1" : null;
    if (result) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ jsonrpc: "2.0", id: body.id || 1, result }) });
      return;
    }
    await route.continue();
  });
  await page.getByRole("button", { name: "Submit to GenLayer" }).click();
  await expect.poll(() => readTarget).toBe(runtimeConfig.contractAddress);
  await expect.poll(async () => await page.evaluate(() => (window as Window & { __eventumWalletTransactions?: Array<{ data?: string }> }).__eventumWalletTransactions?.[0]?.data || "")).toContain(runtimeConfig.contractAddress.slice(2).toLowerCase());
  const walletTransactionData = await page.evaluate(() => (window as Window & { __eventumWalletTransactions?: Array<{ data?: string }> }).__eventumWalletTransactions?.[0]?.data || "");
  const displayedContract = await page.locator("aside .panel").first().locator(".data-list dd").nth(2).textContent();
  expect(readTarget).toBe(runtimeConfig.contractAddress);
  expect(walletTransactionData.toLowerCase()).toContain(runtimeConfig.contractAddress.slice(2).toLowerCase());
  expect(displayedContract).toContain(runtimeConfig.contractAddress.slice(0, 7));
  expect(displayedContract).toContain(runtimeConfig.contractAddress.slice(-7));
});

test("finalized transaction without execution data is reconciled without resubmission", async ({ page }) => {
  const hash = `0x${"9".repeat(64)}`;
  await installSimulatedWallet(page, { startConnected: true });
  await page.addInitScript(({ transactionHash, snapshotId }) => {
    window.localStorage.setItem("eventum.transaction-records.v1", JSON.stringify([{
      operation: "Register snapshot 1",
      hash: transactionHash,
      lifecycle: "submitted",
      snapshotId,
      snapshotIndex: 0,
    }]));
  }, { transactionHash: hash, snapshotId: "a".repeat(64) });
  await page.route("https://studio.genlayer.com/api", async (route) => {
    const body = route.request().postDataJSON() as { id?: number; method?: string };
    if (body.method === "gen_call") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ jsonrpc: "2.0", id: body.id || 1, error: { code: -32000, message: "Controlled read failure" } }) });
      return;
    }
    if (body.method === "eth_getTransactionByHash") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ jsonrpc: "2.0", id: body.id || 1, result: { hash, status: "FINALIZED" } }) });
      return;
    }
    await route.continue();
  });
  await prepareControlledComparison(page);
  await page.getByRole("button", { name: "Submit to GenLayer" }).click();
  await expect(page.locator(".error-text")).toContainText(/will not be resubmitted automatically/, { timeout: 10_000 });
  await expect(page.getByRole("button", { name: "Retry verification" })).toBeVisible();
  const transactions = await page.evaluate(() => (window as Window & { __eventumWalletTransactions?: unknown[] }).__eventumWalletTransactions || []);
  expect(transactions).toHaveLength(0);
});

test("duplicate submit clicks do not duplicate wallet writes", async ({ page }) => {
  await installSimulatedWallet(page, { startConnected: true, sendDelayMs: 700 });
  await page.route("https://studio.genlayer.com/api", async (route) => {
    const body = route.request().postDataJSON() as { id?: number; method?: string };
    if (body.method === "gen_call") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ jsonrpc: "2.0", id: body.id || 1, error: { code: -32000, message: "Controlled read failure" } }) });
      return;
    }
    const result = body.method === "eth_getTransactionCount" ? "0x0" : body.method === "eth_estimateGas" ? "0x5208" : body.method === "eth_gasPrice" ? "0x1" : null;
    if (result) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ jsonrpc: "2.0", id: body.id || 1, result }) });
      return;
    }
    await route.continue();
  });
  await prepareControlledComparison(page);
  const submit = page.getByRole("button", { name: "Submit to GenLayer" });
  await Promise.allSettled([submit.click(), submit.click()]);
  await expect.poll(async () => await page.evaluate(() => (window as Window & { __eventumWalletTransactions?: unknown[] }).__eventumWalletTransactions?.length || 0)).toBe(1);
});

test("rejected network switch is recoverable", async ({ page }) => {
  await installSimulatedWallet(page, { chainId: "0x1", switchRejected: true });
  await page.goto("/compare", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Connect wallet" }).click();
  await expect(page.getByText("Wrong · 1")).toBeVisible();
  await page.getByRole("button", { name: "Switch network" }).click();
  await expect(page.locator(".error-text")).toContainText(/rejected|switch/i);
});
