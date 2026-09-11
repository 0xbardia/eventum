type LogFields = Record<string, string | number | boolean | undefined>;

export function log(level: "info" | "warn" | "error", message: string, fields: LogFields = {}) {
  const record = { timestamp: new Date().toISOString(), level, message, ...fields };
  console[level](JSON.stringify(record));
}

