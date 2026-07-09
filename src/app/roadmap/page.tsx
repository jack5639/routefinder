"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { useCatalogueRoute } from "@/lib/use-catalogue-routes";
import { useSavedRoadmap } from "@/lib/use-saved-roadmap";

export default function RoadmapLandingPage() {
  const router = useRouter();
  const savedRoadmap = useSavedRoadmap();
  const { route: savedRoute } = useCatalogueRoute(savedRoadmap?.routeId);

  useEffect(() => {
    if (savedRoute) {
      router.replace(`/roadmap/${savedRoute.id}`);
    }
  }, [router, savedRoute]);

  return (
    <AppShell>
      <section className="mx-auto max-w-3xl rounded-lg border border-ink/10 bg-white p-5 shadow-soft">
        <p className="text-sm font-black uppercase tracking-wide text-leaf">Roadmap</p>
        <h1 className="mt-3 text-3xl font-black leading-tight text-ink sm:text-5xl">
          {savedRoute ? "Opening your saved roadmap." : "Choose a route before opening a roadmap."}
        </h1>
        <p className="mt-3 text-base leading-7 text-ink/75">
          Roadmaps are attached to specific route cards so the steps can stay tied to the route type, watch-outs, and backup options. If a
          roadmap is already saved on this device, this page opens it automatically.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {savedRoute ? (
            <Link
              href={`/roadmap/${savedRoute.id}`}
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-black text-white transition hover:bg-leaf"
            >
              Open saved roadmap
            </Link>
          ) : null}
          <Link
            href="/results"
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-black text-white transition hover:bg-leaf"
          >
            Compare routes
          </Link>
          <Link
            href="/saved-roadmap"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-ink/15 bg-white px-5 py-3 text-sm font-black text-ink transition hover:bg-mint"
          >
            View saved roadmap
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
