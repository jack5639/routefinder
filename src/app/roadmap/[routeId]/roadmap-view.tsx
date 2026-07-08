"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { RouteDataPanel } from "@/components/route-data-panel";
import { ScoreBar } from "@/components/score-bar";
import { saveSavedRoadmap } from "@/lib/saved-roadmap-storage";
import { scoreRoute } from "@/lib/scoring";
import { useSavedQuizAnswers } from "@/lib/use-saved-quiz-answers";
import { useSavedRoadmap } from "@/lib/use-saved-roadmap";
import type { QuizAnswers, RoadmapStep, RoadmapTemplate, RouteOption, ScoredRoute } from "@/types";

type PlanSectionId = "week" | "month" | "before" | "unlock" | "backup";

type PlanStep = {
  title: string;
  detail: string;
  note?: string;
};

type PlanSection = {
  id: PlanSectionId;
  title: string;
  summary: string;
  steps: PlanStep[];
};

const gradeLabels: Record<QuizAnswers["predictedGrades"], string> = {
  "needs-building": "building up",
  steady: "steady",
  strong: "strong",
  high: "high",
};

const gradeRank: Record<QuizAnswers["predictedGrades"], number> = {
  "needs-building": 1,
  steady: 2,
  strong: 3,
  high: 4,
};

const debtLabels: Record<QuizAnswers["debtPreference"], string> = {
  open: "open to costs",
  "some-concern": "cost-aware",
  avoid: "debt-averse",
};

const sectionStyles: Record<PlanSectionId, { marker: string; label: string; tint: string }> = {
  week: {
    marker: "bg-leaf text-white",
    label: "text-leaf",
    tint: "bg-mint/70",
  },
  month: {
    marker: "bg-ink text-white",
    label: "text-ink",
    tint: "bg-sky/70",
  },
  before: {
    marker: "bg-coral text-white",
    label: "text-coral",
    tint: "bg-[#ffe0d8]",
  },
  unlock: {
    marker: "bg-mint text-ink",
    label: "text-leaf",
    tint: "bg-white",
  },
  backup: {
    marker: "bg-oat text-ink",
    label: "text-ink",
    tint: "bg-oat",
  },
};

const fallbackRoadmapStep: RoadmapStep = {
  title: "Pick one concrete next step",
  timeframe: "This week",
  detail: "Choose one route question, provider, project, or conversation to move from idea to evidence.",
};

function joinShortList(items: string[], fallback: string) {
  const cleanItems = items.map((item) => item.trim()).filter(Boolean).slice(0, 3);

  if (!cleanItems.length) {
    return fallback;
  }

  if (cleanItems.length === 1) {
    return cleanItems[0];
  }

  if (cleanItems.length === 2) {
    return `${cleanItems[0]} and ${cleanItems[1]}`;
  }

  return `${cleanItems[0]}, ${cleanItems[1]}, and ${cleanItems[2]}`;
}

function findTemplateStep(roadmap: RoadmapTemplate, keywords: string[], fallbackIndex: number) {
  return (
    roadmap.steps.find((step) => {
      const searchableText = `${step.title} ${step.timeframe}`.toLowerCase();
      return keywords.some((keyword) => searchableText.includes(keyword));
    }) ??
    roadmap.steps[fallbackIndex] ??
    fallbackRoadmapStep
  );
}

function getFocusLabel(answers: QuizAnswers | null, route: RouteOption) {
  if (answers?.targetCareer && answers.targetCourse) {
    return `${answers.targetCareer} and ${answers.targetCourse}`;
  }

  if (answers?.targetCareer) {
    return answers.targetCareer;
  }

  if (answers?.targetCourse) {
    return answers.targetCourse;
  }

  return joinShortList(answers?.interests ?? route.relatedInterests, route.title.toLowerCase());
}

