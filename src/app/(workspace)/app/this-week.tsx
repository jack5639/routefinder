"use client";

import { FormEvent, useEffect, useState } from "react";

type Task = {
  id: string;
  title: string;
  why_it_matters: string;
  effort_minutes: number;
  due_date?: string;
  status: string;
  portfolio_items?: { external_title?: string; opportunities?: { title: string; provider_name: string } | Array<{ title: string; provider_name: string }> };
  requirements?: { label: string; hard_requirement: boolean };
};

export function ThisWeek() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [message, setMessage] = useState("");
  const [completingTask, setCompletingTask] = useState<Task | null>(null);
  async function load() {
    const response = await fetch("/api/tasks");
    const result = await response.json();
    setTasks(result.tasks ?? []);
    if (!response.ok) setMessage(result.error?.message ?? "This week is temporarily unavailable.");
  }
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"), whyItMatters: form.get("why"), effortMinutes: Number(form.get("effort")), dueDate: form.get("dueDate") || undefined,
      }),
    });
    const result = await response.json().catch(() => ({}));
    setMessage(response.ok ? "Action scheduled." : result.error?.message ?? "The action could not be scheduled.");
    if (response.ok) { event.currentTarget.reset(); await load(); }
  }
  async function update(task: Task, status: "completed" | "deferred", reflection?: string) {
    const response = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, reflection }),
    });
    setMessage(response.ok ? (status === "completed" ? "Action completed. Your next priorities can now change." : "Action deferred.") : "The action could not be updated.");
    if (response.ok) { setCompletingTask(null); await load(); }
  }
  async function refreshPlan() {
    const response = await fetch("/api/tasks/refresh", { method: "POST" });
    const result = await response.json().catch(() => ({}));
    setMessage(response.ok ? "This week was refreshed from current deadlines and gaps." : result.error?.message ?? "This week could not be refreshed.");
    if (response.ok) await load();
  }
  return (
    <>
      {message && <p role="status" className="mb-5 rounded-2xl bg-sky p-4 font-bold">{message}</p>}
      <div className="grid gap-4 lg:grid-cols-3">
        {tasks.map((task, index) => (
          <article key={task.id} className="rounded-[2rem] bg-white p-6 shadow-sm">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-sm font-black text-white">{index + 1}</span>
            <h2 className="mt-5 text-2xl font-black">{task.title}</h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-ink/60">{task.why_it_matters}</p>
            {task.portfolio_items ? <p className="mt-4 rounded-xl bg-oat p-3 text-sm font-bold text-ink/65">For: {Array.isArray(task.portfolio_items.opportunities) ? task.portfolio_items.opportunities[0]?.title : task.portfolio_items.opportunities?.title ?? task.portfolio_items.external_title ?? "Saved opportunity"}{!Array.isArray(task.portfolio_items.opportunities) && task.portfolio_items.opportunities?.provider_name ? ` · ${task.portfolio_items.opportunities.provider_name}` : ""}</p> : null}
            {task.requirements ? <p className="mt-2 text-xs font-bold text-ink/55">Requirement: {task.requirements.label}{task.requirements.hard_requirement ? " · hard requirement" : ""}</p> : null}
            <p className="mt-5 text-xs font-black uppercase tracking-wide text-leaf">{task.effort_minutes} min{task.due_date ? ` · Due ${new Date(task.due_date).toLocaleDateString("en-GB")}` : ""}</p>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setCompletingTask(task)} className="rounded-full bg-leaf px-4 py-2 text-sm font-black text-white">Complete</button>
              <button onClick={() => void update(task, "deferred")} className="rounded-full border border-ink/12 px-4 py-2 text-sm font-black">Defer</button>
            </div>
          </article>
        ))}
      </div>
      {completingTask ? <form role="dialog" aria-modal="true" aria-labelledby="complete-action-title" onSubmit={(event) => { event.preventDefault(); const reflection = String(new FormData(event.currentTarget).get("reflection") ?? "").trim() || undefined; void update(completingTask, "completed", reflection); }} className="mt-5 rounded-[2rem] border-2 border-leaf/30 bg-white p-6 shadow-soft">
        <h2 id="complete-action-title" className="text-xl font-black">Complete “{completingTask.title}”</h2>
        <label htmlFor="task-reflection" className="mt-4 block font-black">Optional reflection</label>
        <textarea id="task-reflection" name="reflection" maxLength={1000} autoFocus rows={3} className="mt-2 w-full rounded-2xl border border-ink/15 p-4 font-semibold" placeholder="What changed or what did you learn?" />
        <div className="mt-4 flex flex-wrap gap-2"><button className="min-h-11 rounded-full bg-leaf px-5 text-sm font-black text-white">Mark complete</button><button type="button" onClick={() => setCompletingTask(null)} className="min-h-11 rounded-full border border-ink/15 px-5 text-sm font-black">Cancel</button></div>
      </form> : null}
      {tasks.length === 0 && <div className="rounded-[2rem] border border-dashed border-ink/20 bg-white/60 p-10 text-center"><p className="font-semibold text-ink/60">No actions are scheduled yet. Build a deterministic plan from your current deadlines and gaps.</p><button onClick={() => void refreshPlan()} className="mt-4 min-h-12 rounded-full bg-leaf px-6 font-black text-white">Build this week</button></div>}
      {tasks.length > 0 && <button onClick={() => void refreshPlan()} className="mt-5 min-h-11 rounded-full border border-ink/15 bg-white px-5 text-sm font-black">Refresh from current gaps</button>}
      <form onSubmit={add} className="mt-7 grid gap-3 rounded-[2rem] bg-ink p-5 text-white sm:grid-cols-[1.2fr_1.5fr_0.5fr_0.7fr_auto] sm:p-7">
        <input required minLength={3} name="title" placeholder="Next action" className="min-h-12 rounded-2xl bg-white px-4 font-semibold text-ink" />
        <input required minLength={5} name="why" placeholder="Why this matters" className="min-h-12 rounded-2xl bg-white px-4 font-semibold text-ink" />
        <input required min="5" max="1440" type="number" name="effort" placeholder="Minutes" className="min-h-12 rounded-2xl bg-white px-4 font-semibold text-ink" />
        <input type="date" name="dueDate" className="min-h-12 rounded-2xl bg-white px-4 font-semibold text-ink" />
        <button className="min-h-12 rounded-2xl bg-mint px-5 font-black text-ink">Schedule</button>
      </form>
    </>
  );
}
