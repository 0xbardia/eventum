import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { test, expect, type Page, type TestInfo } from "@playwright/test";

const routes = ["/", "/compare", "/comparisons/demo", "/markets", "/markets/demo", "/graph", "/docs", "/status"];
const finalizedComparison = "57b3949e099f3cb1094631f79978d39ed2de1b83c7aa1a09ea00bae84431898c";

function filePart(value: string) {
  return value === "/" ? "home" : value.replaceAll("/", "-").replaceAll(/[^a-z0-9-]/gi, "") || "route";
}

function installRuntimeGuards(page: Page, options: { expectedResponse?: RegExp; expectedConsole?: RegExp } = {}) {
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error" && !options.expectedConsole?.test(message.text())) failures.push(`console.error: ${message.text()}`);
  });
  page.on("requestfailed", (request) => {
    const errorText = request.failure()?.errorText || "unknown";
    const expectedNextPrefetchAbort = errorText === "net::ERR_ABORTED" && request.url().includes("?_rsc=");
    if (!expectedNextPrefetchAbort) failures.push(`requestfailed: ${request.method()} ${request.url()} ${errorText}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400 && !options.expectedResponse?.test(response.url())) failures.push(`http ${response.status()}: ${response.url()}`);
  });
  return failures;
}

async function visit(page: Page, route: string, testInfo: TestInfo) {
  const failures = installRuntimeGuards(page);
  await page.goto(route, { waitUntil: "networkidle" });
  await expect(page.locator("main")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 || document.body.scrollWidth > document.body.clientWidth + 1);
  assert.equal(overflow, false, `${route} has horizontal overflow at ${testInfo.project.name}`);
  mkdirSync("artifacts/qa", { recursive: true });
  await page.screenshot({ path: `artifacts/qa/${testInfo.project.name}-${filePart(route)}.png`, fullPage: true });
  assert.deepEqual(failures, [], `${route} produced browser/runtime failures`);
}

test("all primary routes render cleanly in a production build", async ({ page }, testInfo) => {
  for (const route of routes) await visit(page, route, testInfo);
});

test("landing CTA and compare empty state are usable", async ({ page }) => {
  const failures = installRuntimeGuards(page);
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByRole("link", { name: "Compare two markets" }).click();
  await expect(page).toHaveURL(/\/compare$/);
  await expect(page.getByRole("heading", { name: "Compare published rules" })).toBeVisible();
  assert.deepEqual(failures, []);
});

test("unsupported compare input fails visibly without a runtime error", async ({ page }) => {
  const failures = installRuntimeGuards(page, {
    expectedResponse: /\/api\/comparisons\/prepare$/,
    expectedConsole: /Failed to load resource: the server responded with a status of 422|Failed to load resource: the server responded with a status of a 422/,
  });
  await page.goto("/compare", { waitUntil: "networkidle" });
  const inputs = page.locator("input[type=url]");
  await inputs.nth(0).fill("https://example.com/not-a-market");
  await inputs.nth(1).fill("https://example.org/another-market");
  await page.getByRole("button", { name: /Prepare comparison/ }).click();
  await expect(page.locator(".error-text")).toContainText(/Only HTTPS public Polymarket|complete market URL|canonical/);
  assert.deepEqual(failures, []);
});

test("query-bearing Polymarket input canonicalizes safely", async ({ page }) => {
  test.skip(process.env.REAL_PROVIDER !== "1", "Run with REAL_PROVIDER=1 for public provider integration.");
  const failures = installRuntimeGuards(page);
  await page.goto("/compare", { waitUntil: "networkidle" });
  await page.locator("#market-url-0").fill("https://polymarket.com/event/what-price-will-bitcoin-hit-in-september-2026/will-bitcoin-dip-to-80k-in-september-2026?utm_source=test#details");
  await page.locator("#market-url-1").fill("https://polymarket.com/event/what-price-will-bitcoin-hit-in-september-2026/will-bitcoin-dip-to-77pt5k-in-september-2026-from-september-3/");
  await page.getByRole("button", { name: /Prepare comparison/ }).click();
  await expect(page.getByRole("heading", { name: "Evidence preview" })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".error-text")).toHaveCount(0);
  assert.deepEqual(failures, []);
});

test("mobile navigation opens, exposes links, and closes after navigation", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.startsWith("desktop"), "Mobile navigation is covered by mobile projects.");
  const failures = installRuntimeGuards(page);
  await page.goto("/", { waitUntil: "networkidle" });
  const menu = page.getByRole("button", { name: "Open menu" });
  await expect(menu).toBeVisible();
  await menu.click();
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
  await page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: "Docs" }).click();
  await expect(page).toHaveURL(/\/docs$/);
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toHaveCount(0);
  assert.deepEqual(failures, []);
});

test("real provider previews and wallet-unavailable state are explicit", async ({ page }) => {
  test.skip(process.env.REAL_PROVIDER !== "1", "Run with REAL_PROVIDER=1 for public provider integration.");
  const failures = installRuntimeGuards(page);
  await page.goto("/compare", { waitUntil: "networkidle" });
  await expect(page.getByText("Not detected")).toBeVisible();
  await page.locator("#market-url-0").fill(process.env.EVENTUM_REAL_MARKET_A || "https://polymarket.com/market/xi-jinping-out-before-2027");
  await page.locator("#market-url-1").fill(process.env.EVENTUM_REAL_MARKET_B || "https://polymarket.com/market/will-gavin-newsom-win-the-2028-democratic-presidential-nomination-568");
  await page.getByRole("button", { name: /Prepare comparison/ }).click();
  await expect(page.getByRole("heading", { name: "Evidence preview" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Polymarket Gamma API").first()).toBeVisible();
  await expect(page.getByText(/Read-only preview does not require one/)).toBeVisible();
  assert.deepEqual(failures, []);
});

test("finalized comparison permalink renders contract state", async ({ page }) => {
  test.skip(process.env.REAL_CONTRACT_ROUTE !== "1", "Run with REAL_CONTRACT_ROUTE=1 for deployed-contract route verification.");
  const failures = installRuntimeGuards(page);
  await page.goto(`/comparisons/${finalizedComparison}`, { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "EQUIVALENT" }).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("SETTLEMENT RELATIONSHIP")).toBeVisible();
  await expect(page.getByText("direct edge", { exact: false }).first()).toBeVisible();
  assert.deepEqual(failures, []);
});

test("keyboard focus and 125 percent zoom remain usable", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440", "Run once at desktop size; responsive sweep covers the other viewports.");
  const failures = installRuntimeGuards(page);
  await page.goto("/compare", { waitUntil: "networkidle" });
  await page.locator("#market-url-0").focus();
  await expect(page.locator("#market-url-0")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator("#market-url-1")).toBeFocused();
  await page.evaluate(() => { document.documentElement.style.zoom = "1.25"; });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 || document.body.scrollWidth > document.body.clientWidth + 1);
  assert.equal(overflow, false, "compare route has horizontal overflow at 125% zoom");
  assert.deepEqual(failures, []);
});
