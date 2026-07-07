import Link from "next/link";
import type { ScoredRoute } from "@/types";

function ScorePill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-full border border-ink/10 bg-white px-3 py-2 text-center">
      <div className="text-[0.65rem] font-bold uppercase text-ink/50">{label}</div>
      <div className="text-sm font-black text-ink">{value}</div>
    </div>
  );
}

export function RouteCard({ route, rank }: { route: ScoredRoute; rank?: number }) {
  return (
    <article className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-leaf">
            {rank ? `Option ${rank}` : route.type}
          </p>
          <h2 className="mt-1 text-xl font-black leading-tight text-ink">{route.title}</h2>
          <p className="mt-2 text-sm leading-6 text-ink/70">{route.summary}</p>
        </div>
        <div className="rounded-lg bg-mint px-3 py-2 text-center">
          <div className="text-[0.65rem] font-bold uppercase text-ink/55">Fit</div>
          <div className="text-2xl font-black text-ink">{route.totalScore}</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <ScorePill label="Fit" value={route.scores.fit} />
        <ScorePill label="Feasible" value={route.scores.feasibility} />
        <ScorePill label="Constraints" value={route.scores.constraint} />
        <ScorePill label="Confidence" value={route.scores.confidence} />
      </div>

      <div className="mt-4 space-y-4 text-sm leading-6 text-ink/75">
        <section>
          <h3 className="font-black text-ink">Why this route currently looks strong</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {route.explanation.whyThisRouteFits.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="font-black text-ink">Watch-outs</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {route.explanation.watchOuts.slice(0, 2).map((risk) => (
              <li key={risk}>{risk}</li>
            ))}
          </ul>
        </section>
      </div>

      <Link
        href={`/roadmap/${route.id}`}
        className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-ink px-4 py-3 text-sm font-black text-white transition hover:bg-leaf sm:w-auto"
      >
        View roadmap
      </Link>
    </article>
  );
}
