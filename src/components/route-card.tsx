import Link from "next/link";
import type { ScoredRoute } from "@/types";

function ScorePill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-ink/10 bg-white/85 px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[0.65rem] font-bold uppercase text-ink/50">{label}</span>
        <span className="text-sm font-black text-ink">{value}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/10">
        <div className="h-full rounded-full bg-leaf" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function DetailList({ title, items }: { title: string; items: string[] }) {
  return (
    <section>
      <h3 className="text-sm font-black text-ink">{title}</h3>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-ink/75">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

export function RouteCard({ route }: { route: ScoredRoute }) {
  return (
    <article className="overflow-hidden rounded-lg border border-ink/10 bg-white shadow-soft">
      <div className="h-2 bg-coral" />
      <div className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[0.68rem] font-black uppercase tracking-wide text-ink/45">Route type</p>
            <p className="mt-1 inline-flex rounded-full bg-mint px-3 py-1 text-xs font-black text-ink/75">
              {route.type}
            </p>
            <h2 className="mt-2 text-xl font-black leading-tight text-ink">{route.title}</h2>
            <p className="mt-2 text-sm leading-6 text-ink/70">{route.summary}</p>
          </div>
          <div className="w-full rounded-lg bg-ink px-4 py-3 text-center text-white sm:w-28">
            <div className="text-[0.65rem] font-bold uppercase text-white/65">Total score</div>
            <div className="text-3xl font-black">{route.totalScore}</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <ScorePill label="Fit score" value={route.scores.fit} />
          <ScorePill label="Feasibility score" value={route.scores.feasibility} />
          <ScorePill label="Constraint score" value={route.scores.constraint} />
          <ScorePill label="Confidence score" value={route.scores.confidence} />
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <DetailList title="Why this route currently looks strong" items={route.explanation.whyThisRouteFits} />
          <DetailList title="Watch-outs" items={route.explanation.watchOuts} />
          <DetailList title="Next steps" items={route.explanation.nextSteps} />
          <section>
            <h3 className="text-sm font-black text-ink">Backup options</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {route.explanation.backupOptions.map((option) => (
                <span key={option} className="rounded-full bg-oat px-3 py-2 text-xs font-black text-ink/70">
                  {option}
                </span>
              ))}
            </div>
          </section>
        </div>

        {route.explanation.missingInfo.length ? (
          <div className="mt-5 rounded-lg bg-sky px-4 py-3 text-sm font-semibold leading-6 text-ink/75">
            <span className="font-black text-ink">More useful with: </span>
            {route.explanation.missingInfo.map((item, index) => (
              <span key={item}>
                {index > 0 ? " " : ""}
                {item}
              </span>
            ))}
          </div>
        ) : null}

        <Link
          href={`/roadmap/${route.id}`}
          className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-ink px-4 py-3 text-sm font-black text-white transition hover:bg-leaf sm:w-auto"
        >
          View roadmap
        </Link>
      </div>
    </article>
  );
}
