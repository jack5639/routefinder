import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { mockRoutes } from "@/data/routes/mock-routes";

const principles = [
  "Compare several routes without treating one answer as final.",
  "See trade-offs around grades, travel, money, and learning style.",
  "Use a roadmap to turn a possible route into a next step.",
];

export default function LandingPage() {
  return (
    <AppShell>
      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-leaf">Supportive route planning</p>
          <h1 className="mt-3 text-4xl font-black leading-tight text-ink sm:text-6xl">
            Explore your next route without pressure.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-ink/75 sm:text-lg">
            A mobile-first prototype for comparing university, apprenticeships, college, access,
            direct work, and portfolio routes. The app shows possibilities, trade-offs, and
            confidence levels so choices feel easier to discuss.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/quiz"
              className="inline-flex items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-black text-white shadow-soft transition hover:bg-leaf"
            >
              Start route quiz
            </Link>
            <Link
              href="/results"
              className="inline-flex items-center justify-center rounded-full border border-ink/15 bg-white px-5 py-3 text-sm font-black text-ink transition hover:bg-mint"
            >
              See mock results
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
          <div className="rounded-lg bg-sky p-4">
            <p className="text-xs font-black uppercase tracking-wide text-ink/60">Prototype snapshot</p>
            <h2 className="mt-2 text-2xl font-black text-ink">{mockRoutes.length} mock route options</h2>
            <p className="mt-2 text-sm leading-6 text-ink/70">
              Each option includes fit, feasibility, constraint, and confidence scores, plus reasons,
              watch-outs, next steps, and backup routes.
            </p>
          </div>
          <div className="mt-4 grid gap-3">
            {principles.map((principle) => (
              <div key={principle} className="rounded-lg border border-ink/10 bg-oat p-3 text-sm font-semibold leading-6 text-ink/75">
                {principle}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-3 sm:grid-cols-3">
        {["Quiz", "Results", "Roadmap"].map((item, index) => (
          <div key={item} className="rounded-lg border border-ink/10 bg-white/80 p-4">
            <p className="text-xs font-black uppercase text-leaf">Step {index + 1}</p>
            <h2 className="mt-1 text-lg font-black text-ink">{item}</h2>
            <p className="mt-2 text-sm leading-6 text-ink/70">
              {index === 0 && "Capture current stage, interests, constraints, and preferences."}
              {index === 1 && "Rank route options using deterministic mock scoring."}
              {index === 2 && "Turn one route into practical steps and backup options."}
            </p>
          </div>
        ))}
      </section>
    </AppShell>
  );
}
