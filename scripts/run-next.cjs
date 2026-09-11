/* eslint-disable @typescript-eslint/no-require-imports */
const { spawn } = require("node:child_process");
const { existsSync } = require("node:fs");
const { resolve } = require("node:path");
const { loadEnvFile } = require("node:process");

const command = process.argv[2];
if (command !== "dev" && command !== "start") {
  throw new Error("Usage: node scripts/run-next.cjs <dev|start>");
}

const envFile = resolve(process.cwd(), ".env");
if (existsSync(envFile)) loadEnvFile(envFile);

const host = process.env.APP_HOST;
const port = process.env.APP_PORT;
if (!host) throw new Error("Missing required environment variable: APP_HOST");
if (!port) throw new Error("Missing required environment variable: APP_PORT");

const child = spawn(process.execPath, [
  require.resolve("next/dist/bin/next"),
  command,
  "--hostname",
  host,
  "--port",
  port,
], { env: process.env, stdio: "inherit" });

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("exit", (code, receivedSignal) => {
  process.exitCode = receivedSignal ? 1 : (code ?? 1);
});
