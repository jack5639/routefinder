import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ScoreBar } from "@/components/score-bar";
import { defaultQuizAnswers } from "@/data/default-answers";
import { mockRoadmaps } from "@/data/roadmaps/mock-roadmaps";
import { mockRoutes } from "@/data/routes/mock-routes";
import { scoreRoute } from "@/lib/scoring";

export function generateStaticParams() {
  return mockRoutes.map((route) => ({
    routeId: route.id,
  }));
}

export default function RoadmapPage({ params }: { params: { routeId: string } }) {
  const route = mockRoutes.find((item) => item.id === params.routeId);
  const roadmap = mockRoadmaps.find((item) => item.routeId === params.routeId);

  if (!route || !roadmap) {
    notFound();
  }

  const scored = scoreRoute(route, defaultQuizAnswers);

  return (
    <AppShell>
      <section className="mx-auto max-w-3xl">
        <p className="text-sm font-black uppercase tracking-wide text-leaf">Selected roadmap</p>
        <h1 className="mt-3 text-3xl font-black leading-tight text-ink sm:text-5xl">{roadmap.heading}</h1>
        <p className="mt-3 text-base leading-7 text-ink/75">{roadmap.overview}</p>
      </section>

      <section className="mx-auto mt-6 grid max-w-3xl gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <aside className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
          <p className="text-xs font-black uppercase tracking-wide text-leaf">{route.type}</p>
          <h2 className="mt-2 text-xl font-black text-ink">{route.title}</h2>
          <p className="mt-2 text-sm leading-6 text-ink/70">{route.summary}</p>
          <div className="mt-4 space-y-3">
            <ScoreBar label="Fit" value={scored.scores.fit} />
            <ScoreBar label="Feasibility" value={scored.scores.feasibility} />
            <ScoreBar label="Constraints" value={scored.scores.constraint} />
            <ScoreBar label="Confidence" value={scored.scores.confidence} />
          </div>
          <div className="mt-4 rounded-lg bg-oat p-3 text-sm leading-6 text-ink/70">
            Confidence is a guide to how complete the mock information is, not a promise about outcomes.
          </div>
        </aside>

        <div className="space-y-3">
          {roadmap.steps.map((step, index) => (
            <article key={step.title} className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
              <p className="text-xs font-black uppercase tracking-wide text-coral">
                Step {index + 1} · {step.timeframe}
              </p>
              <h2 className="mt-2 text-lg font-black text-ink">{step.title}</h2>
              <p className="mt-2 text-sm leading-6 text-ink/70">{step.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-6 max-w-3xl rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
        <h2 className="text-lg font-black text-ink">Backup options to keep visible</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {route.backupOptions.map((option) => (
            <span key={option} className="rounded-full bg-mint px-3 py-2 text-xs font-bold text-ink/75">
              {option}
            </span>
          ))}
        </div>
        <Link
          href="/simulator"
          className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-ink px-4 py-3 text-sm font-black text-white transition hover:bg-leaf sm:w-auto"
        >
          Test what-if changes
        </Link>
      </section>
    </AppShell>
  );
}
