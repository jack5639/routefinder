import Link from "next/link";

const steps = [
  ["1", "Complete the readiness check", "Record what is known, what is predicted, and what still needs checking."],
  ["2", "Build a real shortlist", "Save reviewed opportunities without mixing in prototype or demo records."],
  ["3", "Compare five different questions", "Keep eligibility, fit, readiness, confidence, and portfolio role separate."],
  ["4", "Map genuine evidence", "Connect your own projects, responsibilities, and experience to requirements."],
  ["5", "Act this week", "Return to no more than three useful, deadline-aware next actions."],
];
export default function HowItWorksPage() {
  return <main className="min-h-screen bg-oat px-4 py-12 text-ink sm:px-6"><div className="mx-auto max-w-4xl"><Link href="/" className="text-sm font-black text-leaf">← Routefinder</Link><h1 className="mt-12 text-5xl font-black tracking-tight">From uncertainty to the next useful action.</h1><p className="mt-5 max-w-2xl font-semibold leading-7 text-ink/65">Routefinder supports preparation and direct checking. It does not advise you which route to choose or predict application outcomes.</p><div className="mt-10 space-y-4">{steps.map(([number,title,detail]) => <section key={number} className="grid gap-4 rounded-[2rem] bg-white p-6 shadow-sm sm:grid-cols-[auto_1fr]"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink font-black text-white">{number}</span><div><h2 className="text-2xl font-black">{title}</h2><p className="mt-2 font-semibold leading-7 text-ink/60">{detail}</p></div></section>)}</div><Link href="/signin?next=/readiness" className="mt-8 inline-flex min-h-14 items-center rounded-full bg-leaf px-7 font-black text-white">Start free</Link></div></main>;
}
