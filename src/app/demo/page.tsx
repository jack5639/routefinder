import Link from "next/link";

const demoNotes = [
  "No account is created in this prototype.",
  "Answers and one saved roadmap stay in this browser.",
  "All route families are broad demo examples.",
];

export const metadata = {
  title: "Prototype demo",
  robots: { index: false, follow: false },
};

export default function DemoLandingPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(145deg,#fbf8ef,#dceeff_52%,#dff3e8)] px-4 py-5 text-ink sm:px-6">
      <section className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-3xl flex-col justify-center">
        <div className="rounded-full bg-coral/15 px-4 py-2 text-sm font-black text-ink">
          Prototype only — not the customer product
        </div>
        <h1 className="mt-5 text-4xl font-black leading-tight sm:text-6xl">Explore the legacy route comparison.</h1>
        <p className="mt-4 max-w-xl text-lg font-semibold leading-8 text-ink/72">
          This browser-only prototype uses broad demo route families and legacy total scores. It is preserved for compatibility and
          research, not for application decisions.
        </p>

        <div className="mt-8 grid gap-3 sm:max-w-md">
          <Link
            href="/quiz"
            className="inline-flex min-h-14 w-full items-center justify-center rounded-lg bg-ink px-5 py-4 text-base font-black text-white shadow-soft transition hover:bg-leaf"
          >
            Continue to prototype quiz
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-14 w-full items-center justify-center rounded-lg border-2 border-ink/10 bg-white px-5 py-4 text-base font-black text-ink transition hover:border-leaf/50 hover:bg-mint"
          >
            Return to Routefinder
          </Link>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {demoNotes.map((note) => (
            <div key={note} className="rounded-lg border border-ink/10 bg-white/85 p-4 text-sm font-bold leading-6 text-ink/72">
              {note}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