function buildUnlockSteps(route: RouteOption, scored: ScoredRoute | null, answers: QuizAnswers | null): PlanStep[] {
  const steps: PlanStep[] = [];

  if (!answers) {
    steps.push({
      title: "Add a quiz profile",
      detail:
        "Completing the quiz could personalise this plan with grade, travel, cost, target, and constraint checks saved on this device.",
    });
  }

  if (scored?.explanation.missingInfo.length) {
    const missingDetail = scored.explanation.missingInfo[0].replace(/\.$/, "").toLowerCase();
    steps.push({
      title: "Fill one missing detail",
      detail: `The comparison is less specific because ${missingDetail}. Updating the quiz could make route scores and next steps sharper.`,
    });
  }

  if (answers) {
    const lowestPreferredGrade = Math.min(...route.preferredGrades.map((grade) => gradeRank[grade]));

    if (gradeRank[answers.predictedGrades] < lowestPreferredGrade) {
      steps.push({
        title: "Check bridge or support routes",
        detail:
          "A foundation year, Access course, subject booster, or provider conversation could make grade-constrained options easier to compare.",
      });
    }

    if (answers.maxTravelMinutes < route.maxTypicalTravelMinutes) {
      steps.push({
        title: "Test a wider travel version",
        detail: `This route often needs around ${route.maxTypicalTravelMinutes} minutes of travel. Trying a wider radius in the simulator could show whether more options appear.`,
      });
    }

    if (answers.debtPreference !== "open" && route.debtLevel !== "low") {
      steps.push({
        title: "Make the cost picture clearer",
        detail:
          "Comparing fees, travel, bursaries, paid work, and local alternatives could make this route easier to judge alongside lower-debt options.",
      });
    }
  }

  if (
    route.type.includes("apprenticeship") ||
    route.type === "Portfolio/project route" ||
    route.constraintsSupported.includes("needs evidence of work")
  ) {
    steps.push({
      title: "Add one evidence piece",
      detail:
        "A small project, placement note, certificate, portfolio piece, or example from work could make applications and provider conversations more concrete.",
    });
  }

  if (steps.length < 2) {
    steps.push({
      title: "Ask one comparison question",
      detail:
        "A tutor, adviser, provider, employer, or open day chat could help compare entry requirements, support, workload, and progression.",
    });
  }

  return steps.slice(0, 4);
}

function buildPlanSections(
  route: RouteOption,
  roadmap: RoadmapTemplate,
  scored: ScoredRoute | null,
  answers: QuizAnswers | null,
): PlanSection[] {
  // Custom roadmap generation can replace this template assembly later.
  const weekStep = findTemplateStep(roadmap, ["this week", "next week", "next 2 weeks"], 0);
  const monthStep = findTemplateStep(roadmap, ["this month", "4 weeks", "6 weeks", "this term"], 1);
  const beforeStep = findTemplateStep(roadmap, ["before", "applications", "applying", "enrolment", "final choices"], 2);
  const focusLabel = getFocusLabel(answers, route);
  const nextSteps = scored?.explanation.nextSteps ?? route.nextSteps;
  const watchOuts = scored?.explanation.watchOuts ?? route.risks;
  const backupOptions = scored?.explanation.backupOptions ?? route.backupOptions;

  return [
    {
      id: "week",
      title: "This week",
      summary: "Start with one small proof point and one clear note about why this route is worth exploring.",
      steps: [
        {
          title: weekStep.title,
          detail: weekStep.detail,
          note: weekStep.timeframe,
        },
        {
          title: "Make one profile note",
          detail: answers
            ? `Write a short note linking ${focusLabel} with ${joinShortList(
                answers.interests,
                "your current interests",
              )}. It can become an application example, portfolio note, or question for a provider.`
            : "Complete the quiz when ready so this plan can reflect stage, interests, travel, cost, and work style.",
        },
      ],
    },
    {
      id: "month",
      title: "This month",
      summary: "Turn the route into a short comparison list with requirements, support, travel, cost, and deadlines.",
      steps: [
        {
          title: monthStep.title,
          detail: monthStep.detail,
          note: monthStep.timeframe,
        },
        {
          title: "Compare 3 to 5 real versions",
          detail: answers?.location
            ? `Look around ${answers.location} first, then compare anything just outside a ${answers.maxTravelMinutes}-minute travel limit if it seems worth checking.`
            : "Compare local and reachable providers or employers, then note any gaps in entry requirements, support, deadlines, or travel.",
        },
        {
          title: "Keep the main trade-off visible",
          detail: watchOuts[0] ?? "Note the biggest uncertainty early so it can become a question rather than background stress.",
        },
      ],
    },
    {
      id: "before",
      title: "Before applying",
      summary: "Prepare useful evidence and make the route safer to judge before deadlines arrive.",
      steps: [
        {
          title: beforeStep.title,
          detail: beforeStep.detail,
          note: beforeStep.timeframe,
        },
        {
          title: "Draft evidence examples",
          detail:
            nextSteps[2] ??
            "Draft examples for learning something new, solving a problem, working with others, and responding to feedback.",
        },
        {
          title: "Check requirements directly",
          detail:
            nextSteps[1] ??
            "Check grade, subject, portfolio, assessment, interview, travel, and finance requirements with the provider or employer.",
        },
      ],
    },
    {
      id: "unlock",
      title: "What could unlock more options",
      summary: "These are not guarantees, just practical levers that could make more routes easier to compare.",
      steps: buildUnlockSteps(route, scored, answers),
    },
    {
      id: "backup",
      title: "Backup plan",
      summary: "Keep one alternative warm so this route does not have to carry all the pressure.",
      steps: [
        {
          title: "Choose one active backup",
          detail: `Compare ${joinShortList(
            backupOptions,
            "one alternative route",
          )} alongside this plan, with the same checks for requirements, support, travel, and cost.`,
        },
        {
          title: "Set a review point",
          detail:
            "After a provider conversation, mock result, application deadline, or work experience update, revisit the decision board and simulator.",
        },
      ],
    },
  ];
}

