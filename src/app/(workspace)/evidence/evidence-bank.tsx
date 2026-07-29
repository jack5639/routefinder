"use client";

import { FormEvent, useEffect, useState } from "react";

type Evidence = {
  id: string;
  evidence_type: string;
  happened: string;
  contribution: string;
  outcome: string;
  learned: string;
  supporting_detail?: string;
  evidence_date?: string;
  archived: boolean;
  evidence_requirement_links?: Array<{ id: string; coverage: string; requirements?: { label: string } }>;
};
type RequirementOption = { id: string; label: string; opportunity: string };

export function EvidenceBank() {
  const [items, setItems] = useState<Evidence[]>([]);
  const [requirements, setRequirements] = useState<RequirementOption[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    const [evidenceResponse, portfolioResponse] = await Promise.all([fetch("/api/evidence"), fetch("/api/portfolio/assessments")]);
    const evidenceResult = await evidenceResponse.json();
    const portfolioResult = await portfolioResponse.json();
    setItems(evidenceResult.items ?? []);
    setRequirements(
      (portfolioResult.items ?? []).flatMap((item: { title: string; requirements: Array<{ id: string; label: string }> }) =>
        item.requirements.map((requirement) => ({ id: requirement.id, label: requirement.label, opportunity: item.title })),
      ),
    );
  }
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/evidence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        evidenceType: form.get("evidenceType"),
        happened: form.get("happened"),
        contribution: form.get("contribution"),
        outcome: form.get("outcome"),
        learned: form.get("learned"),
        supportingDetail: String(form.get("supportingDetail") ?? ""),
        evidenceDate: String(form.get("evidenceDate") ?? ""),
      }),
    });
    const result = await response.json().catch(() => ({}));
    setMessage(response.ok ? "Evidence saved." : result.error?.message ?? "Evidence could not be saved.");
    if (response.ok) { event.currentTarget.reset(); await load(); }
  }

  async function link(event: FormEvent<HTMLFormElement>, evidenceId: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/evidence-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        evidenceId,
        requirementId: form.get("requirementId"),
        relevance: form.get("relevance"),
        coverage: form.get("coverage"),
        confirmedByStudent: true,
      }),
    });
    const result = await response.json().catch(() => ({}));
    setMessage(response.ok ? "Gap map updated." : result.error?.message ?? "The evidence could not be linked.");
    if (response.ok) await load();
  }

  async function change(id: string, method: "archive" | "delete") {
    const response = await fetch(`/api/evidence/${id}`, method === "delete"
      ? { method: "DELETE" }
      : { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ archived: true }) });
    setMessage(response.ok ? (method === "delete" ? "Evidence deleted and links safely removed." : "Evidence archived.") : "The evidence item could not be changed.");
    if (response.ok) await load();
  }
  async function updateEvidence(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/evidence/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        evidenceType: form.get("evidenceType"),
        happened: form.get("happened"),
        contribution: form.get("contribution"),
        outcome: form.get("outcome"),
        learned: form.get("learned"),
        supportingDetail: String(form.get("supportingDetail") ?? ""),
        evidenceDate: String(form.get("evidenceDate") ?? ""),
      }),
    });
    setMessage(response.ok ? "Evidence updated; linked readiness will be recalculated." : "The evidence item could not be updated.");
    if (response.ok) await load();
  }
  async function unlink(linkId: string) {
    const response = await fetch(`/api/evidence-links/${linkId}`, { method: "DELETE" });
    setMessage(response.ok ? "Evidence link removed; readiness will be recalculated." : "The evidence link could not be removed.");
    if (response.ok) await load();
  }

  const input = "mt-2 min-h-12 w-full rounded-2xl border border-ink/12 bg-white px-4 py-3 font-semibold";
  return (
    <>
      {message && <p role="status" className="mb-5 rounded-2xl bg-sky p-4 font-bold">{message}</p>}
      <form onSubmit={add} className="grid gap-5 rounded-[2rem] bg-white p-5 shadow-sm sm:grid-cols-2 sm:p-7">
        <label className="font-black">Evidence type<input required name="evidenceType" placeholder="Project, work experience, responsibility…" className={input} /></label>
        <label className="font-black">Date (optional)<input type="date" name="evidenceDate" className={input} /></label>
        <label className="font-black sm:col-span-2">What happened?<textarea required minLength={10} rows={3} name="happened" className={input} /></label>
        <label className="font-black">Your contribution<textarea required minLength={10} rows={4} name="contribution" className={input} /></label>
        <label className="font-black">Result or outcome<textarea required minLength={2} rows={4} name="outcome" className={input} /></label>
        <label className="font-black">What you learned<textarea required minLength={10} rows={4} name="learned" className={input} /></label>
        <label className="font-black">Supporting detail (optional)<textarea rows={4} name="supportingDetail" className={input} /></label>
        <div className="sm:col-span-2">
          <button className="min-h-12 rounded-full bg-ink px-6 font-black text-white">Save genuine evidence</button>
          <p className="mt-3 text-sm font-semibold text-ink/50">Routefinder stores and maps your work. It does not invent evidence or create submission-ready writing.</p>
        </div>
      </form>

      <div className="mt-7 grid gap-4 lg:grid-cols-2">
        {items.map((item) => (
          <article key={item.id} className={`rounded-[2rem] bg-white p-6 shadow-sm ${item.archived ? "opacity-60" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xs font-black uppercase tracking-wide text-leaf">{item.evidence_type}</p><h2 className="mt-2 text-xl font-black">{item.happened}</h2></div>
              {item.archived && <span className="rounded-full bg-oat px-3 py-1 text-xs font-black">Archived</span>}
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <div><dt className="font-black">Your contribution</dt><dd className="mt-1 font-semibold leading-6 text-ink/60">{item.contribution}</dd></div>
              <div><dt className="font-black">Outcome</dt><dd className="mt-1 font-semibold leading-6 text-ink/60">{item.outcome}</dd></div>
              <div><dt className="font-black">Learning</dt><dd className="mt-1 font-semibold leading-6 text-ink/60">{item.learned}</dd></div>
            </dl>
            {(item.evidence_requirement_links ?? []).map((link) => (
              <div key={link.id} className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-mint p-3 text-sm font-bold">
                <span>{link.requirements?.label} · {link.coverage}</span>
                <button onClick={() => void unlink(link.id)} className="shrink-0 rounded-full bg-white px-3 py-2 text-xs font-black">Unlink</button>
              </div>
            ))}
            {!item.archived && (
              <details className="mt-4 rounded-2xl border border-ink/10 p-4">
                <summary className="cursor-pointer font-black">Edit evidence</summary>
                <form onSubmit={(event) => void updateEvidence(event, item.id)} className="mt-4 grid gap-3">
                  <input required name="evidenceType" defaultValue={item.evidence_type} className="min-h-11 rounded-xl border px-3 font-semibold" aria-label="Evidence type" />
                  <textarea required minLength={10} name="happened" defaultValue={item.happened} className="min-h-20 rounded-xl border p-3 font-semibold" aria-label="What happened" />
                  <textarea required minLength={10} name="contribution" defaultValue={item.contribution} className="min-h-20 rounded-xl border p-3 font-semibold" aria-label="Your contribution" />
                  <textarea required minLength={2} name="outcome" defaultValue={item.outcome} className="min-h-20 rounded-xl border p-3 font-semibold" aria-label="Result or outcome" />
                  <textarea required minLength={10} name="learned" defaultValue={item.learned} className="min-h-20 rounded-xl border p-3 font-semibold" aria-label="What you learned" />
                  <textarea name="supportingDetail" defaultValue={item.supporting_detail ?? ""} className="min-h-20 rounded-xl border p-3 font-semibold" aria-label="Supporting detail" />
                  <input type="date" name="evidenceDate" defaultValue={item.evidence_date ?? ""} className="min-h-11 rounded-xl border px-3 font-semibold" aria-label="Evidence date" />
                  <button className="min-h-11 rounded-full bg-ink px-4 text-sm font-black text-white">Save changes</button>
                </form>
              </details>
            )}
            {!item.archived && requirements.length > 0 && (
              <form onSubmit={(event) => void link(event, item.id)} className="mt-5 space-y-3 rounded-2xl bg-oat p-4">
                <p className="font-black">Map to a requirement</p>
                <select required name="requirementId" className="min-h-11 w-full rounded-xl bg-white px-3 font-semibold">
                  <option value="">Choose requirement</option>
                  {requirements.map((requirement) => <option key={requirement.id} value={requirement.id}>{requirement.opportunity} — {requirement.label}</option>)}
                </select>
                <input required minLength={5} name="relevance" placeholder="Why is this relevant?" className="min-h-11 w-full rounded-xl bg-white px-3 font-semibold" />
                <select name="coverage" className="min-h-11 w-full rounded-xl bg-white px-3 font-semibold">
                  <option value="supported">Supported</option><option value="weak">Weak or incomplete</option><option value="missing">Not evidenced</option><option value="needs-confirmation">Direct confirmation needed</option>
                </select>
                <button className="rounded-full bg-leaf px-4 py-2 text-sm font-black text-white">Update gap map</button>
              </form>
            )}
            <div className="mt-4 flex gap-2">
              {!item.archived && <button onClick={() => void change(item.id, "archive")} className="rounded-full border border-ink/12 px-4 py-2 text-sm font-black">Archive</button>}
              <button onClick={() => void change(item.id, "delete")} className="rounded-full px-4 py-2 text-sm font-black text-coral">Delete</button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
