import type { CatalogSourceStatus } from "@/types";

const statusLabels: Record<CatalogSourceStatus["freshnessStatus"], string> = {
  fresh: "Fresh",
  stale: "Stale",
  missing: "Needs sync",
  error: "Sync issue",
  demo: "Demo fallback",
};

const statusStyles: Record<CatalogSourceStatus["freshnessStatus"], string> = {
  fresh: "bg-mint text-ink",
  stale: "bg-oat text-ink",
  missing: "bg-white text-ink",
  error: "bg-[#ffe0d8] text-ink",
  demo: "bg-white text-ink",
};

function formatSyncDate(value: string | undefined) {
  if (!value) {
    return "not synced yet";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "sync time unknown";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function CatalogueStatusStrip({ freshness, usedFallback }: { freshness: CatalogSourceStatus[]; usedFallback: boolean }) {
  return (
    <section className="rounded-lg border border-ink/10 bg-white/85 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-leaf">Source-backed catalogue</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-ink/70">
            {usedFallback
              ? "The app is using demo route data until the local catalogue has a successful sync."
              : "Routes are decorated with local source-backed catalogue records and freshness checks."}
          </p>
        </div>
        <span className="w-fit rounded-full bg-ink px-3 py-2 text-xs font-black text-white">
          {usedFallback ? "Fallback active" : "Catalogue active"}
        </span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {freshness.map((source) => (
          <div key={source.source} className="rounded-lg bg-sky/60 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[0.65rem] font-black uppercase tracking-wide text-ink/45">{source.label}</p>
              <span className={`rounded-full px-2 py-1 text-[0.65rem] font-black ${statusStyles[source.freshnessStatus]}`}>
                {statusLabels[source.freshnessStatus]}
              </span>
            </div>
            <p className="mt-1 text-xs font-semibold leading-5 text-ink/70">{formatSyncDate(source.lastSuccessfulSync)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
