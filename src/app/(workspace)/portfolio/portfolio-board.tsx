"use client";

import { FormEvent, useEffect, useState } from "react";

type View = {
  state: string;
  reasons: string[];
  risks: string[];
  missingInformation: string[];
  evaluatedPreferences: string[];
  unassessedPreferences: string[];
  directCheckAction: string;
};
type Item = {
  id: string;
  title: string;
  providerName?: string;
  externalUrl?: string;
  needsChecking: boolean;
  savedStatus?: { code: string; message: string; doNotApply: boolean };
  assessment: null | {
    eligibility: View;
    fit: View;
    readiness: View;
    informationConfidence: View;
    portfolioRole: View;
  };
  requirements: Array<{ id: string; label: string; hardRequirement: boolean; supportingText: string; sourceUrl: string }>;
  graph: Array<{
    requirement: { id: string; label: string; hardRequirement: boolean; supportingText: string; sourceUrl: string; verifiedAt?: string; freshness: string; conflict: boolean; publicationState: string };
    state: string;
    missingDetail: string[];
    action: { title: string; whyItMatters: string; effortMinutes: number; dueDate?: string };
    links: Array<{ id: string; relevance: string; coverage: string; missingSpecificity?: string; confirmedByStudent: boolean; assessmentVersion: number; evidence: { evidenceType: string; happened: string; outcome: string; archived: boolean } }>;
  }>;
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
                <p className="text-xs font-black uppercase tracking-[0.14em] text-leaf">{item.savedStatus?.code === "external" ? "External · needs checking" : item.needsChecking ? "Saved reviewed record · needs checking" : "Reviewed catalogue"}</p>
                <h2 className="mt-2 text-2xl font-black">{item.title}</h2>
                {item.providerName && <p className="mt-1 font-semibold text-ink/55">{item.providerName}</p>}
              </div>
              <button onClick={() => void remove(item.id)} className="self-start rounded-full px-4 py-2 text-sm font-black text-ink/50 hover:bg-coral/10">Remove</button>
            </div>
            {item.needsChecking ? (
              <div className={`mt-5 rounded-2xl p-5 ${item.savedStatus?.doNotApply ? "border-2 border-coral/30 bg-coral/10" : "bg-oat"}`}>
                <p className="font-black">{item.savedStatus?.doNotApply ? "Do not rely on this saved record to apply." : "No requirements have been inferred."}</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-ink/60">{item.savedStatus?.message ?? "Open the official page and confirm requirements, dates, and application destination directly."}</p>
                {item.externalUrl && <a href={item.externalUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 items-center font-black text-leaf underline">Check the current source ↗</a>}
              </div>
            ) : null}
            {item.assessment ? (
              <div className="mt-5 grid gap-3 md:grid-cols-5">
                {viewLabels.map(([key, label]) => {
                  const view = item.assessment?.[key];
                  if (!view) return null;
                  return (
                    <section key={key} className="rounded-2xl border border-ink/8 bg-oat/55 p-4">
                      <h3 className="text-xs font-black uppercase tracking-wide text-ink/50">{label}</h3>
                      <p className="mt-2 font-black capitalize text-leaf">{readable(view.state)}</p>
                      <p className="mt-2 text-xs font-semibold leading-5 text-ink/60">{view.reasons[0] ?? view.risks[0] ?? view.missingInformation[0] ?? view.directCheckAction}</p>
                      {key === "fit" && view.unassessedPreferences.length > 0 ? <p className="mt-2 rounded-lg bg-coral/10 p-2 text-xs font-black leading-5 text-ink/75">Limited view: {view.evaluatedPreferences.length} preference areas assessed; {view.unassessedPreferences.length} not assessed yet.</p> : null}
                      {(view.evaluatedPreferences.length > 0 || view.unassessedPreferences.length > 0 || view.risks.length > 0 || view.missingInformation.length > 0) && (
                        <details className="mt-3 text-xs font-semibold leading-5 text-ink/60">
                          <summary className="cursor-pointer font-black text-leaf focus:outline-none focus:ring-4 focus:ring-leaf/20">View assessment details</summary>
                          <div className="mt-2 space-y-2">
                            {view.evaluatedPreferences.length > 0 && <section><p className="font-black text-ink/75">Assessed</p><ul className="list-disc space-y-1 pl-4">{view.evaluatedPreferences.map((detail) => <li key={detail}>{detail}</li>)}</ul></section>}
                            {view.unassessedPreferences.length > 0 && <section><p className="font-black text-ink/75">Not assessed yet</p><ul className="list-disc space-y-1 pl-4">{view.unassessedPreferences.map((detail) => <li key={detail}>{detail}</li>)}</ul></section>}
                            {view.risks.length > 0 && <section><p className="font-black text-ink/75">Checks to make</p><ul className="list-disc space-y-1 pl-4">{view.risks.map((detail) => <li key={detail}>{detail}</li>)}</ul></section>}
                            {view.missingInformation.length > 0 && <section><p className="font-black text-ink/75">Missing information</p><ul className="list-disc space-y-1 pl-4">{view.missingInformation.map((detail) => <li key={detail}>{detail}</li>)}</ul></section>}
                            <p>{view.directCheckAction}</p>
                          </div>
                        </details>
                      )}
                    </section>
                  );
                })}
              </div>
            ) : null}
            {item.graph?.length > 0 && (
              <section className="mt-5" aria-labelledby={`gap-map-${item.id}`}>
                <h3 id={`gap-map-${item.id}`} className="text-lg font-black">Requirement-to-evidence gap map</h3>
                <p className="mt-1 text-sm font-semibold text-ink/60">Each requirement shows your linked evidence, what is missing, and one useful next action.</p>
                <div className="mt-4 space-y-4">
                  {item.graph.map((node) => (
                    <section key={node.requirement.id} className="rounded-2xl border border-ink/10 bg-oat p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2"><div><h4 className="font-black">{node.requirement.label}</h4><p className="mt-1 text-xs font-bold uppercase tracking-wide text-ink/55">{node.state.replaceAll("-", " ")} · {node.requirement.hardRequirement ? "Hard requirement" : "Evidence requirement"}</p></div><span className="rounded-full bg-white px-3 py-1 text-xs font-black">{node.requirement.freshness}{node.requirement.conflict ? " · conflict" : ""}</span></div>
                      <p className="mt-3 text-sm font-semibold leading-6 text-ink/65">{node.requirement.supportingText}</p>
                      <p className="mt-2 text-xs font-bold text-ink/55">{node.requirement.verifiedAt ? `Verified ${new Date(node.requirement.verifiedAt).toLocaleDateString("en-GB")}` : "Verification date unavailable"} · <a href={node.requirement.sourceUrl} target="_blank" rel="noreferrer" className="text-leaf underline">Check source ↗</a></p>
                      <div className="mt-4 space-y-3 border-l-2 border-leaf/30 pl-4" aria-label="Linked evidence">
                        {node.links.length === 0 ? <p className="text-sm font-bold text-ink/60">No linked evidence yet.</p> : node.links.map((link) => <article key={link.id} className={`rounded-xl bg-white p-3 text-sm ${link.evidence.archived ? "opacity-60" : ""}`}><p className="font-black">{link.evidence.evidenceType}: {link.evidence.happened}</p><p className="mt-1 font-semibold text-ink/60">{link.relevance}</p><p className="mt-2 text-xs font-black uppercase tracking-wide text-leaf">{link.coverage.replaceAll("-", " ")} · {link.confirmedByStudent ? "Student confirmed" : "Needs student confirmation"} · v{link.assessmentVersion}{link.evidence.archived ? " · archived" : ""}</p>{link.missingSpecificity && <p className="mt-2 rounded-lg bg-oat p-2 font-semibold text-ink/65">Missing detail: {link.missingSpecificity}</p>}</article>)}
                      </div>
                      {node.missingDetail.length > 0 && <p className="mt-3 text-sm font-semibold text-ink/65">Missing detail: {node.missingDetail.join(" · ")}</p>}
                      <aside className="mt-4 rounded-xl bg-mint p-3"><p className="font-black">Next useful action: {node.action.title}</p><p className="mt-1 text-sm font-semibold text-ink/65">{node.action.whyItMatters}</p><p className="mt-2 text-xs font-black uppercase tracking-wide text-leaf">{node.action.effortMinutes} min{node.action.dueDate ? ` · Due ${new Date(node.action.dueDate).toLocaleDateString("en-GB")}` : ""}</p></aside>
                    </section>
                  ))}
                </div>
              </section>
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
