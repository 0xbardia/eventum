import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const eventSlug = "what-price-will-bitcoin-hit-in-september-2026";
const marketA = "will-bitcoin-dip-to-80k-in-september-2026";
const marketB = "will-bitcoin-dip-to-77pt5k-in-september-2026-from-september-3";
const urlA = "https://polymarket.com/event/" + eventSlug + "/" + marketA;
const urlB = "https://polymarket.com/event/" + eventSlug + "/" + marketB;

function installRuntimeGuards(page: Page) {
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push("pageerror: " + error.message));
  page.on("console", (message) => {
    if (message.type() === "error") failures.push("console.error: " + message.text());
  });
  page.on("requestfailed", (request) => {
    const errorText = request.failure()?.errorText || "unknown";
    const expectedNextPrefetchAbort = errorText === "net::ERR_ABORTED" && request.url().includes("?_rsc=");
    if (!expectedNextPrefetchAbort) failures.push("requestfailed: " + request.method() + " " + request.url() + " " + errorText);
  });
  page.on("response", (response) => {
    if (response.status() >= 400) failures.push("http " + response.status() + ": " + response.url());
  });
  return failures;
}

test("production resolves both nested URLs to their exact child markets", async ({ page }, testInfo) => {
  const failures = installRuntimeGuards(page);
  await page.goto("/compare", { waitUntil: "networkidle" });
  await expect(page.getByRole("button", { name: "Connect wallet" })).toBeVisible();

  const prepareResponse = page.waitForResponse((response) => response.url().endsWith("/api/comparisons/prepare") && response.request().method() === "POST");
  await page.locator("#market-url-0").fill(urlA);
  await page.locator("#market-url-1").fill(urlB);
  await page.getByRole("button", { name: /Prepare comparison/ }).click();
  const response = await prepareResponse;
  expect(response.ok()).toBe(true);
  const body = await response.json() as { snapshots: Array<{ platformMarketId: string; sourceUrl: string; title: string }> };
  expect(body.snapshots).toHaveLength(2);
  expect(body.snapshots[0].platformMarketId).not.toBe(body.snapshots[1].platformMarketId);
  expect(body.snapshots[0].sourceUrl).toBe(urlA);
  expect(body.snapshots[1].sourceUrl).toBe(urlB);
  expect(body.snapshots[0].title).toContain("80,000");
  expect(body.snapshots[1].title).toContain("77,500");

  await expect(page.getByRole("heading", { name: "Evidence preview" })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".market-preview")).toHaveCount(2);
  const previews = await page.locator(".market-preview").allTextContents();
  expect(previews[0]).toContain("80,000");
  expect(previews[1]).toContain("77,500");
  expect(previews[0]).not.toBe(previews[1]);
  await expect(page.getByText("Read-only preview does not require one.")).toBeVisible();
  await expect(page.locator(".error-text")).toHaveCount(0);

  const canonicalResponse = await page.request.post("/api/comparisons/prepare", {
    data: {
      urls: [urlA + "?utm_source=test#details", urlB + "/"],
      comparisonVersion: "1.0.0",
    },
  });
  expect(canonicalResponse.ok()).toBe(true);
  const canonicalBody = await canonicalResponse.json() as { snapshots: Array<{ platformMarketId: string; sourceUrl: string }> };
  expect(canonicalBody.snapshots.map((snapshot) => snapshot.sourceUrl)).toEqual([urlA, urlB]);
  expect(canonicalBody.snapshots[0].platformMarketId).not.toBe(canonicalBody.snapshots[1].platformMarketId);

  mkdirSync("artifacts/qa", { recursive: true });
  await page.screenshot({ path: "artifacts/qa/" + testInfo.project.name + "-polymarket-nested.png", fullPage: true });
  assert.deepEqual(failures, []);
});
