import Link from "next/link";

const outcomes = [
  {
    number: "01",
    title: "Know where you stand",
    detail: "See eligibility, fit, readiness, information confidence, and portfolio role separately—never as an acceptance prediction.",
  },
  {
    number: "02",
    title: "See what is missing",
    detail: "Connect your genuine projects, responsibilities, and experience to published opportunity requirements.",
  },
  {
    number: "03",
    title: "Do the next useful thing",
    detail: "Return to three realistic, deadline-aware actions instead of another overwhelming checklist.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(145deg,#fbf8ef,#eef8f1_46%,#dceeff)] text-ink">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <Link href="/" className="inline-flex min-h-11 items-center text-sm font-black uppercase tracking-[0.14em] text-leaf">
          Routefinder
        </Link>
        <nav aria-label="Public navigation" className="flex items-center gap-2">
          <Link href="/pricing" className="hidden rounded-full px-4 py-2 text-sm font-bold text-ink/70 hover:bg-white sm:inline-flex">
            Pricing
          </Link>
          <Link
            href="/signin"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-5 py-2 text-sm font-black text-white transition hover:bg-leaf"
          >
            Sign in
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:min-h-[76vh] lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-20">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.16em] text-leaf">Application readiness for 2027 entry</p>
          <h1 className="mt-5 max-w-4xl text-5xl font-black leading-[0.98] tracking-[-0.05em] text-ink sm:text-7xl">
            See what each application asks for. See what you can evidence. Know what to do this week.
          </h1>
          <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-ink/70">
            Build a balanced shortlist of real university and apprenticeship opportunities, map your genuine evidence to published
            requirements, and turn uncertainty into three useful actions.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/start"
              className="inline-flex min-h-14 items-center justify-center rounded-full bg-ink px-7 py-4 text-base font-black text-white shadow-soft transition hover:bg-leaf"
            >
              Get my free first result
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex min-h-14 items-center justify-center rounded-full border-2 border-ink/10 bg-white/80 px-7 py-4 text-base font-black text-ink transition hover:border-leaf/40 hover:bg-mint"
            >
              See how it works
            </Link>
          </div>
          <p className="mt-4 text-sm font-semibold text-ink/55">For students in England exploring technology, engineering, business, or finance.</p>
          <div className="mt-7 max-w-2xl rounded-2xl border border-white/80 bg-white/65 p-4 text-sm font-semibold leading-6 text-ink/65">
            <p><strong className="text-ink">Example:</strong> “Show mathematical problem-solving” → your own project evidence → <strong>partly supported</strong> → write down the method you used and check it against the provider’s published wording.</p>
          </div>
        </div>

        <aside className="rounded-[2rem] border border-white/80 bg-white/75 p-5 shadow-soft backdrop-blur sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-leaf">Your returning home</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight">This week</h2>
          <div className="mt-5 space-y-3">
            {[
              ["Check one published maths requirement", "20 min · Computer science shortlist"],
              ["Strengthen your project evidence", "35 min · Shared across 3 opportunities"],
              ["Confirm an apprenticeship closing date", "10 min · Worth checking directly"],
            ].map(([title, meta], index) => (
              <div key={title} className="rounded-2xl border border-ink/8 bg-oat/80 p-4">
                <div className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-black text-white">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-black">{title}</p>
                    <p className="mt-1 text-sm font-semibold text-ink/55">{meta}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-5 rounded-xl bg-sky/70 px-4 py-3 text-sm font-semibold leading-6 text-ink/65">
            Routefinder is a preparation aid. Providers and employers make application decisions.
          </p>
        </aside>
      </section>

      <section className="border-y border-ink/8 bg-white/65">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
          {outcomes.map((outcome) => (
            <article key={outcome.number} className="rounded-3xl bg-white p-6 shadow-sm">
              <p className="text-xs font-black tracking-[0.18em] text-coral">{outcome.number}</p>
              <h2 className="mt-3 text-2xl font-black tracking-tight">{outcome.title}</h2>
              <p className="mt-3 text-sm font-semibold leading-6 text-ink/65">{outcome.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
        <p className="text-sm font-black uppercase tracking-[0.14em] text-leaf">A genuine free outcome</p>
        <h2 className="mt-4 text-4xl font-black tracking-tight">Start without committing to a route.</h2>
        <p className="mx-auto mt-4 max-w-2xl text-base font-semibold leading-7 text-ink/65">
          Free includes the readiness check, five active opportunities, ten evidence examples, a basic gap map and tracker, and one weekly
          plan refresh each month.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/start"
            className="inline-flex min-h-14 items-center justify-center rounded-full bg-leaf px-7 py-4 text-base font-black text-white transition hover:bg-ink"
          >
            Get my free first result
          </Link>
          <Link href="/demo" className="inline-flex min-h-14 items-center justify-center rounded-full px-7 py-4 text-sm font-black text-ink/60 hover:bg-white">
            View the clearly labelled prototype
          </Link>
        </div>
      </section>

      <footer className="border-t border-ink/8 px-4 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 text-sm font-semibold text-ink/55 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Routefinder. Student work stays student-owned.</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/privacy" className="inline-flex min-h-11 items-center">Privacy</Link>
            <Link href="/terms" className="inline-flex min-h-11 items-center">Terms</Link>
            <Link href="/safeguarding" className="inline-flex min-h-11 items-center">Safeguarding</Link>
            <Link href="/accessibility" className="inline-flex min-h-11 items-center">Accessibility</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
