const sensitiveKeys = /email|token|secret|grade|evidence|note|location|authorization|cookie/i;

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, sensitiveKeys.test(key) ? "[redacted]" : redact(nested)]),
    );
  }
  return value;
}

export function logServerEvent(level: "info" | "warn" | "error", event: string, details: Record<string, unknown> = {}) {
  const record = JSON.stringify({ level, event, time: new Date().toISOString(), ...(redact(details) as Record<string, unknown>) });
  if (level === "error") console.error(record);
  else if (level === "warn") console.warn(record);
  else console.info(record);
}
