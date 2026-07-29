"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="grid min-h-screen place-items-center bg-oat p-6 text-ink"><section className="max-w-lg rounded-[2rem] bg-white p-8 text-center shadow-soft"><p className="text-xs font-black uppercase tracking-wide text-coral">Something went wrong</p><h1 className="mt-3 text-4xl font-black">Your work may still be saved.</h1><p className="mt-4 font-semibold leading-7 text-ink/60">Try this page again. If the problem continues, return to your workspace and contact support without including sensitive application details.</p><button onClick={reset} className="mt-6 min-h-12 rounded-full bg-ink px-6 font-black text-white">Try again</button></section></main>;
}
