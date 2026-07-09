"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { CatalogueStatusStrip } from "@/components/catalogue-status-strip";
import { RouteCard } from "@/components/route-card";
import { clearRouteFeedbackState, toggleStoredRouteFeedbackAction } from "@/lib/route-feedback-storage";
import { buildDecisionBoardWithFeedback, getRouteFeedbackActionLabel, getRouteFeedbackCount } from "@/lib/scoring";
import { useCatalogueRoutes } from "@/lib/use-catalogue-routes";
import { useRouteFeedback } from "@/lib/use-route-feedback";
import { useSavedQuizAnswers } from "@/lib/use-saved-quiz-answers";
import type { DecisionBoardCategoryId, GradeBand, RouteFeedbackActionId } from "@/types";

const gradeLabels: Record<GradeBand, string> = {
  "needs-building": "building up",
  steady: "steady",
  strong: "strong",
  high: "high",
};

const categoryStyles: Record<DecisionBoardCategoryId, { lane: string; badge: string; marker: string }> = {
  "strong-fit": {
    lane: "bg-mint/80",
    badge: "bg-leaf text-white",
    marker: "bg-leaf",
  },
  realistic: {
    lane: "bg-sky/85",
    badge: "bg-ink text-white",
    marker: "bg-sky",
  },
  stretch: {
    lane: "bg-[#ffe0d8]",
    badge: "bg-coral text-white",
    marker: "bg-coral",
  },
  "safer-backup": {
    lane: "bg-oat",
    badge: "bg-white text-ink",
    marker: "bg-ink",
  },
  "worth-exploring": {
    lane: "bg-white/70",
    badge: "bg-mint text-ink",
    marker: "bg-mint",
  },
};

function EmptyResults() {
  return (
    <AppShell>
      <section className="mx-auto max-w-3xl rounded-lg border border-ink/10 bg-white p-5 shadow-soft">
        <p className="text-sm font-black uppercase tracking-wide text-leaf">No saved quiz yet</p>
        <h1 className="mt-3 text-3xl font-black leading-tight text-ink sm:text-5xl">Start with your answers.</h1>
        <p className="mt-3 text-base leading-7 text-ink/75">
          The decision board uses the quiz saved on this device. Complete the quiz first, then this page can compare routes using your
          stage, interests, travel needs, work style, and constraints.
        </p>
        <Link
          href="/quiz"
          className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-black text-white transition hover:bg-leaf sm:w-auto"
        >
          Start the quiz
        </Link>
      </section>
    </AppShell>
  );
}

