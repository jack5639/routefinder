"use client";

import { FormEvent, useEffect, useState } from "react";

type Opportunity = {
  id: string;
  title: string;
  provider_name: string;
  kind: string;
  sector: string;
  location: string;
  summary: string;
  deadline?: string;
  application_url: string;
  source_url: string;
  verified_at?: string;
  freshness: string;
  state: string;
  requirements?: Array<{ id: string; label: string; freshness: string; conflict: boolean }>;
};

export function OpportunitySearch() {
  const [items, setItems] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  async function search(params = "") {
    setLoading(true);
    const response = await fetch(`/api/opportunities${params}`);
    const result = await response.json();
    setItems(result.opportunities ?? []);
    setNotice(result.configured === false ? "The verified catalogue is not connected in this environment." : "");
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void search(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    for (const key of ["q", "sector", "kind", "location"]) {
      const value = String(data.get(key) ?? "");
      if (value) params.set(key, value);
    }
    void search(`?${params}`);
  }

  async function save(id: string) {
    const response = await fetch("/api/portfolio", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ opportunityId: id }) });
    const result = await response.json().catch(() => ({}));
    setNotice(response.ok ? "Saved to your portfolio." : result.error?.message ?? "This could not be saved.");
  }

  return (
    <>
      <form onSubmit={submit} className="grid gap-3 rounded-[2rem] bg-white/80 p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-6">
        <label className="sr-only" htmlFor="search">Search</label>
        <input id="search" name="q" placeholder="Course, role, provider…" className="min-h-12 rounded-2xl border border-ink/10 bg-white px-4 font-semibold lg:col-span-2" />
        <select aria-label="Sector" name="sector" className="min-h-12 rounded-2xl border border-ink/10 bg-white px-4 font-semibold">
          <option value="">Every sector</option><option value="technology">Technology</option><option value="engineering">Engineering</option><option value="business">Business</option><option value="finance">Finance</option>
        </select>
        <select aria-label="Route type" name="kind" className="min-h-12 rounded-2xl border border-ink/10 bg-white px-4 font-semibold">
          <option value="">Both routes</option><option value="university-course">University</option><option value="apprenticeship-vacancy">Apprenticeship</option>
        </select>
        <input aria-label="Location" name="location" placeholder="Location" className="min-h-12 rounded-2xl border border-ink/10 bg-white px-4 font-semibold" />
        <button className="min-h-12 rounded-2xl bg-ink px-5 font-black text-white">Search</button>
      </form>
      {notice && <p role="status" className="mt-5 rounded-2xl bg-sky p-4 font-bold">{notice}</p>}
      {loading ? <p role="status" className="mt-6 rounded-2xl bg-white p-6 font-semibold">Checking published opportunities…</p> : null}
      {!loading && items.length === 0 ? (
        <section className="mt-6 rounded-[2rem] border border-dashed border-ink/20 bg-white/60 p-10 text-center">
          <h2 className="text-2xl font-black">No reviewed opportunities match yet</h2>
          <p className="mx-auto mt-3 max-w-xl font-semibold leading-7 text-ink/60">Coverage is shown honestly. Try broader filters or add an external opportunity to your portfolio as needs checking.</p>
        </section>
      ) : null}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {items.map((item) => {
          const hasConflict = item.requirements?.some((requirement) => requirement.conflict);
          return (
            <article key={item.id} className="flex flex-col rounded-[2rem] border border-ink/8 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap gap-2 text-xs font-black uppercase tracking-wide">
                <span className="rounded-full bg-mint px-3 py-1 capitalize">{item.sector}</span>
                <span className="rounded-full bg-sky px-3 py-1">{item.kind === "university-course" ? "University" : "Apprenticeship"}</span>
                <span className="rounded-full bg-oat px-3 py-1 capitalize">{item.freshness}</span>
              </div>
              <h2 className="mt-4 text-2xl font-black tracking-tight">{item.title}</h2>
              <p className="mt-1 font-bold text-ink/55">{item.provider_name} · {item.location}</p>
              <p className="mt-4 flex-1 text-sm font-semibold leading-6 text-ink/65">{item.summary}</p>
              {(hasConflict || item.freshness === "low" || item.state === "closed") && (
                <p className="mt-4 rounded-xl bg-coral/10 p-3 text-sm font-bold">
                  {item.state === "closed" ? "This opportunity is closed." : hasConflict ? "A published fact needs direct confirmation." : "Some information may be stale."}
                </p>
              )}
              <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div><dt className="font-black">Verified</dt><dd className="font-semibold text-ink/55">{item.verified_at ? new Date(item.verified_at).toLocaleDateString("en-GB") : "Needs checking"}</dd></div>
                <div><dt className="font-black">Deadline</dt><dd className="font-semibold text-ink/55">{item.deadline ? new Date(item.deadline).toLocaleDateString("en-GB") : "Check directly"}</dd></div>
              </dl>
              <div className="mt-5 flex flex-wrap gap-2">
                <button onClick={() => void save(item.id)} className="min-h-11 rounded-full bg-ink px-5 text-sm font-black text-white">Save</button>
                <a href={item.application_url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-full border border-ink/15 px-5 text-sm font-black">Official page ↗</a>
                <a href={item.source_url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center px-3 text-sm font-bold text-leaf">Source</a>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
