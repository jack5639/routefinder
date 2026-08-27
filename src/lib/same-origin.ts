/**
 * Browser state-changing requests must come from the configured application
 * origin. Requests without an Origin header are retained for server-to-server
 * callers and local route tests; Sec-Fetch-Site still rejects modern
 * cross-site browser requests when Origin is omitted.
 */
export function isSameOriginRequest(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;

  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    const requestOrigin = new URL(request.url).origin;
    if (process.env.NODE_ENV !== "production" && new URL(origin).origin === requestOrigin) return true;
    const configuredOrigin = new URL(process.env.NEXT_PUBLIC_APP_URL ?? request.url).origin;
    return new URL(origin).origin === configuredOrigin;
  } catch {
    return false;
  }
}