export default function ResultsPage() {
  const answers = useSavedQuizAnswers();
  const catalogue = useCatalogueRoutes();
  const feedbackState = useRouteFeedback();
  const [feedbackMessage, setFeedbackMessage] = useState("");

  const decisionBoard = useMemo(() => {
    if (!answers) {
      return [];
    }

    return buildDecisionBoardWithFeedback(catalogue.routes, answers, feedbackState);
  }, [answers, catalogue.routes, feedbackState]);
  const feedbackCount = getRouteFeedbackCount(feedbackState);

  function handleFeedbackAction(routeId: string, actionId: RouteFeedbackActionId) {
    toggleStoredRouteFeedbackAction(routeId, actionId);
    setFeedbackMessage(`${getRouteFeedbackActionLabel(actionId)} saved. The board has been reweighted on this device.`);
  }

  function handleClearFeedback() {
    clearRouteFeedbackState();
    setFeedbackMessage("Feedback cleared. The board is back to the saved quiz answers.");
  }

  if (!answers) {
    return <EmptyResults />;
  }

  return (
    <AppShell>
      <section className="mx-auto max-w-3xl">
        <p className="text-sm font-black uppercase tracking-wide text-leaf">Your decision board</p>
        <h1 className="mt-3 text-3xl font-black leading-tight text-ink sm:text-5xl">
          Compare possible routes with calm next steps.
        </h1>
        <p className="mt-3 text-base leading-7 text-ink/75">
          These categories are comparison aids, not final answers. They use your saved quiz answers to make fit, feasibility, constraints,
<<<<<<< HEAD
          and confidence easier to talk through. Real data is used when the local catalogue has synced; otherwise the demo fallback remains
          visible.
=======
          and confidence easier to talk through. Route recommendations use mock demo data until real source-backed data is added.
>>>>>>> 99fa54b10813d37fd4180e1178ad6a253b04bc42
        </p>

        <div className="mt-5">
          <CatalogueStatusStrip freshness={catalogue.freshness} usedFallback={catalogue.usedFallback} />
        </div>

        {catalogue.isLoading ? (
          <p className="mt-3 rounded-lg bg-white/80 px-3 py-2 text-sm font-black text-ink/65" aria-live="polite">
            Checking local catalogue freshness...
          </p>
        ) : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-white/85 p-3">
            <p className="text-[0.65rem] font-black uppercase text-ink/45">Stage</p>
            <p className="mt-1 font-black text-ink">{answers.currentStage}</p>
          </div>
          <div className="rounded-lg bg-white/85 p-3">
            <p className="text-[0.65rem] font-black uppercase text-ink/45">Grades</p>
            <p className="mt-1 font-black text-ink">{gradeLabels[answers.predictedGrades]}</p>
          </div>
          <div className="rounded-lg bg-white/85 p-3">
            <p className="text-[0.65rem] font-black uppercase text-ink/45">Travel</p>
            <p className="mt-1 font-black text-ink">Up to {answers.maxTravelMinutes} min</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {answers.interests.slice(0, 4).map((interest) => (
            <span key={interest} className="rounded-full bg-white px-3 py-2 text-xs font-black text-ink/65">
              {interest}
            </span>
          ))}
        </div>

        <Link
          href="/quiz"
          className="mt-5 inline-flex w-full items-center justify-center rounded-full border border-ink/15 bg-white px-5 py-3 text-sm font-black text-ink transition hover:bg-mint sm:w-auto"
        >
          Update quiz answers
        </Link>

        <div className="mt-5 rounded-lg border border-ink/10 bg-white/85 p-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-ink/45">Feedback and reranking</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-ink/72">
            Route feedback is saved locally and nudges the order on this device. It is a comparison preference, not a claim that one route
            is the right answer.
          </p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-black text-ink">
              {feedbackCount
                ? `${feedbackCount} route${feedbackCount === 1 ? "" : "s"} with active feedback.`
                : "No active feedback yet."}
            </p>
            {feedbackCount ? (
              <button
                type="button"
                onClick={handleClearFeedback}
                className="inline-flex min-h-10 items-center justify-center rounded-full border border-ink/15 bg-white px-4 py-2 text-xs font-black text-ink transition hover:bg-[#ffe0d8]"
              >
                Clear feedback
              </button>
            ) : null}
          </div>
          {feedbackMessage ? (
            <p className="mt-3 rounded-lg bg-mint px-3 py-2 text-sm font-black text-ink" aria-live="polite">
              {feedbackMessage}
            </p>
          ) : null}
        </div>
      </section>

      <section className="mx-auto mt-6 grid max-w-5xl gap-5">
        {decisionBoard.map((group) => (
          <section key={group.id} className={`rounded-lg p-3 sm:p-4 ${categoryStyles[group.id].lane}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-3">
                <div className={`mt-1 h-10 w-2 rounded-full ${categoryStyles[group.id].marker}`} />
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-ink/45">Decision category</p>
                  <h2 className="mt-1 text-2xl font-black text-ink">{group.title}</h2>
                  <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-ink/70">{group.summary}</p>
                </div>
              </div>
              <span className={`inline-flex w-fit rounded-full px-3 py-2 text-xs font-black ${categoryStyles[group.id].badge}`}>
                {group.routes.length} route{group.routes.length === 1 ? "" : "s"}
              </span>
            </div>

            {group.routes.length ? (
              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                {group.routes.map((route) => (
                  <RouteCard
                    key={route.id}
                    feedbackEntry={feedbackState.entries[route.id] ?? null}
                    onFeedbackAction={handleFeedbackAction}
                    route={route}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-lg border border-dashed border-ink/15 bg-white/60 p-4 text-sm font-semibold leading-6 text-ink/65">
                No route landed here from the current answers. That can change when grades, travel, targets, or constraints change.
              </div>
            )}
          </section>
        ))}
      </section>
    </AppShell>
  );
}
