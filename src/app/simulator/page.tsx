"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ScoreBar } from "@/components/score-bar";
import { mockRoutes } from "@/data/routes/mock-routes";
import { buildSimulatorComparison } from "@/lib/scoring";
import { useSavedQuizAnswers } from "@/lib/use-saved-quiz-answers";
import type { DebtPreference, GradeBand, QuizAnswers, ScoredRoute, SimulatorChange, SimulatorMovementLabel } from "@/types";

type Option<T extends string> = {
  value: T;
  label: string;
  hint: string;
};

const gradeOptions: Option<GradeBand>[] = [
  { value: "needs-building", label: "Building up", hint: "Some grades may need support" },
  { value: "steady", label: "Steady", hint: "Mostly on track" },
  { value: "strong", label: "Strong", hint: "Competitive for many routes" },
  { value: "high", label: "High", hint: "High academic attainment" },
];

const debtOptions: Option<DebtPreference>[] = [
  { value: "open", label: "Open", hint: "Costs matter, but are not a blocker" },
  { value: "some-concern", label: "Some concern", hint: "Cost clarity should carry weight" },
  { value: "avoid", label: "Prefer to avoid", hint: "Lower-debt routes get extra weight" },
];

const gradeLabels: Record<GradeBand, string> = {
  "needs-building": "building up",
  steady: "steady",
  strong: "strong",
  high: "high",
};

const debtLabels: Record<DebtPreference, string> = {
  open: "open",
  "some-concern": "some concern",
  avoid: "prefer to avoid",
};

const movementStyles: Record<SimulatorMovementLabel, { badge: string; ring: string; text: string }> = {
  improved: {
    badge: "bg-leaf text-white",
    ring: "border-leaf/30 bg-mint/70",
    text: "Improved",
  },
  worsened: {
    badge: "bg-coral text-white",
    ring: "border-coral/30 bg-[#fff0eb]",
    text: "Worsened",
  },
  appeared: {
    badge: "bg-sky text-ink",
    ring: "border-sky bg-sky/55",
    text: "Appeared",
  },
  disappeared: {
    badge: "bg-ink text-white",
    ring: "border-ink/20 bg-oat",
    text: "Disappeared",
  },
  steady: {
    badge: "bg-oat text-ink",
    ring: "border-ink/10 bg-white",
    text: "Steady",
  },
};

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.max(min, Math.min(max, Math.round(value)));
}

function countScenarioChanges(baseline: QuizAnswers, scenario: QuizAnswers) {
  return [
    baseline.predictedGrades !== scenario.predictedGrades,
    baseline.maxTravelMinutes !== scenario.maxTravelMinutes,
    baseline.debtPreference !== scenario.debtPreference,
    (baseline.targetCareer ?? "") !== (scenario.targetCareer ?? ""),
    (baseline.targetCourse ?? "") !== (scenario.targetCourse ?? ""),
    baseline.earnSoon !== scenario.earnSoon,
  ].filter(Boolean).length;
}

function formatDelta(delta: number) {
  if (delta > 0) {
    return `+${delta}`;
  }

  return `${delta}`;
}

function OptionalValue({ value, fallback }: { value?: string; fallback: string }) {
  return <span>{value?.trim() ? value : fallback}</span>;
}

function EmptySimulatorAnswers() {
  return (
    <AppShell>
      <section className="mx-auto max-w-3xl rounded-lg border border-ink/10 bg-white p-5 shadow-soft">
        <p className="text-sm font-black uppercase tracking-wide text-leaf">What-if simulator</p>
        <h1 className="mt-3 text-3xl font-black leading-tight text-ink sm:text-5xl">Start with your saved quiz answers.</h1>
        <p className="mt-3 text-base leading-7 text-ink/75">
          The simulator needs a baseline from the quiz saved on this device. Once you have answers saved, you can test grades,
          travel, cost preference, targets, and earning pace without changing the original quiz.
        </p>
        <Link
          href="/quiz"
          className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-black text-white transition hover:bg-leaf sm:w-auto"
        >
          Go to the quiz
        </Link>
      </section>
    </AppShell>
  );
}

