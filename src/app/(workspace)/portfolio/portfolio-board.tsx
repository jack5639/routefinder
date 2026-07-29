"use client";

import { FormEvent, useEffect, useState } from "react";

type View = { state: string; reasons: string[]; risks: string[]; missingInformation: string[]; directCheckAction: string };
type Item = {
  id: string;
  title: string;
  providerName?: string;
  externalUrl?: string;
  needsChecking: boolean;
  assessment: null | {
    eligibility: View;
    fit: View;
    readiness: View;
    informationConfidence: View;
    portfolioRole: View;
  };
  requirements: Array<{ id: string; label: string; hardRequirement: boolean; supportingText: string; sourceUrl: string }>;
};

const viewLabels: Array<[keyof NonNullable<Item["assessment"]>, string]> = [
  ["eligibility", "Eligibility"],
  ["fit", "Fit"],
  ["readiness", "Application readiness"],
  ["informationConfidence", "Information confidence"],
  ["portfolioRole", "Portfolio role"],
];

function readable(value: string) {
  return value.replaceAll("-", " ");
}

export function PortfolioBoard() {
  const [items, setItems] = useState<Item[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    const response = await fetch("/api/portfolio/assessments");
    const result = await response.json();
    setItems(result.items ?? []);
    if (!response.ok) setMessage(result.error?.message ?? "Your portfolio is temporarily unavailable.");
  }
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function addExternal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ externalTitle: form.get("title"), externalUrl: form.get("url") }),
    });
    const result = await response.json().catch(() => ({}));
    setMessage(response.ok ? "External opportunity saved as needs checking." : result.error?.message ?? "This link could not be saved.");
    if (response.ok) { event.currentTarget.reset(); await load(); }
  }

  async function remove(id: string) {
    const response = await fetch(`/api/portfolio/${id}`, { method: "DELETE" });
    setMessage(response.ok ? "Opportunity removed." : "The opportunity could not be removed.");
    if (response.ok) await load();
  }

  return (
    <>
      {message && <p role="status" className="mb-5 rounded-2xl bg-sky p-4 font-bold">{message}</p>}
      {items.length === 0 && (
        <section className="rounded-[2rem] border border-dashed border-ink/20 bg-white/60 p-10 text-center">
          <h2 className="text-2xl font-black">Your comparison is empty</h2>
          <p className="mt-3 font-semibold text-ink/60">Save reviewed opportunities to see five separate decision views.</p>
        </section>
      )}
      <div className="space-y-5">
        {items.map((item) => (
          <article key={item.id} className="rounded-[2rem] bg-white p-5 shadow-sm sm:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-leaf">{item.needsChecking ? "External · needs checking" : "Reviewed catalogue"}</p>
                <h2 className="mt-2 text-2xl font-black">{item.title}</h2>
                {item.providerName && <p className="mt-1 font-semibold text-ink/55">{item.providerName}</p>}
              </div>
              <button onClick={() => void remove(item.id)} className="self-start rounded-full px-4 py-2 text-sm font-black text-ink/50 hover:bg-coral/10">Remove</button>
            </div>
            {item.needsChecking ? (
              <div className="mt-5 rounded-2xl bg-oat p-5">
                <p className="font-black">No requirements have been inferred.</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-ink/60">Open the official page and confirm requirements, dates, and application destination directly.</p>
                {item.externalUrl && <a href={item.externalUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex font-black text-leaf">Open external page ↗</a>}
              </div>
            ) : item.assessment ? (
              <div className="mt-5 grid gap-3 md:grid-cols-5">
                {viewLabels.map(([key, label]) => {
                  const view = item.assessment?.[key];
                  if (!view) return null;
                  return (
                    <section key={key} className="rounded-2xl border border-ink/8 bg-oat/55 p-4">
                      <h3 className="text-xs font-black uppercase tracking-wide text-ink/50">{label}</h3>
                      <p className="mt-2 font-black capitalize text-leaf">{readable(view.state)}</p>
                      <p className="mt-2 text-xs font-semibold leading-5 text-ink/60">{view.reasons[0] ?? view.risks[0] ?? view.missingInformation[0] ?? view.directCheckAction}</p>
                    </section>
                  );
                })}
              </div>
            ) : null}
            {item.requirements.length > 0 && (
              <details className="mt-5 rounded-2xl border border-ink/10 p-4">
                <summary className="cursor-pointer font-black">Requirement-to-evidence gap map</summary>
                <div className="mt-4 space-y-3">
                  {item.requirements.map((requirement) => (
                    <div key={requirement.id} className="rounded-xl bg-oat p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-black">{requirement.label}</p>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-black">{requirement.hardRequirement ? "Hard requirement" : "Evidence needed"}</span>
                      </div>
                      <p className="mt-2 text-sm font-semibold leading-6 text-ink/60">{requirement.supportingText}</p>
                      <a href={requirement.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-sm font-black text-leaf">Check source ↗</a>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </article>
        ))}
      </div>
      <form id="external" onSubmit={addExternal} className="mt-8 rounded-[2rem] bg-ink p-5 text-white sm:p-7">
        <h2 className="text-2xl font-black">Add an external opportunity</h2>
        <p className="mt-2 text-sm font-semibold text-white/65">Routefinder stores the link as needs checking and does not infer requirements.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1.5fr_auto]">
          <input name="title" required minLength={2} placeholder="Opportunity name" className="min-h-12 rounded-2xl bg-white px-4 font-semibold text-ink" />
          <input name="url" type="url" required placeholder="https://official-site.example/…" className="min-h-12 rounded-2xl bg-white px-4 font-semibold text-ink" />
          <button className="min-h-12 rounded-2xl bg-mint px-5 font-black text-ink">Save as needs checking</button>
        </div>
      </form>
    </>
  );
}
