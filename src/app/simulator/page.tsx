"use client";

import Link from "next/link";
import { type KeyboardEvent, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { CatalogueStatusStrip } from "@/components/catalogue-status-strip";
import { ScoreBar } from "@/components/score-bar";
import { applySingleSimulatorChange, buildSimulatorComparison, countSimulatorChangedFactors } from "@/lib/scoring";
import { useCatalogueRoutes } from "@/lib/use-catalogue-routes";
import { useSavedQuizAnswers } from "@/lib/use-saved-quiz-answers";
import type {
  DebtPreference,
  GradeBand,
  QuizAnswers,
  ScoredRoute,
  SimulatorChange,
  SimulatorFactor,
  SimulatorFactorPatch,
  SimulatorMovementLabel,
  WorkStyle,
} from "@/types";

type Option<T extends string> = {
  value: T;
  label: string;
  hint?: string;
};

const factorOptions: Option<SimulatorFactor>[] = [
  { value: "grades", label: "Grades", hint: "Test a different predicted grade band" },
  { value: "travel", label: "Travel or move", hint: "Test a wider or tighter distance" },
  { value: "debt", label: "Debt preference", hint: "Test how cost comfort changes scores" },
  { value: "target", label: "Target idea", hint: "Test a career or course idea" },
  { value: "interests", label: "Interests", hint: "Test a different interest mix" },
  { value: "day-to-day", label: "Day to day", hint: "Test working style and earning pace" },
];

const gradeOptions: Option<GradeBand>[] = [
  { value: "needs-building", label: "Building up" },
  { value: "steady", label: "Steady" },
  { value: "strong", label: "Strong" },
  { value: "high", label: "High" },
];

const debtOptions: Option<DebtPreference>[] = [
  { value: "open", label: "Open to costs" },
  { value: "some-concern", label: "Cost-aware" },
  { value: "avoid", label: "Prefer lower debt" },
];

const interestOptions: Option<string>[] = [
  { value: "technology", label: "Technology" },
  { value: "problem solving", label: "Problem solving" },
  { value: "health", label: "Health" },
  { value: "people", label: "Helping people" },
  { value: "business", label: "Business" },
  { value: "design", label: "Design" },
  { value: "engineering", label: "Engineering" },
  { value: "gaming", label: "Games" },
  { value: "community", label: "Community" },
  { value: "writing", label: "Writing" },
];

const workStyleOptions: Option<WorkStyle>[] = [
  { value: "academic", label: "Ideas and study" },
  { value: "practical", label: "Hands-on" },
  { value: "creative", label: "Creative" },
  { value: "people", label: "People-focused" },
  { value: "technical", label: "Technical" },
];

const gradeLabels: Record<GradeBand, string> = {
  "needs-building": "building up",
  steady: "steady",
  strong: "strong",
  high: "high",
};

const debtLabels: Record<DebtPreference, string> = {
  open: "open to costs",
  "some-concern": "cost-aware",
  avoid: "prefers lower debt",
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

function cleanList(values: string[]) {
  const seen = new Set<string>();
  const cleanValues: string[] = [];

  values.forEach((value) => {
    const cleanValue = value.trim().replace(/\s+/g, " ");
    const key = cleanValue.toLowerCase();

    if (cleanValue && !seen.has(key)) {
      seen.add(key);
      cleanValues.push(cleanValue);
    }
  });

  return cleanValues;
}

function splitManualItems(value: string) {
  return value
    .split(",")
    .map((item) => item.trim().replace(/\s+/g, " "))
    .filter(Boolean);
}

function toggleValue<T extends string>(values: T[], value: T) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function formatDelta(delta: number) {
  if (delta > 0) {
    return `+${delta}`;
  }

  return `${delta}`;
}

function joinItems(items: string[], fallback: string) {
  const cleanItems = cleanList(items);
  return cleanItems.length ? cleanItems.join(", ") : fallback;
}

function chipButtonClass(selected: boolean) {
  return `min-h-12 rounded-lg border-2 px-4 py-3 text-left text-sm font-black leading-5 transition active:translate-y-0.5 ${
    selected
      ? "border-leaf bg-ink text-white shadow-soft"
      : "border-ink/10 bg-white text-ink hover:border-leaf/50 hover:bg-mint/45"
  }`;
}

function EmptySimulatorAnswers() {
  return (
    <AppShell>
      <section className="mx-auto max-w-3xl rounded-lg border border-ink/10 bg-white p-5 shadow-soft">
        <p className="text-sm font-black uppercase tracking-wide text-leaf">What-if simulator</p>
        <h1 className="mt-3 text-3xl font-black leading-tight text-ink sm:text-5xl">Start with your saved quiz answers.</h1>
        <p className="mt-3 text-base leading-7 text-ink/75">
          The simulator needs a baseline from the quiz saved on this device. Once answers are saved, it can test one change at a
          time without changing the original quiz.
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

function FactorPicker({
  selectedFactor,
  onSelect,
}: {
  selectedFactor: SimulatorFactor;
  onSelect: (factor: SimulatorFactor) => void;
}) {
  return (
    <section className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
      <p className="text-xs font-black uppercase tracking-wide text-leaf">Choose one factor</p>
      <h2 className="mt-1 text-xl font-black text-ink">Only this factor changes in the comparison.</h2>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {factorOptions.map((option) => {
          const selected = option.value === selectedFactor;

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(option.value)}
              className={chipButtonClass(selected)}
            >
              <span className="block">{option.label}</span>
              {option.hint ? (
                <span className={`mt-1 block text-xs font-semibold leading-5 ${selected ? "text-white/75" : "text-ink/60"}`}>
                  {option.hint}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function BaselineNotice({ answers, changedCount }: { answers: QuizAnswers; changedCount: number }) {
  return (
    <section className="rounded-lg border border-ink/10 bg-mint p-4 shadow-soft">
      <p className="text-xs font-black uppercase tracking-wide text-leaf">Saved baseline stays put</p>
      <h2 className="mt-1 text-xl font-black text-ink">Your saved quiz answers are not changed here.</h2>
      <p className="mt-2 text-sm font-semibold leading-6 text-ink/70">
        Go back to the quiz to edit the saved version. This page only builds a temporary comparison from one selected factor.
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg bg-white/85 px-3 py-2">
          <p className="text-[0.65rem] font-black uppercase tracking-wide text-ink/45">Grades</p>
          <p className="mt-1 text-sm font-black text-ink">{gradeLabels[answers.predictedGrades]}</p>
        </div>
        <div className="rounded-lg bg-white/85 px-3 py-2">
          <p className="text-[0.65rem] font-black uppercase tracking-wide text-ink/45">Travel</p>
          <p className="mt-1 text-sm font-black text-ink">up to {answers.maxTravelMinutes} min</p>
        </div>
        <div className="rounded-lg bg-white/85 px-3 py-2">
          <p className="text-[0.65rem] font-black uppercase tracking-wide text-ink/45">Temporary factors changed</p>
          <p className="mt-1 text-sm font-black text-ink">{changedCount} of 1</p>
        </div>
      </div>
    </section>
  );
}

function OptionButtons<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={`min-h-14 rounded-lg border-2 px-4 py-3 text-left font-black transition ${
              selected
                ? "border-leaf bg-mint shadow-soft"
                : "border-ink/10 bg-white hover:border-leaf/40 hover:bg-mint/40"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function MultiChipGrid<T extends string>({
  options,
  selectedValues,
  onToggle,
}: {
  options: Option<T>[];
  selectedValues: T[];
  onToggle: (value: T) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={selectedValues.includes(option.value)}
          onClick={() => onToggle(option.value)}
          className={chipButtonClass(selectedValues.includes(option.value))}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function ScenarioControls({
  selectedFactor,
  scenario,
  updatePatch,
  onReset,
}: {
  selectedFactor: SimulatorFactor;
  scenario: QuizAnswers;
  updatePatch: (patch: SimulatorFactorPatch) => void;
  onReset: () => void;
}) {
  const [interestDraft, setInterestDraft] = useState("");

  function addInterestDraft() {
    const additions = splitManualItems(interestDraft);

    if (!additions.length) {
      return;
    }

    updatePatch({ interests: cleanList([...scenario.interests, ...additions]) });
    setInterestDraft("");
  }

  function handleInterestDraftKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    addInterestDraft();
  }

  return (
    <section className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-leaf">Temporary change</p>
          <h2 className="mt-1 text-xl font-black text-ink">{factorOptions.find((item) => item.value === selectedFactor)?.label}</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-ink/70">
            Change this one factor, then compare the baseline and changed route scores below.
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-ink/15 bg-white px-4 py-2 text-sm font-black text-ink transition hover:bg-mint"
        >
          Reset change
        </button>
      </div>

      <div className="mt-5">
        {selectedFactor === "grades" ? (
          <OptionButtons
            options={gradeOptions}
            value={scenario.predictedGrades}
            onChange={(predictedGrades) => updatePatch({ predictedGrades })}
          />
        ) : null}

        {selectedFactor === "travel" ? (
          <label className="block text-sm font-black text-ink">
            Travel or move distance
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
              onChange={(event) => updatePatch({ maxTravelMinutes: Number(event.target.value) })}
              className="mt-4 w-full accent-leaf"
            />
            <input
              type="number"
              min={10}
              max={180}
              step={5}
              value={scenario.maxTravelMinutes}
              onChange={(event) => updatePatch({ maxTravelMinutes: clampNumber(Number(event.target.value), 10, 180) })}
              className="mt-3 w-full rounded-lg border-2 border-ink/10 bg-white px-4 py-3 text-base font-semibold text-ink outline-none transition focus:border-leaf"
            />
          </label>
        ) : null}

        {selectedFactor === "debt" ? (
          <OptionButtons
            options={debtOptions}
            value={scenario.debtPreference}
            onChange={(debtPreference) => updatePatch({ debtPreference })}
          />
        ) : null}

        {selectedFactor === "target" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-black text-ink">
              Career idea
              <input
                value={scenario.targetCareer ?? ""}
                onChange={(event) => updatePatch({ targetCareer: event.target.value })}
                placeholder="e.g. software developer"
                className="mt-2 w-full rounded-lg border-2 border-ink/10 bg-white px-4 py-3 text-base font-semibold text-ink outline-none transition focus:border-leaf"
              />
            </label>
            <label className="text-sm font-black text-ink">
              Course or study idea
              <input
                value={scenario.targetCourse ?? ""}
                onChange={(event) => updatePatch({ targetCourse: event.target.value })}
                placeholder="e.g. computer science"
                className="mt-2 w-full rounded-lg border-2 border-ink/10 bg-white px-4 py-3 text-base font-semibold text-ink outline-none transition focus:border-leaf"
              />
            </label>
          </div>
        ) : null}

        {selectedFactor === "interests" ? (
          <div className="space-y-4">
            <MultiChipGrid
              options={interestOptions}
              selectedValues={scenario.interests}
              onToggle={(interest) => updatePatch({ interests: toggleValue(scenario.interests, interest) })}
            />
            <div className="rounded-lg border border-ink/10 bg-oat p-3">
              <label className="block text-sm font-black text-ink" htmlFor="interest-draft">
                Add a different interest
              </label>
              <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
                <input
                  id="interest-draft"
                  value={interestDraft}
                  onChange={(event) => setInterestDraft(event.target.value)}
                  onKeyDown={handleInterestDraftKeyDown}
                  placeholder="e.g. sport, music, fixing things"
                  className="min-h-[3.25rem] w-full rounded-lg border-2 border-ink/10 bg-white px-4 py-3 text-base font-semibold text-ink outline-none transition focus:border-leaf"
                />
                <button
                  type="button"
                  onClick={addInterestDraft}
                  className="min-h-[3.25rem] rounded-lg bg-ink px-4 py-3 text-sm font-black text-white transition hover:bg-leaf"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {selectedFactor === "day-to-day" ? (
          <div className="space-y-5">
            <MultiChipGrid
              options={workStyleOptions}
              selectedValues={scenario.workStyles}
              onToggle={(workStyle) => updatePatch({ workStyles: toggleValue(scenario.workStyles, workStyle) })}
            />
            <label className="block text-sm font-black text-ink">
              Earning soon
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
                onChange={(event) => updatePatch({ earnSoon: Number(event.target.value) })}
                className="mt-4 w-full accent-leaf"
              />
            </label>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ScenarioSnapshot({
  title,
  answers,
  tone,
}: {
  title: string;
  answers: QuizAnswers;
  tone: "baseline" | "changed";
}) {
  return (
    <section className={`rounded-lg border border-ink/10 p-4 shadow-soft ${tone === "baseline" ? "bg-white" : "bg-sky/75"}`}>
      <p className="text-xs font-black uppercase tracking-wide text-leaf">{title}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg bg-oat px-3 py-2">
          <p className="text-[0.65rem] font-black uppercase tracking-wide text-ink/45">Grades</p>
          <p className="mt-1 text-sm font-black text-ink">{gradeLabels[answers.predictedGrades]}</p>
        </div>
        <div className="rounded-lg bg-oat px-3 py-2">
          <p className="text-[0.65rem] font-black uppercase tracking-wide text-ink/45">Travel</p>
          <p className="mt-1 text-sm font-black text-ink">up to {answers.maxTravelMinutes} min</p>
        </div>
        <div className="rounded-lg bg-oat px-3 py-2">
          <p className="text-[0.65rem] font-black uppercase tracking-wide text-ink/45">Debt</p>
          <p className="mt-1 text-sm font-black text-ink">{debtLabels[answers.debtPreference]}</p>
        </div>
        <div className="rounded-lg bg-oat px-3 py-2">
          <p className="text-[0.65rem] font-black uppercase tracking-wide text-ink/45">Target</p>
          <p className="mt-1 text-sm font-black text-ink">{answers.targetCareer || answers.targetCourse || "not set"}</p>
        </div>
        <div className="rounded-lg bg-oat px-3 py-2 sm:col-span-2">
          <p className="text-[0.65rem] font-black uppercase tracking-wide text-ink/45">Interests and day-to-day</p>
          <p className="mt-1 text-sm font-black leading-5 text-ink">
            {joinItems(answers.interests, "no interests set")} | {joinItems(answers.workStyles, "no styles set")}, earn soon{" "}
            {answers.earnSoon}/5
          </p>
        </div>
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
        <h2 className="mt-1 text-2xl font-black text-ink">Baseline compared with the temporary change</h2>
        <p className="mt-2 text-sm leading-6 text-ink/70">
          Movement shows how the visible top five changed in this demo scoring model. It is a planning prompt, not a prediction.
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
  const catalogue = useCatalogueRoutes();
  const [selectedFactor, setSelectedFactor] = useState<SimulatorFactor>("grades");
  const [scenarioPatch, setScenarioPatch] = useState<SimulatorFactorPatch>({});
  const scenario = useMemo(() => {
    if (!savedAnswers) {
      return null;
    }

    return applySingleSimulatorChange(savedAnswers, selectedFactor, scenarioPatch);
  }, [savedAnswers, scenarioPatch, selectedFactor]);
  const comparison = useMemo(() => {
    if (!savedAnswers || !scenario) {
      return null;
    }

    return buildSimulatorComparison(catalogue.routes, savedAnswers, scenario, 5);
  }, [catalogue.routes, savedAnswers, scenario]);
  const changedFactorCount = savedAnswers && scenario ? countSimulatorChangedFactors(savedAnswers, scenario) : 0;
  const routeTitleById = useMemo(() => new Map(catalogue.routes.map((route) => [route.id, route.title])), [catalogue.routes]);
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
        <h1 className="mt-3 text-3xl font-black leading-tight text-ink sm:text-5xl">Change one thing, then compare the trade-offs.</h1>
        <p className="mt-3 text-base leading-7 text-ink/75">
          This uses your saved quiz as the baseline and applies one temporary change at a time. Scores use the local catalogue when it has
          synced, with the demo fallback visible when needed.
        </p>
        <div className="mt-5">
          <CatalogueStatusStrip freshness={catalogue.freshness} usedFallback={catalogue.usedFallback} />
        </div>
      </section>

      <section className="mx-auto mt-6 grid max-w-5xl gap-4">
        <BaselineNotice answers={savedAnswers} changedCount={changedFactorCount} />
        <FactorPicker
          selectedFactor={selectedFactor}
          onSelect={(factor) => {
            setSelectedFactor(factor);
            setScenarioPatch({});
          }}
        />
        <ScenarioControls
          selectedFactor={selectedFactor}
          scenario={scenario}
          updatePatch={(patch) => setScenarioPatch((current) => ({ ...current, ...patch }))}
          onReset={() => setScenarioPatch({})}
        />
      </section>

      <section className="mx-auto mt-6 grid max-w-5xl gap-4 lg:grid-cols-2">
        <ScenarioSnapshot title="Saved baseline" answers={savedAnswers} tone="baseline" />
        <ScenarioSnapshot title="Temporary changed version" answers={scenario} tone="changed" />
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
          helper="The top five after the one temporary change."
          routes={comparison.changedRoutes}
          changesByRouteId={changesByRouteId}
        />
      </section>
    </AppShell>
  );
}
