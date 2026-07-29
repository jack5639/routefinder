"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { RouteDataPanel } from "@/components/route-data-panel";
import { clearSavedRoadmap } from "@/lib/saved-roadmap-storage";
import { scoreRoute } from "@/lib/scoring";
import { useCatalogueRoute } from "@/lib/use-catalogue-routes";
import { useSavedQuizAnswers } from "@/lib/use-saved-quiz-answers";
import { useSavedRoadmap } from "@/lib/use-saved-roadmap";
import type { DebtPreference, GeneratedRoadmap, GradeBand, QuizAnswers, ScoredRoute } from "@/types";

const gradeLabels: Record<GradeBand, string> = {
  "needs-building": "building up",
  steady: "steady",
  strong: "strong",
  high: "high",
};

const debtLabels: Record<DebtPreference, string> = {
  open: "open to costs",
  "some-concern": "cost-aware",
  avoid: "prefers to avoid debt where possible",
};

function joinItems(items: string[], fallback: string) {
  const cleanItems = items.map((item) => item.trim()).filter(Boolean);
  return cleanItems.length ? cleanItems.join(", ") : fallback;
}

function summaryLines(title: string, items: string[]) {
  return [title, ...items.map((item) => `- ${item}`)].join("\n");
}

function buildParentSummary(answers: QuizAnswers, scored: ScoredRoute, generatedRoadmap?: GeneratedRoadmap) {
  const profile = summaryLines("Student's current situation", [
    `Current stage: ${answers.currentStage}.`,
    `Predicted grade band: ${gradeLabels[answers.predictedGrades]}.`,
    `Subjects or course areas: ${joinItems(answers.subjects, "not yet detailed")}.`,
    `Interests: ${joinItems(answers.interests, "not yet detailed")}.`,
    `Day-to-day preferences: ${joinItems(answers.workStyles, "not yet detailed")}.`,
    `Target career: ${answers.targetCareer || "not set yet"}.`,
    `Target course: ${answers.targetCourse || "not set yet"}.`,
    `Location and travel: ${answers.location || "local area"}, up to ${answers.maxTravelMinutes} minutes.`,
    `Money preference: ${debtLabels[answers.debtPreference]}; earning soon is ${answers.earnSoon} out of 5.`,
  ]);

  const route = summaryLines("Saved route", [
    `${generatedRoadmap?.headline ?? scored.title} (${scored.type}).`,
    scored.summary,
    `Current comparison: fit ${scored.scores.fit}, eligibility evidence ${scored.scores.eligibility}, readiness ${scored.scores.readiness}, confidence ${scored.scores.confidence}.`,
  ]);

  const why = summaryLines(
    "Why it currently looks worth exploring",
    scored.explanation.whyThisRouteFits.slice(0, 3),
  );
  const watchOuts = summaryLines("Watch-outs to check calmly", scored.explanation.watchOuts.slice(0, 4));
  const nextSteps = summaryLines("Next steps", scored.explanation.nextSteps.slice(0, 4));
  const customRoadmap = generatedRoadmap
    ? summaryLines("Saved custom roadmap", [
        generatedRoadmap.confidenceNote,
        `Next useful action: ${generatedRoadmap.sections[0]?.tasks[0]?.detail ?? "review the saved custom roadmap."}`,
      ])
    : "";
  const caveat = summaryLines("Confidence caveat", [
    "This is a Routefinder summary using saved quiz answers, deterministic scoring, and the local route catalogue where it has synced.",
    "It is useful for a planning conversation, but it is not a promise about offers, jobs, funding, deadlines, or local availability.",
    "The next useful move is to check provider, employer, or official guidance directly before acting.",
  ]);

  return ["Routefinder parent summary", profile, route, why, watchOuts, nextSteps, customRoadmap, caveat]
    .filter(Boolean)
    .join("\n\n");
}

