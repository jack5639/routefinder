import type { RouteOpportunity } from "@/types";

function opportunityMeta(opportunity: RouteOpportunity) {
  return [
    opportunity.providerName,
    opportunity.employerName,
    opportunity.location,
    opportunity.deadline ? `Deadline ${opportunity.deadline}` : "",
    opportunity.costOrPay,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function RouteOpportunities({ opportunities }: { opportunities: RouteOpportunity[] | undefined }) {
  if (!opportunities?.length) {
    return null;
  }

  return (
    <section className="mt-5 rounded-lg border border-ink/10 bg-white/80 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-leaf">Source-backed examples</p>
          <h3 className="mt-1 text-base font-black text-ink">Real opportunities to check directly</h3>
        </div>
        <span className="w-fit rounded-full bg-mint px-3 py-2 text-xs font-black text-ink/75">{opportunities.length} shown</span>
      </div>

      <div className="mt-3 grid gap-2">
        {opportunities.slice(0, 3).map((opportunity) => (
          <article key={opportunity.id} className="rounded-lg bg-sky/70 p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-black leading-5 text-ink">{opportunity.title}</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-ink/65">{opportunityMeta(opportunity) || opportunity.summary}</p>
              </div>
              {opportunity.sourceUrl ? (
                <a
                  href={opportunity.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-10 items-center justify-center rounded-full border border-ink/15 bg-white px-3 py-2 text-xs font-black text-ink transition hover:bg-mint"
                >
                  Check source
                </a>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
