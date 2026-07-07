import { AppShell } from "@/components/app-shell";
import { RouteCard } from "@/components/route-card";
import { defaultQuizAnswers } from "@/data/default-answers";
import { mockRoutes } from "@/data/routes/mock-routes";
import { rankRoutes } from "@/lib/scoring";

export default function ResultsPage() {
  const rankedRoutes = rankRoutes(mockRoutes, defaultQuizAnswers, 5);

  return (
    <AppShell>
      <section className="mx-auto max-w-3xl">
        <p className="text-sm font-black uppercase tracking-wide text-leaf">Mock recommendation results</p>
        <h1 className="mt-3 text-3xl font-black leading-tight text-ink sm:text-5xl">Routes to compare from here.</h1>
        <p className="mt-3 text-base leading-7 text-ink/75">
          These are not final answers. They are ranked mock options based on the current prototype
          answers, with confidence and trade-offs shown so the route can be discussed calmly.
        </p>
      </section>

      <section className="mx-auto mt-6 grid max-w-3xl gap-4">
        {rankedRoutes.map((route, index) => (
          <RouteCard key={route.id} route={route} rank={index + 1} />
        ))}
      </section>
    </AppShell>
  );
}