function EmptyState({
  eyebrow,
  title,
  body,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: {
  eyebrow: string;
  title: string;
  body: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <AppShell>
      <section className="mx-auto max-w-3xl rounded-lg border border-ink/10 bg-white p-5 shadow-soft">
        <p className="text-sm font-black uppercase tracking-wide text-leaf">{eyebrow}</p>
        <h1 className="mt-3 text-3xl font-black leading-tight text-ink sm:text-5xl">{title}</h1>
        <p className="mt-3 text-base leading-7 text-ink/75">{body}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href={primaryHref}
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-black text-white transition hover:bg-leaf"
          >
            {primaryLabel}
          </Link>
          {secondaryHref && secondaryLabel ? (
            <Link
              href={secondaryHref}
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-ink/15 bg-white px-5 py-3 text-sm font-black text-ink transition hover:bg-mint"
            >
              {secondaryLabel}
            </Link>
          ) : null}
        </div>
      </section>
    </AppShell>
  );
}

function InfoBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
      <h2 className="text-lg font-black text-ink">{title}</h2>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm font-semibold leading-6 text-ink/72">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

export default function ParentSummaryPage() {
  const answers = useSavedQuizAnswers();
  const savedRoadmap = useSavedRoadmap();
  const catalogue = useCatalogueRoute(savedRoadmap?.routeId);
  const [copyStatus, setCopyStatus] = useState("");
  const route = catalogue.route;
  const scored = useMemo(() => {
    if (!answers || !route) {
      return null;
    }

    return scoreRoute(route, answers);
  }, [answers, route]);
  const summaryText = useMemo(() => {
    if (!answers || !scored) {
      return "";
    }

    return buildParentSummary(answers, scored, savedRoadmap?.generatedRoadmap);
  }, [answers, savedRoadmap?.generatedRoadmap, scored]);

  async function copySummary() {
    if (!summaryText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(summaryText);
      setCopyStatus("Summary copied.");
    } catch {
      setCopyStatus("Copy did not work in this browser. The text is selectable below.");
    }
  }

  if (!answers) {
    return (
      <EmptyState
        eyebrow="Parent summary"
        title="Complete the quiz first."
        body="The parent-friendly summary needs the saved quiz profile so it can describe the student's current situation honestly."
        primaryHref="/quiz"
        primaryLabel="Start the quiz"
        secondaryHref="/saved-roadmap"
        secondaryLabel="View saved roadmap"
      />
    );
  }

  if (!savedRoadmap) {
    return (
      <EmptyState
        eyebrow="Parent summary"
        title="Save one roadmap first."
        body="The summary is based on the route saved on this device. Open a roadmap from results, save it, then this page can turn it into a parent-friendly note."
        primaryHref="/results"
        primaryLabel="Compare routes"
        secondaryHref="/saved-roadmap"
        secondaryLabel="Saved roadmap"
      />
    );
  }

  if (!route || !scored) {
    return (
      <AppShell>
        <section className="mx-auto max-w-3xl rounded-lg border border-ink/10 bg-white p-5 shadow-soft">
          <p className="text-sm font-black uppercase tracking-wide text-coral">Parent summary</p>
          <h1 className="mt-3 text-3xl font-black leading-tight text-ink sm:text-5xl">The saved route is no longer available.</h1>
          <p className="mt-3 text-base leading-7 text-ink/75">
            The saved route id is still in local storage, but the demo route catalogue no longer includes it.
          </p>
          <button
            type="button"
            onClick={() => clearSavedRoadmap()}
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-black text-white transition hover:bg-leaf sm:w-auto"
          >
            Clear saved roadmap
          </button>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="mx-auto max-w-4xl">
        <p className="text-sm font-black uppercase tracking-wide text-leaf">Parent summary</p>
        <h1 className="mt-3 text-3xl font-black leading-tight text-ink sm:text-5xl">
          A calm note for discussing the saved plan.
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-ink/75">
          This summary uses the saved quiz and saved roadmap on this device. It keeps the confidence caveat visible because route data is
          still mock/demo data.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={copySummary}
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-black text-white transition hover:bg-leaf"
          >
            Copy summary
          </button>
          <Link
            href={`/roadmap/${route.id}`}
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-ink/15 bg-white px-5 py-3 text-sm font-black text-ink transition hover:bg-mint"
          >
            Open roadmap
          </Link>
          <Link
            href="/simulator"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-ink/15 bg-white px-5 py-3 text-sm font-black text-ink transition hover:bg-mint"
          >
            Test what-if
          </Link>
        </div>
        {copyStatus ? (
          <p className="mt-3 rounded-lg bg-mint px-4 py-3 text-sm font-black text-ink" aria-live="polite">
            {copyStatus}
          </p>
        ) : null}
      </section>

      <section className="mx-auto mt-6 grid max-w-4xl gap-4 lg:grid-cols-[1fr_0.9fr]">
        <article className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft sm:p-5">
          <p className="text-xs font-black uppercase tracking-wide text-leaf">Copyable text</p>
          <textarea
            readOnly
            value={summaryText}
            className="mt-3 min-h-[30rem] w-full resize-y rounded-lg border-2 border-ink/10 bg-oat p-4 text-sm font-semibold leading-6 text-ink outline-none focus:border-leaf"
            aria-label="Parent-friendly summary text"
          />
        </article>

        <div className="grid gap-4">
          <InfoBlock
            title="Student snapshot"
            items={[
              `${answers.currentStage}, ${gradeLabels[answers.predictedGrades]} grades.`,
              `Interests: ${joinItems(answers.interests, "not yet detailed")}.`,
              `Day-to-day: ${joinItems(answers.workStyles, "not yet detailed")}.`,
              `Travel: ${answers.location || "local area"}, up to ${answers.maxTravelMinutes} minutes.`,
            ]}
          />
          <InfoBlock
            title="Saved route"
            items={[
              `${scored.title} (${scored.type}).`,
              savedRoadmap.generatedRoadmap?.sections[0]?.tasks[0]?.detail ?? scored.explanation.nextSteps[0],
              scored.explanation.whyThisRouteFits[0],
              scored.explanation.watchOuts[0],
            ]}
          />
          <RouteDataPanel route={route} compact />
        </div>
      </section>
    </AppShell>
  );
}
