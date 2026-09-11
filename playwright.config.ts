import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { defineConfig, devices } from "@playwright/test";

const envFile = resolve(process.cwd(), ".env");
if (!process.env.BASE_URL && existsSync(envFile)) loadEnvFile(envFile);
const localBaseURL = process.env.APP_HOST && process.env.APP_PORT
  ? `http://${process.env.APP_HOST}:${process.env.APP_PORT}`
  : undefined;
const baseURL = process.env.BASE_URL || localBaseURL;
if (!baseURL) throw new Error("Missing APP_HOST/APP_PORT for local Playwright base URL.");

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  reporter: [["list"], ["html", { outputFolder: "artifacts/qa/playwright-report", open: "never" }]],
  outputDir: "artifacts/qa/test-results",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  ...(process.env.BASE_URL ? {} : {
    webServer: {
      command: "pnpm start",
      url: `${baseURL}/api/health`,
      reuseExistingServer: true,
      timeout: 120_000,
    },
  }),
  projects: [
    { name: "desktop-1440", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 } },
    { name: "desktop-1280", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 } },
    { name: "mobile-390", use: { ...devices["Pixel 5"], viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 } },
    { name: "mobile-360", use: { ...devices["Pixel 5"], viewport: { width: 360, height: 800 }, deviceScaleFactor: 1 } },
  ],
});
