import Link from "next/link";

const demoNotes = [
  "No account is created in this prototype.",
  "Answers and one saved roadmap stay in this browser.",
  "Route data is clearly labelled with source freshness.",
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(145deg,#fbf8ef,#dceeff_52%,#dff3e8)] px-4 py-5 text-ink sm:px-6">
      <section className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-3xl flex-col justify-center">
        <p className="text-sm font-black uppercase tracking-wide text-leaf">Routefinder demo</p>
        <h1 className="mt-4 text-4xl font-black leading-tight sm:text-6xl">Sign in placeholder</h1>
        <p className="mt-4 max-w-xl text-lg font-semibold leading-8 text-ink/72">
          This screen stands in for onboarding only. For the demo, continue without an account and the quiz will take over the whole screen.
        </p>

        <div className="mt-8 grid gap-3 sm:max-w-md">
          <Link
            href="/quiz"
            className="inline-flex min-h-14 w-full items-center justify-center rounded-lg bg-ink px-5 py-4 text-base font-black text-white shadow-soft transition hover:bg-leaf"
          >
            Continue to quiz
          </Link>
          <Link
            href="/saved-roadmap"
            className="inline-flex min-h-14 w-full items-center justify-center rounded-lg border-2 border-ink/10 bg-white px-5 py-4 text-base font-black text-ink transition hover:border-leaf/50 hover:bg-mint"
          >
            View saved plan
          </Link>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {demoNotes.map((note) => (
            <div key={note} className="rounded-lg border border-ink/10 bg-white/85 p-4 text-sm font-bold leading-6 text-ink/72">
              {note}
            </div>
          ))}
        </div>

        <p className="mt-6 max-w-xl text-sm font-semibold leading-6 text-ink/60">
          The catalogue begins with broad demo route families. Source-backed UCAS, Discover Uni, and apprenticeship matches appear after
          the local data sync runs.
        </p>
      </section>
    </main>
  );
}