function formatSavedAt(savedAt: string) {
  const savedDate = new Date(savedAt);

  if (Number.isNaN(savedDate.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(savedDate);
}

function ProfileChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ink/10 bg-white/85 p-3 shadow-sm">
      <p className="text-[0.65rem] font-black uppercase text-ink/45">{label}</p>
      <p className="mt-1 text-sm font-black leading-5 text-ink">{value}</p>
    </div>
  );
}

export function RoadmapView({ route, roadmap }: { route: RouteOption; roadmap: RoadmapTemplate }) {
  const answers = useSavedQuizAnswers();
  const savedRoadmap = useSavedRoadmap();
  const [saveMessage, setSaveMessage] = useState("");

  const scored = useMemo(() => {
    if (!answers) {
      return null;
    }

    return scoreRoute(route, answers);
  }, [answers, route]);

  const planSections = useMemo(() => buildPlanSections(route, roadmap, scored, answers), [answers, roadmap, route, scored]);
  const isSaved = savedRoadmap?.routeId === route.id;
  const savedAtLabel = isSaved ? formatSavedAt(savedRoadmap.savedAt) : "";
  const saveHint = isSaved
    ? `Saved on this device${savedAtLabel ? ` at ${savedAtLabel}` : ""}.`
    : savedRoadmap
      ? "Saving this roadmap will replace the roadmap currently saved on this device."
      : "Save one roadmap locally so it is easy to return to after a refresh.";

  function handleSaveRoadmap() {
    const saved = saveSavedRoadmap(route.id);

    if (!saved) {
      return;
    }

    const timestamp = formatSavedAt(saved.savedAt);

    setSaveMessage(
      savedRoadmap && savedRoadmap.routeId !== route.id
        ? `Saved. This replaced the previous saved roadmap${timestamp ? ` at ${timestamp}` : ""}.`
        : `Saved on this device${timestamp ? ` at ${timestamp}` : ""}.`,
    );
  }

  return (
    <AppShell>
      <section className="mx-auto max-w-4xl">
        <p className="text-sm font-black uppercase tracking-wide text-leaf">Personal action plan</p>
        <h1 className="mt-3 text-3xl font-black leading-tight text-ink sm:text-5xl">{roadmap.heading}</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-ink/75">
          {roadmap.overview} The steps below use the saved quiz profile on this device where possible, and they stay cautious about
          outcomes.
        </p>

        <div className="mt-4 rounded-lg border border-ink/10 bg-sky/70 px-4 py-3 text-sm font-semibold leading-6 text-ink/75">
          <span className="font-black text-ink">Template roadmap: </span>
          This plan is built from demo templates until custom roadmap generation is added.
          {!answers ? " Opening a route directly still works; completing the quiz makes the checks more personal." : null}
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <button
            type="button"
            onClick={handleSaveRoadmap}
            disabled={isSaved}
            className={`inline-flex min-h-12 items-center justify-center rounded-full px-5 py-3 text-sm font-black transition sm:w-auto ${
              isSaved ? "cursor-default bg-leaf text-white" : "bg-ink text-white hover:bg-leaf"
            }`}
          >
            {isSaved ? "Saved on this device" : savedRoadmap ? "Replace saved roadmap" : "Save roadmap"}
          </button>
          <Link
            href="/saved-roadmap"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-ink/15 bg-white px-5 py-3 text-sm font-black text-ink transition hover:bg-mint sm:w-auto"
          >
            View saved roadmap
          </Link>
          <Link
            href="/parent-summary"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-ink/15 bg-white px-5 py-3 text-sm font-black text-ink transition hover:bg-mint sm:w-auto"
          >
            Parent summary
          </Link>
          <Link
            href="/results"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-ink/15 bg-white px-5 py-3 text-sm font-black text-ink/75 transition hover:bg-mint sm:w-auto"
          >
            Back to results
          </Link>
        </div>

        <div className="mt-3 rounded-lg border border-ink/10 bg-white/85 px-4 py-3 text-sm font-semibold leading-6 text-ink/70">
          <span className="font-black text-ink">Save status: </span>
          <span aria-live="polite">{saveMessage || saveHint}</span>
        </div>
      </section>

      <section className="mx-auto mt-6 max-w-4xl">
        <RouteDataPanel route={route} />
      </section>

      <section className="mx-auto mt-6 grid max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ProfileChip label="Route type" value={route.type} />
        <ProfileChip
          label="Profile"
          value={answers ? `${answers.currentStage}, ${gradeLabels[answers.predictedGrades]} grades` : "Quiz not saved yet"}
        />
        <ProfileChip
          label="Travel"
          value={answers ? `${answers.location || "Local area"}, up to ${answers.maxTravelMinutes} min` : "Add via quiz"}
        />
        <ProfileChip
          label="Money fit"
          value={answers ? `${debtLabels[answers.debtPreference]}, earn soon ${answers.earnSoon}/5` : "Add via quiz"}
        />
      </section>

      <section className="mx-auto mt-4 grid max-w-4xl gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
          <p className="text-xs font-black uppercase tracking-wide text-leaf">Why this route is on the board</p>
          <h2 className="mt-2 text-xl font-black text-ink">{route.title}</h2>
          <p className="mt-2 text-sm leading-6 text-ink/70">{route.summary}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(answers?.constraints.length ? answers.constraints : route.constraintsSupported).slice(0, 4).map((constraint) => (
              <span key={constraint} className="rounded-full bg-mint px-3 py-2 text-xs font-black text-ink/70">
                {constraint}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
          <p className="text-xs font-black uppercase tracking-wide text-leaf">Current scores</p>
          {scored ? (
            <div className="mt-4 space-y-3">
              <ScoreBar label="Fit" value={scored.scores.fit} />
              <ScoreBar label="Feasibility" value={scored.scores.feasibility} />
              <ScoreBar label="Constraints" value={scored.scores.constraint} />
              <ScoreBar label="Confidence" value={scored.scores.confidence} />
              <p className="rounded-lg bg-mint px-3 py-2 text-sm font-semibold leading-6 text-ink/75">
                These scores use the quiz answers saved on this device.
              </p>
            </div>
          ) : (
            <div className="mt-3 rounded-lg bg-oat p-3 text-sm leading-6 text-ink/70">
              Complete the quiz to personalise the scores, travel notes, and unlock ideas for this roadmap.
              <Link
                href="/quiz"
                className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-ink px-4 py-3 text-sm font-black text-white transition hover:bg-leaf"
              >
                Complete the quiz
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto mt-7 max-w-4xl">
        <div className="relative grid gap-4">
          <div className="absolute bottom-8 left-5 top-8 w-1 rounded-full bg-leaf/20 sm:left-7" />
          {planSections.map((section, index) => {
            const styles = sectionStyles[section.id];

            return (
              <section key={section.id} className="relative grid grid-cols-[2.75rem_1fr] gap-3 sm:grid-cols-[3.5rem_1fr]">
                <div className="relative z-10 flex justify-center">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-4 border-[#fbf8ef] text-sm font-black shadow-soft sm:h-12 sm:w-12 ${styles.marker}`}
                  >
                    {index + 1}
                  </div>
                </div>
                <article className={`rounded-lg border border-ink/10 p-4 shadow-soft sm:p-5 ${styles.tint}`}>
                  <p className={`text-xs font-black uppercase tracking-wide ${styles.label}`}>{section.title}</p>
                  <h2 className="mt-2 text-xl font-black leading-tight text-ink">{section.summary}</h2>
                  <div className="mt-4">
                    {section.steps.map((step, stepIndex) => (
                      <div key={`${section.id}-${step.title}`} className={stepIndex === 0 ? "pb-3" : "border-t border-ink/10 py-3"}>
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                          <h3 className="text-base font-black text-ink">{step.title}</h3>
                          {step.note ? <p className="text-xs font-black uppercase text-ink/45">{step.note}</p> : null}
                        </div>
                        <p className="mt-1 text-sm font-semibold leading-6 text-ink/70">{step.detail}</p>
                      </div>
                    ))}
                  </div>
                </article>
              </section>
            );
          })}
        </div>
      </section>

      <section className="mx-auto mt-7 max-w-4xl rounded-lg border border-ink/10 bg-white p-4 shadow-soft sm:p-5">
        <h2 className="text-lg font-black text-ink">Keep comparing calmly</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-ink/70">
          Confidence is a guide to how complete the mock information is, not a promise about outcomes. The simulator can help test grade,
          travel, debt, and earning changes before choosing what to investigate next.
        </p>
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