function BaselineSummary({ answers }: { answers: QuizAnswers }) {
  const items = [
    ["Grades", gradeLabels[answers.predictedGrades]],
    ["Travel", `up to ${answers.maxTravelMinutes} min`],
    ["Debt", debtLabels[answers.debtPreference]],
    ["Career", answers.targetCareer || "not set"],
    ["Course", answers.targetCourse || "not set"],
    ["Earn soon", `${answers.earnSoon} out of 5`],
  ];

  return (
    <section className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-leaf">Saved baseline</p>
          <h2 className="mt-1 text-xl font-black text-ink">Your quiz answers stay unchanged.</h2>
        </div>
        <Link
          href="/quiz"
          className="shrink-0 rounded-full border border-ink/15 px-3 py-2 text-xs font-black text-ink transition hover:bg-mint"
        >
          Edit quiz
        </Link>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {items.map(([label, value]) => (
          <div key={label} className="rounded-lg bg-oat px-3 py-2">
            <p className="text-[0.65rem] font-black uppercase tracking-wide text-ink/45">{label}</p>
            <p className="mt-1 text-sm font-black text-ink">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function OptionButtons<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <p className="text-sm font-black text-ink">{label}</p>
      <div className="mt-3 grid gap-2">
        {options.map((option) => {
          const selected = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={`rounded-lg border-2 px-4 py-3 text-left transition ${
                selected
                  ? "border-leaf bg-mint shadow-soft"
                  : "border-ink/10 bg-white hover:border-leaf/40 hover:bg-mint/40"
              }`}
            >
              <span className="block text-base font-black text-ink">{option.label}</span>
              <span className="mt-1 block text-sm font-semibold leading-5 text-ink/60">{option.hint}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ScenarioControls({
  baseline,
  scenario,
  onChange,
  onReset,
}: {
  baseline: QuizAnswers;
  scenario: QuizAnswers;
  onChange: (update: Partial<QuizAnswers>) => void;
  onReset: () => void;
}) {
  const changedCount = countScenarioChanges(baseline, scenario);
  const progress = Math.round((changedCount / 6) * 100);

  function updateScenario(update: Partial<QuizAnswers>) {
    onChange(update);
  }

  return (
    <section className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-leaf">Changed scenario</p>
          <h2 className="mt-1 text-xl font-black text-ink">Try a route shift.</h2>
          <p className="mt-2 text-sm leading-6 text-ink/70">
            These controls recalculate the comparison only on this page. They are planning prompts, not predictions.
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-ink/15 bg-white px-4 py-2 text-sm font-black text-ink transition hover:bg-mint"
        >
          Reset
        </button>
      </div>

      <div className="mt-4 rounded-lg bg-oat p-3">
        <div className="flex items-center justify-between gap-3 text-xs font-black uppercase tracking-wide text-ink/55">
          <span>Scenario changes</span>
          <span>
            {changedCount} of 6
          </span>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-white">
          <div className="h-full rounded-full bg-leaf transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="mt-5 grid gap-6">
        <OptionButtons
          label="Predicted grades"
          options={gradeOptions}
          value={scenario.predictedGrades}
          onChange={(predictedGrades) => updateScenario({ predictedGrades })}
        />

        <label className="block text-sm font-black text-ink">
          Maximum travel time
          <span className="mt-2 flex items-center justify-between rounded-lg border-2 border-ink/10 bg-oat px-4 py-3">
            <span className="text-3xl font-black text-ink">{scenario.maxTravelMinutes}</span>
            <span className="text-xs font-black uppercase tracking-wide text-ink/45">minutes</span>
          </span>
          <input
            type="range"
            min={10}
            max={180}
            step={5}
            value={scenario.maxTravelMinutes}
            onChange={(event) => updateScenario({ maxTravelMinutes: Number(event.target.value) })}
            className="mt-4 w-full accent-leaf"
          />
          <input
            type="number"
            min={10}
            max={180}
            step={5}
            value={scenario.maxTravelMinutes}
            onChange={(event) => updateScenario({ maxTravelMinutes: clampNumber(Number(event.target.value), 10, 180) })}
            className="mt-3 w-full rounded-lg border-2 border-ink/10 bg-white px-4 py-3 text-base font-semibold text-ink outline-none transition focus:border-leaf"
          />
        </label>

        <OptionButtons
          label="Debt preference"
          options={debtOptions}
          value={scenario.debtPreference}
          onChange={(debtPreference) => updateScenario({ debtPreference })}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-black text-ink">
            Target career
            <input
              value={scenario.targetCareer ?? ""}
              onChange={(event) => updateScenario({ targetCareer: event.target.value })}
              placeholder="e.g. software developer"
              className="mt-2 w-full rounded-lg border-2 border-ink/10 bg-white px-4 py-3 text-base font-semibold text-ink outline-none transition focus:border-leaf"
            />
          </label>
          <label className="text-sm font-black text-ink">
            Target course
            <input
              value={scenario.targetCourse ?? ""}
              onChange={(event) => updateScenario({ targetCourse: event.target.value })}
              placeholder="e.g. computer science"
              className="mt-2 w-full rounded-lg border-2 border-ink/10 bg-white px-4 py-3 text-base font-semibold text-ink outline-none transition focus:border-leaf"
            />
          </label>
        </div>

        <label className="block text-sm font-black text-ink">
          Desire to earn soon
          <span className="mt-2 flex items-center justify-between rounded-lg border-2 border-ink/10 bg-oat px-4 py-3">
            <span className="text-3xl font-black text-ink">{scenario.earnSoon}</span>
            <span className="text-xs font-black uppercase tracking-wide text-ink/45">out of 5</span>
          </span>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={scenario.earnSoon}
            onChange={(event) => updateScenario({ earnSoon: Number(event.target.value) })}
            className="mt-4 w-full accent-leaf"
          />
        </label>
      </div>
    </section>
  );
}

function TopRouteList({
  title,
  helper,
  routes,
  changesByRouteId,
}: {
  title: string;
  helper: string;
  routes: ScoredRoute[];
  changesByRouteId: Map<string, SimulatorChange>;
}) {
  return (
    <section className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-ink">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-ink/65">{helper}</p>
        </div>
        <span className="rounded-full bg-mint px-3 py-2 text-xs font-black text-ink">{routes.length} routes</span>
      </div>
      <div className="mt-4 grid gap-4">
        {routes.map((route, index) => {
          const change = changesByRouteId.get(route.id);
          const movement = change ? movementStyles[change.label] : movementStyles.steady;

          return (
            <article key={route.id} className="rounded-lg border border-ink/10 bg-oat p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-ink/45">Rank {index + 1}</p>
                  <h3 className="mt-1 text-base font-black leading-tight text-ink">{route.title}</h3>
                  <p className="mt-1 text-sm font-semibold text-ink/60">{route.type}</p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-2 text-xs font-black ${movement.badge}`}>
                  {movement.text}
                </span>
              </div>
              <div className="mt-3">
                <ScoreBar label="Total score" value={route.totalScore} />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function MovementList({ changes, routeTitleById }: { changes: SimulatorChange[]; routeTitleById: Map<string, string> }) {
  return (
    <section className="mx-auto mt-6 max-w-5xl rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-leaf">Route movement</p>
        <h2 className="mt-1 text-2xl font-black text-ink">What changed in the top routes?</h2>
        <p className="mt-2 text-sm leading-6 text-ink/70">
          Appeared and disappeared mean movement in or out of the visible top five. Routes can still be worth checking even when
          they move down.
        </p>
      </div>

      <div className="mt-4 grid gap-3">
        {changes.map((change) => {
          const movement = movementStyles[change.label];

          return (
            <article key={change.routeId} className={`rounded-lg border p-4 ${movement.ring}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-lg font-black leading-tight text-ink">{routeTitleById.get(change.routeId)}</h3>
                  <p className="mt-1 text-sm font-semibold text-ink/65">
                    Rank{" "}
                    <span className="font-black text-ink">
                      {change.baselineRank ? `#${change.baselineRank}` : "outside list"}
                    </span>{" "}
                    to{" "}
                    <span className="font-black text-ink">
                      {change.changedRank ? `#${change.changedRank}` : "outside list"}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-3 py-2 text-xs font-black ${movement.badge}`}>{movement.text}</span>
                  <span className="rounded-full bg-white px-3 py-2 text-xs font-black text-ink">
                    {formatDelta(change.delta)}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <ScoreBar label="Baseline score" value={change.baselineScore ?? 0} />
                <ScoreBar label="Changed score" value={change.changedScore ?? 0} />
              </div>

              <ul className="mt-4 list-disc space-y-1 pl-5 text-sm font-semibold leading-6 text-ink/72">
                {change.explanations.map((explanation) => (
                  <li key={explanation}>{explanation}</li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default function SimulatorPage() {
  const savedAnswers = useSavedQuizAnswers();
  const [scenarioOverrides, setScenarioOverrides] = useState<Partial<QuizAnswers>>({});
  const scenario = useMemo(() => {
    if (!savedAnswers) {
      return null;
    }

    return { ...savedAnswers, ...scenarioOverrides };
  }, [savedAnswers, scenarioOverrides]);
  const comparison = useMemo(() => {
    if (!savedAnswers || !scenario) {
      return null;
    }

    return buildSimulatorComparison(mockRoutes, savedAnswers, scenario, 5);
  }, [savedAnswers, scenario]);

  const routeTitleById = useMemo(() => new Map(mockRoutes.map((route) => [route.id, route.title])), []);
  const changesByRouteId = useMemo(() => {
    return new Map(comparison?.changes.map((change) => [change.routeId, change]) ?? []);
  }, [comparison]);

  if (!savedAnswers || !scenario || !comparison) {
    return <EmptySimulatorAnswers />;
  }

  return (
    <AppShell>
      <section className="mx-auto max-w-3xl">
        <p className="text-sm font-black uppercase tracking-wide text-leaf">What-if simulator</p>
        <h1 className="mt-3 text-3xl font-black leading-tight text-ink sm:text-5xl">Change the inputs, compare the trade-offs.</h1>
        <p className="mt-3 text-base leading-7 text-ink/75">
          This uses your saved quiz as the baseline and recalculates route scores live. Treat the movement as a planning aid,
          not a prediction about offers, jobs, or outcomes.
        </p>
      </section>

      <section className="mx-auto mt-6 grid max-w-5xl gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <BaselineSummary answers={savedAnswers} />
        <ScenarioControls
          baseline={savedAnswers}
          scenario={scenario}
          onChange={(update) => setScenarioOverrides((current) => ({ ...current, ...update }))}
          onReset={() => setScenarioOverrides({})}
        />
      </section>

      <section className="mx-auto mt-6 max-w-5xl rounded-lg border border-ink/10 bg-white/90 p-4 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-leaf">Scenario now</p>
            <h2 className="mt-1 text-xl font-black text-ink">The changed scores are using these values.</h2>
          </div>
          <div className="rounded-lg bg-mint px-4 py-3 text-sm font-black text-ink">
            {countScenarioChanges(savedAnswers, scenario)} changed input{countScenarioChanges(savedAnswers, scenario) === 1 ? "" : "s"}
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg bg-oat px-3 py-2">
            <p className="text-[0.65rem] font-black uppercase tracking-wide text-ink/45">Grades</p>
            <p className="mt-1 text-sm font-black text-ink">{gradeLabels[scenario.predictedGrades]}</p>
          </div>
          <div className="rounded-lg bg-oat px-3 py-2">
            <p className="text-[0.65rem] font-black uppercase tracking-wide text-ink/45">Travel</p>
            <p className="mt-1 text-sm font-black text-ink">up to {scenario.maxTravelMinutes} min</p>
          </div>
          <div className="rounded-lg bg-oat px-3 py-2">
            <p className="text-[0.65rem] font-black uppercase tracking-wide text-ink/45">Debt</p>
            <p className="mt-1 text-sm font-black text-ink">{debtLabels[scenario.debtPreference]}</p>
          </div>
          <div className="rounded-lg bg-oat px-3 py-2">
            <p className="text-[0.65rem] font-black uppercase tracking-wide text-ink/45">Career</p>
            <p className="mt-1 text-sm font-black text-ink">
              <OptionalValue value={scenario.targetCareer} fallback="not set" />
            </p>
          </div>
          <div className="rounded-lg bg-oat px-3 py-2">
            <p className="text-[0.65rem] font-black uppercase tracking-wide text-ink/45">Course</p>
            <p className="mt-1 text-sm font-black text-ink">
              <OptionalValue value={scenario.targetCourse} fallback="not set" />
            </p>
          </div>
          <div className="rounded-lg bg-oat px-3 py-2">
            <p className="text-[0.65rem] font-black uppercase tracking-wide text-ink/45">Earn soon</p>
            <p className="mt-1 text-sm font-black text-ink">{scenario.earnSoon} out of 5</p>
          </div>
        </div>
      </section>

      <MovementList changes={comparison.changes} routeTitleById={routeTitleById} />

      <section className="mx-auto mt-6 grid max-w-5xl gap-4 lg:grid-cols-2">
        <TopRouteList
          title="Baseline top routes"
          helper="The top five from your saved quiz answers."
          routes={comparison.baselineRoutes}
          changesByRouteId={changesByRouteId}
        />
        <TopRouteList
          title="Changed top routes"
          helper="The top five after the what-if controls."
          routes={comparison.changedRoutes}
          changesByRouteId={changesByRouteId}
        />
      </section>
    </AppShell>
  );
}
