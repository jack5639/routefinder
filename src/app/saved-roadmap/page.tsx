"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { RouteDataPanel } from "@/components/route-data-panel";
import { ScoreBar } from "@/components/score-bar";
import { mockRoadmaps } from "@/data/roadmaps/mock-roadmaps";
import { mockRoutes } from "@/data/routes/mock-routes";
import { clearSavedRoadmap } from "@/lib/saved-roadmap-storage";
import { scoreRoute } from "@/lib/scoring";
import { useSavedQuizAnswers } from "@/lib/use-saved-quiz-answers";
import { useSavedRoadmap } from "@/lib/use-saved-roadmap";

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

function EmptySavedRoadmap() {
  return (
    <AppShell>
      <section className="mx-auto max-w-3xl rounded-lg border border-ink/10 bg-white p-5 shadow-soft">
        <p className="text-sm font-black uppercase tracking-wide text-leaf">Saved roadmap</p>
        <h1 className="mt-3 text-3xl font-black leading-tight text-ink sm:text-5xl">No roadmap saved on this device yet.</h1>
        <p className="mt-3 text-base leading-7 text-ink/75">
          Open a route from the results page, then save the roadmap that feels most useful to keep following. The app stores one roadmap
          locally for now.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href="/results"
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-black text-white transition hover:bg-leaf"
          >
            Go to results
          </Link>
          <Link
            href="/parent-summary"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-ink/15 bg-white px-5 py-3 text-sm font-black text-ink transition hover:bg-mint"
          >
            Parent summary
          </Link>
          <Link
            href="/quiz"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-ink/15 bg-white px-5 py-3 text-sm font-black text-ink transition hover:bg-mint"
          >
            Update quiz answers
          </Link>
        </div>
      </section>
    </AppShell>
  );
}

export default function SavedRoadmapPage() {
  const savedRoadmap = useSavedRoadmap();
  const answers = useSavedQuizAnswers();
  const [clearMessage, setClearMessage] = useState("");
  const route = savedRoadmap ? mockRoutes.find((item) => item.id === savedRoadmap.routeId) : null;
  const roadmap = savedRoadmap ? mockRoadmaps.find((item) => item.routeId === savedRoadmap.routeId) : null;

  const scored = useMemo(() => {
    if (!route || !answers) {
      return null;
    }

    return scoreRoute(route, answers);
  }, [answers, route]);

  if (!savedRoadmap) {
    return <EmptySavedRoadmap />;
  }

  if (!route || !roadmap) {
    return (
      <AppShell>
        <section className="mx-auto max-w-3xl rounded-lg border border-ink/10 bg-white p-5 shadow-soft">
          <p className="text-sm font-black uppercase tracking-wide text-coral">Saved roadmap</p>
          <h1 className="mt-3 text-3xl font-black leading-tight text-ink sm:text-5xl">This saved route is no longer available.</h1>
          <p className="mt-3 text-base leading-7 text-ink/75">
            The saved route id is still on this device, but the mock route data no longer includes it. Clearing it lets a new roadmap be
            saved.
          </p>
          <button
            type="button"
            onClick={() => {
              clearSavedRoadmap();
              setClearMessage("Saved roadmap cleared.");
            }}
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-black text-white transition hover:bg-leaf sm:w-auto"
          >
            Clear saved roadmap
          </button>
          {clearMessage ? <p className="mt-3 text-sm font-bold text-ink/65">{clearMessage}</p> : null}
        </section>
      </AppShell>
    );
  }

  const savedAtLabel = formatSavedAt(savedRoadmap.savedAt);

  return (
    <AppShell>
      <section className="mx-auto max-w-4xl">
        <p className="text-sm font-black uppercase tracking-wide text-leaf">Saved roadmap</p>
        <h1 className="mt-3 text-3xl font-black leading-tight text-ink sm:text-5xl">{route.title}</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-ink/75">
          This is the one roadmap currently saved on this device. It can be replaced from any route roadmap page.
        </p>
        <div className="mt-4 rounded-lg border border-ink/10 bg-mint px-4 py-3 text-sm font-black leading-6 text-ink">
          Saved locally{savedAtLabel ? ` at ${savedAtLabel}` : ""}.
        </div>
      </section>

      <section className="mx-auto mt-6 grid max-w-4xl gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <article className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft sm:p-5">
          <p className="text-xs font-black uppercase tracking-wide text-leaf">{route.type}</p>
          <h2 className="mt-2 text-2xl font-black leading-tight text-ink">{roadmap.heading}</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-ink/70">{roadmap.overview}</p>

          <div className="mt-4 space-y-3">
            <div className="rounded-lg bg-oat px-4 py-3">
              <p className="text-xs font-black uppercase text-ink/45">Next useful step</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-ink/75">{roadmap.steps[0]?.detail ?? route.nextSteps[0]}</p>
            </div>
            <div className="rounded-lg bg-oat px-4 py-3">
              <p className="text-xs font-black uppercase text-ink/45">Backup routes to keep visible</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-ink/75">{route.backupOptions.join(", ")}</p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href={`/roadmap/${route.id}`}
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-black text-white transition hover:bg-leaf"
            >
              Open saved roadmap
            </Link>
            <Link
              href="/simulator"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-ink/15 bg-white px-5 py-3 text-sm font-black text-ink transition hover:bg-mint"
            >
              Test what-if
            </Link>
            <Link
              href="/parent-summary"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-ink/15 bg-white px-5 py-3 text-sm font-black text-ink transition hover:bg-mint"
            >
              Parent summary
            </Link>
            <Link
              href="/results"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-ink/15 bg-white px-5 py-3 text-sm font-black text-ink transition hover:bg-mint"
            >
              Compare routes
            </Link>
          </div>
        </article>

        <aside className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft sm:p-5">
          <p className="text-xs font-black uppercase tracking-wide text-leaf">Saved profile fit</p>
          {scored ? (
            <div className="mt-4 space-y-3">
              <ScoreBar label="Fit" value={scored.scores.fit} />
              <ScoreBar label="Feasibility" value={scored.scores.feasibility} />
              <ScoreBar label="Constraints" value={scored.scores.constraint} />
              <ScoreBar label="Confidence" value={scored.scores.confidence} />
              <p className="rounded-lg bg-mint px-3 py-2 text-sm font-semibold leading-6 text-ink/75">
                Scores update from the quiz answers saved on this device.
              </p>
            </div>
          ) : (
            <div className="mt-3 rounded-lg bg-oat p-3 text-sm leading-6 text-ink/70">
              Complete the quiz to see saved profile scores here.
              <Link
                href="/quiz"
                className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-ink px-4 py-3 text-sm font-black text-white transition hover:bg-leaf"
              >
                Complete the quiz
              </Link>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              clearSavedRoadmap();
              setClearMessage("Saved roadmap cleared.");
            }}
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full border border-ink/15 bg-white px-4 py-3 text-sm font-black text-ink transition hover:bg-[#ffe0d8]"
          >
            Clear saved roadmap
          </button>
          {clearMessage ? (
            <p className="mt-3 text-center text-sm font-bold text-ink/65" aria-live="polite">
              {clearMessage}
            </p>
          ) : null}
        </aside>
      </section>

      <section className="mx-auto mt-4 max-w-4xl">
        <RouteDataPanel route={route} />
      </section>
    </AppShell>
  );
}
