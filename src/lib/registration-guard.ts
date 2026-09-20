export const REGISTRATION_COOLDOWN_MS = 30_000;

export type SnapshotLookup = "missing" | "unavailable" | { sourceHash: string };

export function registrationAction(lookup: SnapshotLookup, expectedSourceHash: string): "skip" | "write" | "wait" {
  if (lookup === "unavailable") return "wait";
  if (lookup !== "missing" && lookup.sourceHash.toLowerCase() === expectedSourceHash.toLowerCase()) return "skip";
  return "write";
}

export function isMissingSnapshotError(error: unknown): boolean {
  const message = error instanceof Error
    ? error.message
    : (() => {
        try { return JSON.stringify(error); } catch { return String(error); }
      })();
  return /\b(?:MARKET_NOT_FOUND|SNAPSHOT_NOT_FOUND)\b/.test(message);
}
