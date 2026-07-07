import { AppShell } from "@/components/app-shell";
import { ScoreBar } from "@/components/score-bar";
import { defaultQuizAnswers } from "@/data/default-answers";
import { mockRoutes } from "@/data/routes/mock-routes";
import { compareRouteScores, rankRoutes } from "@/lib/scoring";

const changedAnswers = {
  ...defaultQuizAnswers,
  predictedGrades: "strong" as const,
  maxTravelMinutes: 90,
  debtPreference: "open" as const,
  targetCareer: "software developer",
  targetCourse: "computer science",
  earnSoon: 3,
};

const labelStyles = {
  improved: "bg-mint text-ink",
  worsened: "bg-[#ffe0d8] text-ink",
  appeared: "bg-sky text-ink",
  disappeared: "bg-ink text-white",
  steady: "bg-oat text-ink",
};

export default function SimulatorPage() {
  const baselineRoutes = rankRoutes(mockRoutes, defaultQuizAnswers, 5);
  const changedRoutes = rankRoutes(mockRoutes, changedAnswers, 5);
  const changes = compareRouteScores(mockRoutes, defaultQuizAnswers, changedAnswers, 5);
  const routeTitleById = new Map(mockRoutes.map((route) => [route.id, route.title]));

  return (
    <AppShell>
      <section className="mx-auto max-w-3xl">
        <p className="text-sm font-black uppercase tracking-wide text-leaf">What-if simulator</p>
        <h1 className="mt-3 text-3xl font-black leading-tight text-ink sm:text-5xl">See how route scores move.</h1>
        <p className="mt-3 text-base leading-7 text-ink/75">
          This mock simulator compares the baseline quiz answers with a changed set. In the full
          MVP these controls will update live as the user changes their inputs.
        </p>
      </section>

      <section className="mx-auto mt-6 grid max-w-3xl gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
          <h2 className="text-lg font-black text-ink">Baseline</h2>
          <div className="mt-4 grid gap-3">
            <div className="rounded-lg bg-oat p-3 text-sm font-semibold text-ink/75">Grades: steady</div>
            <div className="rounded-lg bg-oat p-3 text-sm font-semibold text-ink/75">Travel: 60 minutes</div>
            <div className="rounded-lg bg-oat p-3 text-sm font-semibold text-ink/75">Debt preference: some concern</div>
            <div className="rounded-lg bg-oat p-3 text-sm font-semibold text-ink/75">Earn soon: 4 / 5</div>
          </div>
        </div>

        <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
          <h2 className="text-lg font-black text-ink">Changed scenario</h2>
          <div className="mt-4 grid gap-3">
            <label className="text-sm font-bold text-ink/65">
              Predicted grades
              <select defaultValue={changedAnswers.predictedGrades} className="mt-2 w-full rounded-lg border border-ink/15 bg-oat px-4 py-3 text-sm font-semibold text-ink">
                <option value="needs-building">Building up</option>
                <option value="steady">Steady</option>
                <option value="strong">Strong</option>
                <option value="high">High</option>
              </select>
            </label>
            <label className="text-sm font-bold text-ink/65">
              Travel distance
              <input defaultValue={changedAnswers.maxTravelMinutes} type="number" className="mt-2 w-full rounded-lg border border-ink/15 bg-oat px-4 py-3 text-sm font-semibold text-ink" />
            </label>
            <label className="text-sm font-bold text-ink/65">
              Debt preference
              <select defaultValue={changedAnswers.debtPreference} className="mt-2 w-full rounded-lg border border-ink/15 bg-oat px-4 py-3 text-sm font-semibold text-ink">
                <option value="open">Open</option>
                <option value="some-concern">Some concern</option>
                <option value="avoid">Prefer to avoid</option>
              </select>
            </label>
            <label className="text-sm font-bold text-ink/65">
              Desire to earn soon
              <input defaultValue={changedAnswers.earnSoon} min={1} max={5} type="range" className="mt-2 w-full accent-leaf" />
            </label>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-6 max-w-3xl rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
        <h2 className="text-lg font-black text-ink">Route movement</h2>
        <div className="mt-4 grid gap-3">
          {changes.map((change) => (
            <div key={change.routeId} className="flex items-center justify-between gap-3 rounded-lg border border-ink/10 bg-oat p-3">
              <div>
                <p className="font-black text-ink">{routeTitleById.get(change.routeId)}</p>
                <p className="text-sm text-ink/65">Score movement: {change.delta > 0 ? "+" : ""}{change.delta}</p>
              </div>
              <span className={`rounded-full px-3 py-2 text-xs font-black ${labelStyles[change.label]}`}>
                {change.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-6 grid max-w-3xl gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
          <h2 className="text-lg font-black text-ink">Top baseline routes</h2>
          <div className="mt-4 space-y-4">
            {baselineRoutes.slice(0, 3).map((route) => (
              <ScoreBar key={route.id} label={route.title} value={route.totalScore} />
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
          <h2 className="text-lg font-black text-ink">Top changed routes</h2>
          <div className="mt-4 space-y-4">
            {changedRoutes.slice(0, 3).map((route) => (
              <ScoreBar key={route.id} label={route.title} value={route.totalScore} />
            ))}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
