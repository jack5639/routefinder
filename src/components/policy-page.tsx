import Link from "next/link";
import type { ReactNode } from "react";

export function PolicyPage({ title, summary, children, reviewed = "Founder review required before launch" }: { title: string; summary: string; children: ReactNode; reviewed?: string }) {
  return (
    <main className="min-h-screen bg-oat px-4 py-12 text-ink sm:px-6">
      <article className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-black text-leaf">← Routefinder</Link>
        <p className="mt-12 text-xs font-black uppercase tracking-[0.16em] text-leaf">Policy version 29 July 2026</p>
        <h1 className="mt-3 text-5xl font-black tracking-[-0.04em]">{title}</h1>
        <p className="mt-5 text-lg font-semibold leading-8 text-ink/65">{summary}</p>
        <div className="mt-8 space-y-6 rounded-[2rem] bg-white p-6 font-semibold leading-7 text-ink/70 shadow-sm sm:p-9 [&_h2]:text-2xl [&_h2]:font-black [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc">{children}</div>
        <p className="mt-5 rounded-2xl bg-coral/10 p-4 text-sm font-black">{reviewed}</p>
        <p className="mt-5 text-sm font-semibold text-ink/55">Questions or requests: <a className="font-black text-leaf" href="mailto:support@routefinder.app">support@routefinder.app</a></p>
      </article>
    </main>
  );
}
