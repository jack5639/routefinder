"use client";

import { FormEvent, useEffect, useState } from "react";

type Opportunity = { id: string; title: string; provider_name: string; source_authority: string; publication_state: string; freshness: string; verified_at?: string; requirements: Array<{ id: string; label: string; conflict: boolean; publication_state: string }>; catalogue_fact_revisions?: Array<{ id: string; status: string; field_changes: Record<string, unknown> }> };
type SourceRun = { id: string; source_authority: string; status: string; retrieved_count: number; started_at: string; error_code?: string };

export function ReviewConsole() {
  const [items, setItems] = useState<Opportunity[]>([]);
  const [runs, setRuns] = useState<SourceRun[]>([]);
  const [message, setMessage] = useState("");
  async function load() {
    const response = await fetch("/api/admin/catalogue"); const result = await response.json();
    setItems(result.opportunities ?? []); setRuns(result.runs ?? []); if (!response.ok) setMessage(result.error?.message ?? "Admin catalogue unavailable.");
  }
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);
  async function sync(source: string) {
    setMessage(`Syncing ${source}…`);
    const response = await fetch(`/api/admin/catalogue/sync?source=${source}`, { method: "POST" }); const result = await response.json().catch(() => ({}));
    setMessage(response.ok ? `${source} source run completed.` : result.error?.message ?? "Source run failed."); await load();
  }
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/catalogue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      kind: form.get("kind"), sector: form.get("sector"), title: form.get("title"), providerName: form.get("providerName"), location: form.get("location"), summary: form.get("summary"), applicationUrl: form.get("applicationUrl"), sourceUrl: form.get("sourceUrl"),
    }) }); const result = await response.json().catch(() => ({})); setMessage(response.ok ? "Manual draft created." : result.error?.message ?? "Draft could not be created."); if (response.ok) { event.currentTarget.reset(); await load(); }
  }
  async function review(id: string, decision: string) {
    const response = await fetch("/api/admin/catalogue/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ opportunityId: id, decision }) }); const result = await response.json().catch(() => ({}));
    setMessage(response.ok ? `Opportunity moved to ${decision}.` : result.error?.message ?? "Review failed."); await load();
  }
  async function resolveRevision(revisionId: string, action: string) {
    const response = await fetch("/api/admin/catalogue/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revisionId, action, note: "Reviewed in catalogue console." }) });
    const result = await response.json().catch(() => ({})); setMessage(response.ok ? "Pending source revision resolved." : result.error?.message ?? "Revision could not be resolved."); await load();
  }
  async function verify(event: FormEvent<HTMLFormElement>, opportunityId: string) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/catalogue/facts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      action: "verify-opportunity", opportunityId, state: form.get("state"), freshness: form.get("freshness"),
    }) }); const result = await response.json().catch(() => ({})); setMessage(response.ok ? "Opportunity verified." : result.error?.message ?? "Verification failed."); await load();
  }
  async function addRequirement(event: FormEvent<HTMLFormElement>, opportunityId: string) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/catalogue/facts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      action: "add-requirement", opportunityId, kind: form.get("kind"), label: form.get("label"), supportingText: form.get("supportingText"), sourceUrl: form.get("sourceUrl"),
      hardRequirement: form.get("hardRequirement") === "on", qualificationType: form.get("qualificationType") || undefined, subject: form.get("subject") || undefined, minimumGrade: form.get("minimumGrade") || undefined,
    }) }); const result = await response.json().catch(() => ({})); setMessage(response.ok ? "Verified requirement added." : result.error?.message ?? "Requirement failed."); if (response.ok) event.currentTarget.reset(); await load();
  }
  return <>
    {message && <p role="status" className="mb-5 rounded-2xl bg-sky p-4 font-bold">{message}</p>}
    <div className="flex flex-wrap gap-3"><button onClick={() => void sync("apprenticeships")} className="rounded-full bg-ink px-5 py-3 font-black text-white">Sync official apprenticeships</button><button onClick={() => void sync("discover-uni")} className="rounded-full border border-ink/15 bg-white px-5 py-3 font-black">Verify Discover Uni archive</button></div>
    <section className="mt-6 rounded-[2rem] bg-white p-6"><h2 className="text-2xl font-black">Recent source runs</h2><div className="mt-4 space-y-2">{runs.map((run) => <p key={run.id} className="rounded-xl bg-oat p-3 text-sm font-bold">{run.source_authority} · {run.status} · {run.retrieved_count} records {run.error_code ? `· ${run.error_code}` : ""}</p>)}</div></section>
    <form onSubmit={create} className="mt-6 grid gap-3 rounded-[2rem] bg-white p-6 sm:grid-cols-2">
      <h2 className="text-2xl font-black sm:col-span-2">Manual reviewed-source draft</h2>
      <select name="kind" className="min-h-12 rounded-xl border px-3"><option value="university-course">University course</option><option value="apprenticeship-vacancy">Apprenticeship</option></select>
      <select name="sector" className="min-h-12 rounded-xl border px-3"><option>technology</option><option>engineering</option><option>business</option><option>finance</option></select>
      <input required name="title" placeholder="Title" className="min-h-12 rounded-xl border px-3" /><input required name="providerName" placeholder="Provider or employer" className="min-h-12 rounded-xl border px-3" />
      <input required name="location" placeholder="Location" className="min-h-12 rounded-xl border px-3" /><textarea required minLength={10} name="summary" placeholder="Source-backed summary" className="min-h-24 rounded-xl border p-3" />
      <input required type="url" name="applicationUrl" placeholder="Official application URL" className="min-h-12 rounded-xl border px-3" /><input required type="url" name="sourceUrl" placeholder="Source URL" className="min-h-12 rounded-xl border px-3" />
      <button className="min-h-12 rounded-full bg-leaf px-5 font-black text-white sm:col-span-2 sm:justify-self-start">Create draft</button>
    </form>
    <div className="mt-6 space-y-3">{items.map((item) => <article key={item.id} className="rounded-[2rem] bg-white p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-black uppercase tracking-wide text-leaf">{item.source_authority} · {item.publication_state}</p><h2 className="mt-2 text-xl font-black">{item.title}</h2><p className="font-semibold text-ink/55">{item.provider_name} · {item.freshness} · {item.requirements.length} requirements</p></div><div className="flex flex-wrap gap-2"><button onClick={() => void review(item.id, "review")} className="rounded-full border px-4 py-2 text-sm font-black">Send to review</button><button onClick={() => void review(item.id, "published")} className="rounded-full bg-leaf px-4 py-2 text-sm font-black text-white">Publish</button><button onClick={() => void review(item.id, "withdrawn")} className="rounded-full bg-coral/10 px-4 py-2 text-sm font-black">Withdraw</button></div></div>
      {(item.catalogue_fact_revisions ?? []).filter((revision) => revision.status === "pending").map((revision) => <div key={revision.id} className="mt-3 rounded-xl bg-coral/10 p-3 text-sm"><p className="font-bold">Source change awaiting review: {Object.keys(revision.field_changes).join(", ")}</p><div className="mt-2 flex gap-2"><button onClick={() => void resolveRevision(revision.id, "accept")} className="rounded-full bg-leaf px-3 py-1 font-bold text-white">Accept source</button><button onClick={() => void resolveRevision(revision.id, "reject")} className="rounded-full border px-3 py-1 font-bold">Keep reviewed fact</button><button onClick={() => void resolveRevision(revision.id, "withdraw")} className="rounded-full border px-3 py-1 font-bold">Withdraw revision</button></div></div>)}
      <details className="mt-4 rounded-2xl bg-oat p-4"><summary className="cursor-pointer font-black">Verify facts and requirements</summary>
        <form onSubmit={(event) => void verify(event, item.id)} className="mt-4 flex flex-wrap gap-2"><select name="state" className="min-h-11 rounded-xl bg-white px-3"><option>open</option><option>closed</option><option>unknown</option></select><select name="freshness" className="min-h-11 rounded-xl bg-white px-3"><option>high</option><option>medium</option><option>low</option><option>needs-checking</option></select><button className="rounded-full bg-ink px-4 text-sm font-black text-white">Mark verified now</button></form>
        <form onSubmit={(event) => void addRequirement(event, item.id)} className="mt-4 grid gap-2 sm:grid-cols-2"><select name="kind" className="min-h-11 rounded-xl bg-white px-3"><option>qualification</option><option>subject</option><option>grade</option><option>experience</option><option>skill</option><option>application-stage</option><option>other</option></select><input required minLength={3} name="label" placeholder="Requirement label" className="min-h-11 rounded-xl bg-white px-3" /><input name="qualificationType" placeholder="Qualification type (optional)" className="min-h-11 rounded-xl bg-white px-3" /><input name="subject" placeholder="Subject (optional)" className="min-h-11 rounded-xl bg-white px-3" /><input name="minimumGrade" placeholder="Minimum grade (optional)" className="min-h-11 rounded-xl bg-white px-3" /><input required type="url" name="sourceUrl" placeholder="Requirement source URL" className="min-h-11 rounded-xl bg-white px-3" /><textarea required minLength={5} name="supportingText" placeholder="Supporting source text" className="min-h-20 rounded-xl bg-white p-3 sm:col-span-2" /><label className="flex items-center gap-2 font-bold"><input type="checkbox" name="hardRequirement" /> Deterministic hard requirement</label><button className="min-h-11 rounded-full bg-leaf px-4 text-sm font-black text-white">Add reviewed requirement</button></form>
      </details>
    </article>)}</div>
  </>;
}
