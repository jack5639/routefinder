export async function register() {
  if (process.env["NEXT_RUNTIME"] !== "nodejs" || process.env["VERCEL_ENV"] !== "production") return;
  const [{ getServerEnv }, { logServerEvent }] = await Promise.all([
    import("@/lib/env"),
    import("@/lib/logging"),
  ]);
  getServerEnv();
  logServerEvent("info", "application.started", { environment: "production" });
}
