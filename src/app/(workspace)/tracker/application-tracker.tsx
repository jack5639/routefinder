"use client";

import { FormEvent, useEffect, useState } from "react";

const stages = ["planned", "preparing", "submitted", "online-assessment", "interview", "assessment-centre", "decision", "offer", "declined", "withdrawn"];
type App = { id: string; stage: string; deadline?: string; official_url: string; next_action?: string; note?: string; portfolio_items?: { external_title?: string; opportunities?: { title: string; provider_name: string; state: string } } };
type Portfolio = { id: string; external_title?: string; external_url?: string; opportunities?: { title: string; application_url: string } };

export function ApplicationTracker() {
  const [applications, setApplications] = useState<App[]>([]);
  const [portfolio, setPortfolio] = useState<Portfolio[]>([]);
  const [message, setMessage] = useState("");
  async function load() {
    const [appResponse, portfolioResponse] = await Promise.all([fetch("/api/applications"), fetch("/api/portfolio")]);
    const apps = await appResponse.json(); const saved = await portfolioResponse.json();
    setApplications(apps.applications ?? []); setPortfolio(saved.items ?? []);
  }
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);
  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const item = portfolio.find((candidate) => candidate.id === form.get("portfolioItemId"));
    const response = await fetch("/api/applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      portfolioItemId: form.get("portfolioItemId"), stage: "planned", deadline: form.get("deadline") ? new Date(String(form.get("deadline"))).toISOString() : undefined,
      officialUrl: form.get("officialUrl") || item?.opportunities?.application_url || item?.external_url, nextAction: form.get("nextAction") || undefined,
    }) });
    const result = await response.json().catch(() => ({})); setMessage(response.ok ? "Application added." : result.error?.message ?? "Application could not be added.");
    if (response.ok) { event.currentTarget.reset(); await load(); }
  }
  async function stage(id: string, value: string) {
    const response = await fetch(`/api/applications/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage: value }) });
    setMessage(response.ok ? "Stage updated." : "Stage could not be updated."); if (response.ok) await load();
  }
  async function updateDetails(event: FormEvent<HTMLFormElement>, application: App) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const deadlineValue = String(form.get("deadline") ?? "");
    const response = await fetch(`/api/applications/${application.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deadline: deadlineValue ? new Date(deadlineValue).toISOString() : null,
        officialUrl: form.get("officialUrl"),
        nextAction: String(form.get("nextAction") ?? "") || null,
        note: String(form.get("note") ?? "") || null,
      }),
    });
    const result = await response.json().catch(() => ({}));
    setMessage(response.ok ? "Application details updated." : result.error?.message ?? "Application details could not be updated.");
    if (response.ok) await load();
  }
  return (
    <>
      {message && <p role="status" className="mb-5 rounded-2xl bg-sky p-4 font-bold">{message}</p>}
      <form onSubmit={add} className="grid gap-3 rounded-[2rem] bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4 sm:p-7">
        <label className="font-black">Saved opportunity<select required name="portfolioItemId" className="mt-2 min-h-12 w-full rounded-2xl border border-ink/12 bg-white px-4 font-semibold"><option value="">Choose</option>{portfolio.map((item) => <option key={item.id} value={item.id}>{item.opportunities?.title ?? item.external_title}</option>)}</select></label>
        <label className="font-black">Deadline<input type="datetime-local" name="deadline" className="mt-2 min-h-12 w-full rounded-2xl border border-ink/12 px-4 font-semibold" /></label>
        <label className="font-black">Official destination<input required type="url" name="officialUrl" placeholder="https://…" className="mt-2 min-h-12 w-full rounded-2xl border border-ink/12 px-4 font-semibold" /></label>
        <label className="font-black">Next action<input name="nextAction" placeholder="What happens next?" className="mt-2 min-h-12 w-full rounded-2xl border border-ink/12 px-4 font-semibold" /></label>
        <button className="min-h-12 rounded-full bg-ink px-6 font-black text-white lg:col-span-4 lg:justify-self-start">Track application</button>
      </form>
      <div className="mt-7 grid gap-4 lg:grid-cols-2">
        {applications.map((application) => {
          const title = application.portfolio_items?.opportunities?.title ?? application.portfolio_items?.external_title ?? "Application";
          const overdue = application.deadline && new Date(application.deadline) < new Date() && !["submitted", "decision", "offer", "declined", "withdrawn"].includes(application.stage);
          return (
            <article key={application.id} className="rounded-[2rem] bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-leaf">Application</p><h2 className="mt-2 text-2xl font-black">{title}</h2></div>{overdue && <span className="rounded-full bg-coral/15 px-3 py-1 text-xs font-black">Deadline passed</span>}</div>
              {application.portfolio_items?.opportunities?.state === "closed" && <p className="mt-4 rounded-xl bg-coral/10 p-3 text-sm font-bold">The source opportunity is recorded as closed. Check directly.</p>}
              <label className="mt-5 block text-sm font-black">Current stage<select value={application.stage} onChange={(event) => void stage(application.id, event.target.value)} className="mt-2 min-h-12 w-full rounded-2xl border border-ink/12 bg-white px-4 font-semibold capitalize">{stages.map((value) => <option key={value} value={value}>{value.replaceAll("-", " ")}</option>)}</select></label>
              <div className="mt-5 flex items-center justify-between gap-3 text-sm"><span className="font-bold text-ink/55">{application.deadline ? new Date(application.deadline).toLocaleString("en-GB") : "No deadline recorded"}</span><a href={application.official_url} target="_blank" rel="noreferrer" className="font-black text-leaf">Official destination ↗</a></div>
              <details className="mt-4 rounded-2xl border border-ink/10 p-4">
                <summary className="cursor-pointer font-black">Edit deadline, next action, and note</summary>
                <form onSubmit={(event) => void updateDetails(event, application)} className="mt-4 grid gap-3">
                  <label className="text-sm font-black">Deadline<input type="datetime-local" name="deadline" defaultValue={application.deadline ? new Date(application.deadline).toISOString().slice(0, 16) : ""} className="mt-2 min-h-11 w-full rounded-xl border px-3 font-semibold" /></label>
                  <label className="text-sm font-black">Official destination<input required type="url" name="officialUrl" defaultValue={application.official_url} className="mt-2 min-h-11 w-full rounded-xl border px-3 font-semibold" /></label>
                  <label className="text-sm font-black">Next action<textarea name="nextAction" defaultValue={application.next_action ?? ""} className="mt-2 min-h-20 w-full rounded-xl border p-3 font-semibold" /></label>
                  <label className="text-sm font-black">Concise note<textarea name="note" defaultValue={application.note ?? ""} className="mt-2 min-h-20 w-full rounded-xl border p-3 font-semibold" /></label>
                  <button className="min-h-11 rounded-full bg-ink px-4 text-sm font-black text-white">Save application details</button>
                </form>
              </details>
            </article>
          );
        })}
      </div>
    </>
  );
}
