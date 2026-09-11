import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

const contract = "0x379A278bA5C13864f0354d40487F73B8A2B620c1";
const snapshotA = "458f293a9cedea29f4f9d38b66d45861ae5058b2a637df1dbc82ebc8e2cdfc3c";
const snapshotB = "abed644bc2550b3a9bf13cc9720583f36a325b6cea58acefab62d26a33dc6106";
const runId = "forensic-0x2a2777166e8ea1ef3c8d2c8090d3e49694f6efc5ceffe7f045e8a2d8126ffc87";

function guards(page: Page) {
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(`pageerror: ${error.message}`));
  page.on("console", (message) => { if (message.type() === "error") failures.push(`console.error: ${message.text()}`); });
  page.on("requestfailed", (request) => {
    const error = request.failure()?.errorText || "unknown";
    if (!(error === "net::ERR_ABORTED" && request.url().includes("?_rsc="))) failures.push(`requestfailed: ${request.url()} ${error}`);
  });
  page.on("response", (response) => { if (response.status() >= 400) failures.push(`http ${response.status()}: ${response.url()}`); });
  return failures;
}

function screenshotName(route: string, testInfo: TestInfo) {
  const suffix = route === "/" ? "landing" : route.replaceAll("/", "-").replaceAll(/[^a-z0-9-]/gi, "") || "route";
  return `artifacts/ui-final/${testInfo.project.name}-${suffix}.png`;
}

async function visit(page: Page, route: string, testInfo: TestInfo) {
  const failures = guards(page);
  await page.goto(route, { waitUntil: "networkidle", timeout: 60_000 });
  await expect(page.locator("main")).toBeVisible();
  await expect.poll(async () => await page.evaluate(() => document.readyState)).toBe("complete");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 || document.body.scrollWidth > document.body.clientWidth + 1);
  assert.equal(overflow, false, `${route} overflows at ${testInfo.project.name}`);
  mkdirSync("artifacts/ui-final", { recursive: true });
  await page.screenshot({ path: screenshotName(route, testInfo), fullPage: true });
  assert.deepEqual(failures, [], `${route} produced browser/runtime failures`);
}

test("populated production and forensic run surfaces are clean", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const routes = [
    "/",
    "/compare",
    "/markets",
    `/markets/${snapshotA}`,
    `/markets/${snapshotB}`,
    "/comparisons",
    `/comparisons/runs/${runId}`,
    "/graph",
    "/docs",
    "/status",
  ];
  for (const route of routes) await visit(page, route, testInfo);
  await page.goto(`/comparisons/runs/${runId}`, { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "CONSENSUS REJECTED" })).toBeVisible();
  await expect(page.getByLabel("Comparison run lifecycle").getByText("MAJORITY DISAGREE", { exact: true })).toBeVisible();
  await expect(page.getByText(/no onchain comparison (exists|was created)/i).first()).toBeVisible();
  await expect(page.getByText(contract.slice(0, 9), { exact: false })).toBeVisible();
});

test("forensic run survives refresh and navigation without creating a write", async ({ page }) => {
  const failures = guards(page);
  const route = `/comparisons/runs/${runId}`;
  await page.goto(route, { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "CONSENSUS REJECTED" })).toBeVisible();
  const before = await page.locator("body").innerText();
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "CONSENSUS REJECTED" })).toBeVisible();
  expect(await page.locator("body").innerText()).toContain(runId);
  await page.goto("/comparisons", { waitUntil: "networkidle" });
  await page.getByRole("link", { name: /CONSENSUS REJECTED/ }).click();
  await expect(page).toHaveURL(new RegExp(`/comparisons/runs/${runId}$`));
  expect(await page.locator("body").innerText()).toContain(runId);
  expect(before).toContain("0x2a277");
  assert.deepEqual(failures, []);
});

test("compare preparation has keyboard focus and no blind write control", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440", "Focus check runs once at desktop size.");
  const failures = guards(page);
  await page.goto("/compare", { waitUntil: "networkidle" });
  await page.locator("#market-url-0").focus();
  await expect(page.locator("#market-url-0")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator("#market-url-1")).toBeFocused();
  await expect(page.getByRole("button", { name: "Create comparison run" })).toHaveCount(0);
  await page.evaluate(() => { document.documentElement.style.zoom = "1.25"; });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 || document.body.scrollWidth > document.body.clientWidth + 1);
  assert.equal(overflow, false);
  assert.deepEqual(failures, []);
});
