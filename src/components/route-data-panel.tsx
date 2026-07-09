import type { RouteOption } from "@/types";

const evidenceLabels: Record<NonNullable<RouteOption["evidenceLevel"]>, string> = {
  demo: "Demo placeholder",
  partial: "Partial evidence",
  "source-backed": "Source-backed",
};

<<<<<<< HEAD
const freshnessLabels: Record<NonNullable<RouteOption["freshnessStatus"]>, string> = {
  fresh: "Fresh",
  stale: "Stale",
  missing: "Needs sync",
  error: "Sync issue",
  demo: "Demo",
};

=======
>>>>>>> 99fa54b10813d37fd4180e1178ad6a253b04bc42
function isHttpUrl(value: string | undefined): value is string {
  return Boolean(value && /^https?:\/\//.test(value));
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/80 px-3 py-2">
      <p className="text-[0.65rem] font-black uppercase tracking-wide text-ink/45">{label}</p>
      <p className="mt-1 text-sm font-semibold leading-5 text-ink/75">{value}</p>
    </div>
  );
}

export function RouteDataPanel({ route, compact = false }: { route: RouteOption; compact?: boolean }) {
  const hasDataRows =
<<<<<<< HEAD
    route.deadline ||
    route.lastChecked ||
    route.lastSyncedAt ||
    route.costOrPaySummary ||
    route.bursaryOrSupportSummary ||
    route.evidenceLevel ||
    route.freshnessStatus ||
    typeof route.opportunityCount === "number";
=======
    route.deadline || route.lastChecked || route.costOrPaySummary || route.bursaryOrSupportSummary || route.evidenceLevel;
>>>>>>> 99fa54b10813d37fd4180e1178ad6a253b04bc42
  const hasApplyLink = isHttpUrl(route.applyUrl) && route.applyUrl !== route.sourceUrl;
  const hasLinks = isHttpUrl(route.sourceUrl) || hasApplyLink;

  if (!hasDataRows && !hasLinks) {
    return null;
  }

  return (
    <section className={compact ? "border-t border-ink/10 pt-4" : "rounded-lg border border-ink/10 bg-sky/60 p-4"}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
<<<<<<< HEAD
          <p className="text-xs font-black uppercase tracking-wide text-leaf">
            {route.evidenceLevel === "source-backed" ? "Source-backed route data" : "Demo route data"}
          </p>
=======
          <p className="text-xs font-black uppercase tracking-wide text-leaf">Demo route data</p>
>>>>>>> 99fa54b10813d37fd4180e1178ad6a253b04bc42
          <h3 className={`${compact ? "text-base" : "text-lg"} mt-1 font-black leading-tight text-ink`}>
            Check details before acting.
          </h3>
        </div>
        <span className="w-fit rounded-full bg-white px-3 py-2 text-xs font-black text-ink/70">
          {route.evidenceLevel ? evidenceLabels[route.evidenceLevel] : "Demo"}
        </span>
      </div>

      <div className={`mt-3 grid gap-2 ${compact ? "" : "sm:grid-cols-2"}`}>
        {route.deadline ? <DataRow label="Deadline" value={route.deadline} /> : null}
<<<<<<< HEAD
        {route.lastSyncedAt ? <DataRow label="Catalogue last synced" value={route.lastSyncedAt} /> : null}
        {!route.lastSyncedAt && route.lastChecked ? <DataRow label="Demo last reviewed" value={route.lastChecked} /> : null}
        {route.freshnessStatus ? <DataRow label="Freshness" value={freshnessLabels[route.freshnessStatus]} /> : null}
        {typeof route.opportunityCount === "number" ? (
          <DataRow label="Source-backed examples" value={`${route.opportunityCount} matched record${route.opportunityCount === 1 ? "" : "s"}`} />
        ) : null}
=======
        {route.lastChecked ? <DataRow label="Demo last reviewed" value={route.lastChecked} /> : null}
>>>>>>> 99fa54b10813d37fd4180e1178ad6a253b04bc42
        {route.costOrPaySummary ? <DataRow label="Cost or pay" value={route.costOrPaySummary} /> : null}
        {route.bursaryOrSupportSummary ? <DataRow label="Support" value={route.bursaryOrSupportSummary} /> : null}
      </div>

      {hasLinks ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          {isHttpUrl(route.sourceUrl) ? (
            <a
              href={route.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-ink/15 bg-white px-4 py-2 text-sm font-black text-ink transition hover:bg-mint"
            >
              Check official info
            </a>
          ) : null}
          {hasApplyLink ? (
            <a
              href={route.applyUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-4 py-2 text-sm font-black text-white transition hover:bg-leaf"
            >
              Check application path
            </a>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
