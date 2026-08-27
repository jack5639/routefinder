"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Requirement = {
  id: string; kind: string; label: string; structured_value?: unknown; supporting_text: string; source_url: string;
  retrieved_at: string; verified_at?: string; freshness: string; conflict: boolean; hard_requirement: boolean; publication_state: string;
};
type Revision = {
  id: string; status: string; field_changes: Record<string, { from?: unknown; to?: unknown }>;
  proposed_fact: Record<string, unknown>; reviewer_id?: string; reviewer_note?: string; reviewed_at?: string;
};
type Review = { id: string; reviewer_id: string; decision: string; note?: string; reviewed_at: string };
type ManualReview = { id: string; requirement_id?: string; action: string; reviewer_id: string; reviewer_note: string; reviewed_at: string };
type Opportunity = {
  id: string; kind: string; sector: string; title: string; provider_name: string; location: string; summary: string;
  deadline?: string; application_cycle?: number; application_url: string; source_url: string; source_authority: string; publication_state: string;
  freshness: string; state: string; verified_at?: string; retrieved_at: string; attribution?: Record<string, string>;
  requirements: Requirement[]; catalogue_fact_revisions: Revision[]; source_issues: Array<{ id: string; status: string; issue_kind: string; detail?: string }>;
  publication_reviews: Review[]; catalogue_manual_revisions: ManualReview[]; readinessFailures: string[];
};
type SourceRun = { id: string; source_authority: string; status: string; retrieved_count: number; records_changed?: number; complete_snapshot?: boolean; started_at: string; completed_at?: string; error_code?: string };
type Pagination = { page: number; pageSize: number; total: number; pages: number };
type Readiness = {
  ready: boolean;
  published: number;
  minimum: number;
  globalReasons: string[];
  distribution: Array<{
    sector: string;
    kind: string;
    count: number;
    shortfall: number;
    candidates: number;
    distinctCandidateProviders: number;
  }>;
  sourceAttestations: Array<{
    id: string;
    source_authority: "find-an-apprenticeship-api-v2" | "discover-uni-hesa";
    permission_basis: string;
    attested_at: string;
  }>;
  promotedPersonaCoverage: Array<{
    id: string;
    label: string;
    relevantOpenSourceBacked: number;
    minimum: number;
    passes: boolean;
  }>;
};

const initialFilters = {
  source: "", kind: "", sector: "", publication: "", freshness: "", state: "", sort: "urgent",
  missingRequirements: false, unclassified: false, pendingRevision: false, sourceIssue: false, missingVerification: false, launchFailure: false,
};

function valueText(value: unknown) {
  if (value === null || value === undefined || value === "") return "Not supplied";
  return typeof value === "string" ? value : JSON.stringify(value);
}

export function ReviewConsole() {
  const [items, setItems] = useState<Opportunity[]>([]);
  const [runs, setRuns] = useState<SourceRun[]>([]);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0, pages: 0 });
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState("");

  const load = useCallback(async (page = 1) => {
    setLoading(true); setFailure("");
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    Object.entries(appliedFilters).forEach(([key, value]) => {
      if (typeof value === "boolean") { if (value) params.set(key, "true"); }
      else if (value) params.set(key, value);
    });
    const [response, readinessResponse] = await Promise.all([
      fetch(`/api/admin/catalogue?${params}`),
      fetch("/api/admin/catalogue/readiness"),
    ]);
    const result = await response.json().catch(() => ({}));
    const readinessResult = await readinessResponse.json().catch(() => null);
    if (!response.ok) setFailure(result.error?.message ?? "Admin catalogue unavailable.");
    else {
      setItems(result.opportunities ?? []);
      setRuns(result.runs ?? []);
      setPagination(result.pagination ?? { page, pageSize: 20, total: 0, pages: 0 });
    }
    if (readinessResponse.ok) setReadiness(readinessResult);
    setLoading(false);
  }, [appliedFilters]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(1), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function mutate(url: string, body: Record<string, unknown>, success: string) {
    setMessage("Saving reviewed decision…");
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json().catch(() => ({}));
    setMessage(response.ok ? success : result.error?.message ?? "The reviewed decision could not be saved.");
    if (response.ok) await load(pagination.page);
    return response.ok;
  }

  async function sync(source: string) {
    setMessage(`Syncing ${source}…`);
    const response = await fetch(`/api/admin/catalogue/sync?source=${source}`, { method: "POST" });
    const result = await response.json().catch(() => ({}));
    setMessage(response.ok ? `${source} source run completed.` : result.error?.message ?? "Source run failed.");
    await load(1);
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const target = event.currentTarget; const form = new FormData(target);
    const ok = await mutate("/api/admin/catalogue", {
      kind: form.get("kind"), sector: form.get("sector"), title: form.get("title"), providerName: form.get("providerName"),
      location: form.get("location"), summary: form.get("summary"), deadline: form.get("deadline") || undefined,
      applicationCycle: form.get("applicationCycle") ? Number(form.get("applicationCycle")) : undefined,
      applicationUrl: form.get("applicationUrl"), sourceUrl: form.get("sourceUrl"),
    }, "Manual source-backed draft created.");
    if (ok) target.reset();
  }

  async function attestSource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const target = event.currentTarget;
    const form = new FormData(target);
    const sourceAuthority = String(form.get("sourceAuthority"));
    const permissionBasis = String(form.get("permissionBasis"));
    const note = String(form.get("note") ?? "").trim();
    if (note.length < 10) { setMessage("Add a short note confirming why this source may be used."); return; }
    const ok = await mutate("/api/admin/catalogue/sources", { sourceAuthority, permissionBasis, note }, "Source permission attestation recorded.");
    if (ok) target.reset();
  }

  function noteFor(key: string) { return notes[key]?.trim() ?? ""; }

  function reviewCell(cell: Readiness["distribution"][number]) {
    const next = {
      ...initialFilters,
      source: cell.kind === "university-course" ? "discover-uni-hesa" : "find-an-apprenticeship-api-v2",
      kind: cell.kind,
      sector: cell.sector,
      publication: "draft",
      sort: cell.kind === "apprenticeship-vacancy" ? "deadline" : "coverage-shortfall",
    };
    setFilters(next);
    setAppliedFilters(next);
    setMessage(`Loading ${cell.sector} ${cell.kind === "university-course" ? "university courses" : "apprenticeship vacancies"} awaiting review…`);
    window.setTimeout(() => {
      const queue = document.getElementById("catalogue-review-queue");
      if (queue && typeof queue.scrollIntoView === "function") queue.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  async function review(id: string, decision: string) {
    const note = noteFor(`opportunity:${id}`);
    if (note.length < 3) { setMessage("Add a reviewer note before making a publication decision."); return; }
    await mutate("/api/admin/catalogue/review", { opportunityId: id, decision, note }, `Opportunity moved to ${decision}.`);
  }

  async function verifyOpportunity(id: string) {
    const note = noteFor(`opportunity:${id}`);
    if (note.length < 3) { setMessage("Add a reviewer note after checking the official source before confirming opportunity facts."); return; }
    await mutate("/api/admin/catalogue/facts", {
      action: "verify-opportunity", opportunityId: id, state: "open", freshness: "high", note,
    }, "Opportunity facts confirmed from the official source.");
  }

  async function verifyOpportunityCycle(id: string) {
    const note = noteFor(`opportunity:${id}`);
    if (note.length < 3) { setMessage("Add a reviewer note after checking the provider source confirms 2027 entry."); return; }
    await mutate("/api/admin/catalogue/facts", {
      action: "verify-opportunity-cycle", opportunityId: id, applicationCycle: 2027, note,
    }, "2027 application cycle verified from the provider source.");
  }

  async function resolveRevision(revisionId: string, action: string) {
    const note = noteFor(`revision:${revisionId}`);
    if (note.length < 3) { setMessage("Add a reviewer note before resolving the source revision."); return; }
    await mutate("/api/admin/catalogue/review", { revisionId, action, note }, "Pending source revision resolved.");
  }

  async function editOpportunity(event: FormEvent<HTMLFormElement>, item: Opportunity) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    await mutate("/api/admin/catalogue/facts", {
      action: "edit-opportunity", opportunityId: item.id, title: form.get("title"), providerName: form.get("providerName"),
      sector: form.get("sector"), location: form.get("location"), summary: form.get("summary"),
      deadline: form.get("deadline") || null, applicationUrl: form.get("applicationUrl"), sourceUrl: form.get("sourceUrl"),
      state: form.get("state"), freshness: form.get("freshness"), attribution: item.attribution,
      note: form.get("note"),
    }, "Opportunity facts reviewed and saved.");
  }

  function requirementBody(form: FormData) {
    return {
      kind: form.get("kind"), label: form.get("label"), supportingText: form.get("supportingText"), sourceUrl: form.get("sourceUrl"),
      hardRequirement: form.get("hardRequirement") === "on", qualificationType: form.get("qualificationType") || undefined,
      subject: form.get("subject") || undefined, minimumGrade: form.get("minimumGrade") || undefined,
    };
  }

  async function addRequirement(event: FormEvent<HTMLFormElement>, opportunityId: string) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const ok = await mutate("/api/admin/catalogue/facts", {
      action: "add-requirement", opportunityId, ...requirementBody(form), note: form.get("note"),
    }, "Reviewed requirement added.");
    if (ok) event.currentTarget.reset();
  }

  async function updateRequirement(action: string, opportunityId: string, requirementId: string, noteKey: string) {
    const note = noteFor(noteKey);
    if (note.length < 3) { setMessage("Add a reviewer note before changing the requirement."); return; }
    await mutate("/api/admin/catalogue/facts", { action, opportunityId, requirementId, note }, "Requirement decision saved.");
  }

  async function replaceRequirement(event: FormEvent<HTMLFormElement>, action: "edit-requirement" | "supersede-requirement", opportunityId: string, requirementId: string) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    await mutate("/api/admin/catalogue/facts", {
      action, opportunityId, requirementId, ...requirementBody(form), note: form.get("note"),
    }, action === "edit-requirement" ? "Requirement updated with its prior reviewed state preserved." : "Requirement superseded; the earlier reviewed requirement remains in history.");
  }

  return <>
    {message && <p role="status" className="mb-5 rounded-2xl bg-sky p-4 font-bold">{message}</p>}
    {failure && <p role="alert" className="mb-5 rounded-2xl bg-coral/15 p-4 font-bold">{failure}</p>}

    {readiness && <section aria-labelledby="launch-readiness" className="rounded-[2rem] bg-ink p-6 text-white">
      <h2 id="launch-readiness" className="text-2xl font-black">Launch catalogue readiness</h2>
      <p className="mt-2 font-bold">{readiness.published} / {readiness.minimum} published · {readiness.ready ? "all catalogue gates pass" : "not ready to launch"}</p>
      {!readiness.ready && <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-white/80">{readiness.globalReasons.slice(0, 8).map((reason) => <li key={reason}>{reason}</li>)}</ul>}
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{readiness.distribution.map((cell) => <div key={`${cell.sector}-${cell.kind}`} className="rounded-xl bg-white/10 p-3 text-sm"><strong>{cell.sector}</strong><br />{cell.kind}: {cell.count} published{cell.shortfall ? ` (${cell.shortfall} short)` : ""}<br /><span className="text-white/70">{cell.candidates} candidates · {cell.distinctCandidateProviders} providers</span>{cell.candidates > 0 && cell.shortfall > 0 && <button type="button" onClick={() => reviewCell(cell)} className="mt-2 min-h-10 w-full rounded-full border border-white/30 px-3 font-black">Review this cell</button>}</div>)}</div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{(readiness.promotedPersonaCoverage ?? []).map((persona) => <div key={persona.id} className={`rounded-xl p-3 text-sm ${persona.passes ? "bg-white/10" : "bg-coral/20"}`}><strong>{persona.label}</strong><br />{persona.relevantOpenSourceBacked} open source-backed opportunities · minimum {persona.minimum}</div>)}</div>
    </section>}

    {readiness && <section className="mt-6 rounded-[2rem] bg-white p-6" aria-labelledby="source-attestations">
      <h2 id="source-attestations" className="text-2xl font-black">Source permission attestations</h2>
      <p className="mt-2 max-w-3xl text-sm text-ink/70">No document upload or written reference is required. Before publishing records from either source, an admin must confirm the applicable permission basis and leave a brief audit note. Reconfirming a source replaces its previous active confirmation while retaining the audit history.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">{([
        ["find-an-apprenticeship-api-v2", "Find an Apprenticeship API", "api-terms-confirmed"],
        ["discover-uni-hesa", "Discover Uni / HESA", "open-licence-confirmed"],
      ] as const).map(([sourceAuthority, label, basis]) => {
        const active = (readiness.sourceAttestations ?? []).find((item) => item.source_authority === sourceAuthority);
        return <form key={sourceAuthority} onSubmit={attestSource} className="rounded-2xl bg-oat p-4">
          <h3 className="font-black">{label}</h3>
          <p className={`mt-1 text-sm font-bold ${active ? "text-leaf" : "text-coral"}`}>{active ? `Active: ${active.permission_basis} · ${new Date(active.attested_at).toLocaleString()}` : "No active attestation — publishing is blocked."}</p>
          <input type="hidden" name="sourceAuthority" value={sourceAuthority} />
          <input type="hidden" name="permissionBasis" value={basis} />
          <textarea required minLength={10} maxLength={1000} name="note" aria-label={`${label} permission attestation note`} placeholder="Briefly confirm the applicable permission/terms and your review." className="mt-3 min-h-20 w-full rounded-xl bg-white p-3 text-sm" />
          <button className="mt-3 min-h-11 rounded-full bg-ink px-4 text-sm font-black text-white">{active ? "Refresh confirmation" : "Confirm source permission"}</button>
        </form>;
      })}</div>
    </section>}

    <div className="mt-6 flex flex-wrap gap-3">
      <button type="button" onClick={() => void sync("apprenticeships")} className="min-h-11 rounded-full bg-ink px-5 py-3 font-black text-white">Sync official apprenticeships</button>
      <button type="button" onClick={() => void sync("discover-uni")} className="min-h-11 rounded-full border border-ink/15 bg-white px-5 py-3 font-black">Sync Discover Uni archive</button>
    </div>

    <section id="catalogue-review-queue" className="mt-6 rounded-[2rem] bg-white p-5" aria-labelledby="queue-filters">
      <h2 id="queue-filters" className="text-2xl font-black">Review queue</h2>
      <form onSubmit={(event) => { event.preventDefault(); setAppliedFilters(filters); }} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm font-bold">Source<select value={filters.source} onChange={(e) => setFilters({ ...filters, source: e.target.value })} className="mt-1 min-h-11 w-full rounded-xl border px-3"><option value="">All sources</option><option value="find-an-apprenticeship-api-v2">Apprenticeship API</option><option value="discover-uni-hesa">Discover Uni</option><option value="provider-manual-review">Provider review</option><option value="employer-manual-review">Employer review</option></select></label>
        <label className="text-sm font-bold">Route type<select value={filters.kind} onChange={(e) => setFilters({ ...filters, kind: e.target.value })} className="mt-1 min-h-11 w-full rounded-xl border px-3"><option value="">All routes</option><option value="university-course">University</option><option value="apprenticeship-vacancy">Apprenticeship</option></select></label>
        <label className="text-sm font-bold">Sector<select value={filters.sector} onChange={(e) => setFilters({ ...filters, sector: e.target.value })} className="mt-1 min-h-11 w-full rounded-xl border px-3"><option value="">All sectors</option>{["technology","engineering","business","finance","unclassified"].map((value) => <option key={value}>{value}</option>)}</select></label>
        <label className="text-sm font-bold">Publication<select value={filters.publication} onChange={(e) => setFilters({ ...filters, publication: e.target.value })} className="mt-1 min-h-11 w-full rounded-xl border px-3"><option value="">All states</option>{["draft","review","published","withdrawn"].map((value) => <option key={value}>{value}</option>)}</select></label>
        <label className="text-sm font-bold">Freshness<select value={filters.freshness} onChange={(e) => setFilters({ ...filters, freshness: e.target.value })} className="mt-1 min-h-11 w-full rounded-xl border px-3"><option value="">All freshness</option>{["high","medium","low","needs-checking"].map((value) => <option key={value}>{value}</option>)}</select></label>
        <label className="text-sm font-bold">Open state<select value={filters.state} onChange={(e) => setFilters({ ...filters, state: e.target.value })} className="mt-1 min-h-11 w-full rounded-xl border px-3"><option value="">All states</option>{["open","closed","unknown"].map((value) => <option key={value}>{value}</option>)}</select></label>
        <label className="text-sm font-bold">Sort<select value={filters.sort} onChange={(e) => setFilters({ ...filters, sort: e.target.value })} className="mt-1 min-h-11 w-full rounded-xl border px-3"><option value="urgent">Most urgent review</option><option value="deadline">Deadline</option><option value="oldest-verification">Oldest verification</option><option value="newest-source-change">Newest source change</option><option value="coverage-shortfall">Launch coverage shortfall</option></select></label>
        <div className="grid gap-1 text-sm">{(["missingRequirements","unclassified","pendingRevision","sourceIssue","missingVerification","launchFailure"] as const).map((key) => <label key={key} className="flex items-center gap-2"><input type="checkbox" checked={filters[key]} onChange={(e) => setFilters({ ...filters, [key]: e.target.checked })} />{({ missingRequirements: "Missing requirements", unclassified: "Unclassified", pendingRevision: "Pending revision", sourceIssue: "Conflict/source issue", missingVerification: "Missing verification", launchFailure: "Launch-readiness failure" })[key]}</label>)}</div>
        <button className="min-h-11 rounded-full bg-leaf px-5 font-black text-white sm:col-span-2 lg:col-span-4 lg:justify-self-start">Apply queue filters</button>
      </form>
    </section>

    <section className="mt-6 rounded-[2rem] bg-white p-6"><h2 className="text-2xl font-black">Recent source runs</h2>
      <div className="mt-4 space-y-2">{runs.length ? runs.map((run) => <p key={run.id} className="rounded-xl bg-oat p-3 text-sm font-bold">{run.source_authority} · {run.status} · {run.retrieved_count} observed · {run.records_changed ?? 0} changed · {run.complete_snapshot ? "complete snapshot" : "not closure-safe"} {run.error_code ? `· ${run.error_code}` : ""}</p>) : <p className="text-ink/60">No source runs are recorded.</p>}</div>
    </section>

    <form onSubmit={create} className="mt-6 grid gap-3 rounded-[2rem] bg-white p-6 sm:grid-cols-2">
      <h2 className="text-2xl font-black sm:col-span-2">Manual primary-source draft</h2>
      <select aria-label="Draft route type" name="kind" className="min-h-12 rounded-xl border px-3"><option value="university-course">University course</option><option value="apprenticeship-vacancy">Apprenticeship</option></select>
      <select aria-label="Draft sector" name="sector" className="min-h-12 rounded-xl border px-3">{["technology","engineering","business","finance"].map((value) => <option key={value}>{value}</option>)}</select>
      <input required aria-label="Title" name="title" placeholder="Title" className="min-h-12 rounded-xl border px-3" /><input required aria-label="Provider or employer" name="providerName" placeholder="Provider or employer" className="min-h-12 rounded-xl border px-3" />
      <input required aria-label="Location" name="location" placeholder="Location" className="min-h-12 rounded-xl border px-3" /><input aria-label="Deadline" type="datetime-local" name="deadline" className="min-h-12 rounded-xl border px-3" />
      <select aria-label="Application cycle" name="applicationCycle" className="min-h-12 rounded-xl border px-3"><option value="">Cycle to verify later</option><option value="2027">2027 entry cycle</option></select>
      <textarea required minLength={10} aria-label="Source-backed summary" name="summary" placeholder="Source-backed summary" className="min-h-24 rounded-xl border p-3 sm:col-span-2" />
      <input required type="url" aria-label="Official application URL" name="applicationUrl" placeholder="Official application URL" className="min-h-12 rounded-xl border px-3" /><input required type="url" aria-label="Source URL" name="sourceUrl" placeholder="Source URL" className="min-h-12 rounded-xl border px-3" />
      <button className="min-h-12 rounded-full bg-leaf px-5 font-black text-white sm:col-span-2 sm:justify-self-start">Create draft</button>
    </form>

    {loading ? <p role="status" className="mt-6 rounded-2xl bg-white p-6 font-bold">Loading review queue…</p> : !items.length ? <p className="mt-6 rounded-2xl bg-white p-6 font-bold">No records match this review queue.</p> :
      <div className="mt-6 space-y-4">{items.map((item) => {
        const lastReview = [...item.publication_reviews].sort((a, b) => b.reviewed_at.localeCompare(a.reviewed_at))[0];
        return <article key={item.id} className="overflow-hidden rounded-[2rem] bg-white p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0"><p className="text-xs font-black uppercase tracking-wide text-leaf">{item.source_authority} · {item.kind} · {item.sector} · {item.publication_state}</p><h2 className="mt-2 text-xl font-black">{item.title}</h2><p className="font-semibold text-ink/55">{item.provider_name} · {item.location} · {item.freshness} · {item.state}{item.kind === "university-course" ? ` · ${item.application_cycle ? `${item.application_cycle} cycle` : "cycle not verified"}` : ""}</p>
              <div className="mt-2 flex flex-wrap gap-3 text-sm font-bold"><a className="text-leaf underline" href={item.application_url} target="_blank" rel="noreferrer">Official application destination</a><a className="text-leaf underline" href={item.source_url} target="_blank" rel="noreferrer">Opportunity source</a></div>
              {lastReview && <p className="mt-2 text-xs text-ink/55">Last decision: {lastReview.decision} by {lastReview.reviewer_id} at {new Date(lastReview.reviewed_at).toLocaleString()} · {lastReview.note}</p>}
            </div>
            <div className="w-full max-w-md">
              <label className="text-sm font-bold">Mandatory publication note<textarea value={notes[`opportunity:${item.id}`] ?? ""} onChange={(e) => setNotes({ ...notes, [`opportunity:${item.id}`]: e.target.value })} className="mt-1 min-h-20 w-full rounded-xl border p-3" /></label>
              <div className="mt-2 flex flex-wrap gap-2">{item.state === "open" && <button type="button" onClick={() => void verifyOpportunity(item.id)} className="min-h-10 rounded-full border border-leaf/30 bg-leaf/10 px-4 text-sm font-black">Confirm facts after source check</button>}{item.kind === "university-course" && item.application_cycle !== 2027 && <button type="button" onClick={() => void verifyOpportunityCycle(item.id)} className="min-h-10 rounded-full border border-sky/40 bg-sky/20 px-4 text-sm font-black">Confirm 2027 cycle</button>}<button type="button" onClick={() => void review(item.id, "review")} className="min-h-10 rounded-full border px-4 text-sm font-black">Send to review</button><button type="button" onClick={() => void review(item.id, "published")} className="min-h-10 rounded-full bg-leaf px-4 text-sm font-black text-white">Publish</button><button type="button" onClick={() => void review(item.id, "withdrawn")} className="min-h-10 rounded-full bg-coral/10 px-4 text-sm font-black">Withdraw now</button></div>
            </div>
          </div>
          <section aria-label="Publication readiness" className={`mt-4 rounded-xl p-4 text-sm ${item.readinessFailures.length ? "bg-coral/10" : "bg-leaf/10"}`}><p className="font-black">{item.readinessFailures.length ? "Cannot publish yet" : "Record publication checks currently pass"}</p>{item.readinessFailures.length > 0 && <ul className="mt-2 list-disc pl-5">{item.readinessFailures.map((failure) => <li key={failure}>{failure}</li>)}</ul>}</section>
          {item.source_issues.filter((issue) => issue.status !== "resolved").map((issue) => <section key={issue.id} className="mt-3 rounded-xl border border-coral/30 p-4 text-sm"><p className="font-black">Open source issue: {issue.issue_kind}</p><p className="mt-1 text-ink/70">{issue.detail}</p><label className="mt-2 block font-bold">Resolution note<textarea value={notes[`issue:${issue.id}`] ?? ""} onChange={(e) => setNotes({ ...notes, [`issue:${issue.id}`]: e.target.value })} className="mt-1 min-h-16 w-full rounded-xl border p-2" /></label><button type="button" onClick={() => {
            const note = noteFor(`issue:${issue.id}`);
            if (note.length < 3) { setMessage("Add a reviewer note before resolving the source issue."); return; }
            void mutate("/api/admin/catalogue/facts", { action: "resolve-source-issue", opportunityId: item.id, issueId: issue.id, note }, "Source issue resolved.");
          }} className="mt-2 min-h-10 rounded-full border px-3 font-bold">Resolve source issue</button></section>)}

          {item.catalogue_fact_revisions.filter((revision) => revision.status === "pending").map((revision) => <section key={revision.id} className="mt-4 rounded-xl bg-coral/10 p-4 text-sm" aria-label="Pending source revision">
            <p className="font-black">Source change awaiting human review</p>
            <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[32rem] text-left"><thead><tr><th className="pb-2">Field</th><th className="pb-2">Current reviewed value</th><th className="pb-2">Proposed source value</th></tr></thead><tbody>{Object.entries(revision.field_changes).map(([field, change]) => <tr key={field} className="border-t border-ink/10"><th className="py-2 pr-3">{field}</th><td className="py-2 pr-3">{valueText(change.from)}</td><td className="py-2">{valueText(change.to)}</td></tr>)}</tbody></table></div>
            <label className="mt-3 block font-bold">Mandatory revision note<textarea value={notes[`revision:${revision.id}`] ?? ""} onChange={(e) => setNotes({ ...notes, [`revision:${revision.id}`]: e.target.value })} className="mt-1 min-h-20 w-full rounded-xl border bg-white p-3" /></label>
            <div className="mt-2 flex flex-wrap gap-2">{[["accept","Accept proposed values"],["reject","Reject; keep reviewed values"],["supersede","Supersede revision"],["withdraw","Withdraw unsafe record"]].map(([action,label]) => <button type="button" key={action} onClick={() => void resolveRevision(revision.id, action)} className="min-h-10 rounded-full border bg-white px-3 font-bold">{label}</button>)}</div>
          </section>)}

          <details className="mt-4 rounded-2xl bg-oat p-4"><summary className="cursor-pointer font-black">Edit reviewed opportunity facts</summary>
            <form onSubmit={(event) => void editOpportunity(event, item)} className="mt-4 grid gap-2 sm:grid-cols-2">
              <input required name="title" aria-label="Opportunity title" defaultValue={item.title} className="min-h-11 rounded-xl bg-white px-3" /><input required name="providerName" aria-label="Provider or employer" defaultValue={item.provider_name} className="min-h-11 rounded-xl bg-white px-3" />
              <select name="sector" aria-label="Sector" defaultValue={item.sector} className="min-h-11 rounded-xl bg-white px-3">{["technology","engineering","business","finance","unclassified"].map((value) => <option key={value}>{value}</option>)}</select><input required name="location" aria-label="Location" defaultValue={item.location} className="min-h-11 rounded-xl bg-white px-3" />
              <textarea required minLength={10} name="summary" aria-label="Summary" defaultValue={item.summary} className="min-h-24 rounded-xl bg-white p-3 sm:col-span-2" /><input type="datetime-local" name="deadline" aria-label="Deadline" defaultValue={item.deadline?.slice(0,16)} className="min-h-11 rounded-xl bg-white px-3" />
              <input required type="url" name="applicationUrl" aria-label="Application URL" defaultValue={item.application_url} className="min-h-11 rounded-xl bg-white px-3" /><input required type="url" name="sourceUrl" aria-label="Source URL" defaultValue={item.source_url} className="min-h-11 rounded-xl bg-white px-3" />
              <select name="state" aria-label="Open state" defaultValue={item.state} className="min-h-11 rounded-xl bg-white px-3">{["open","closed","unknown"].map((value) => <option key={value}>{value}</option>)}</select><select name="freshness" aria-label="Freshness" defaultValue={item.freshness} className="min-h-11 rounded-xl bg-white px-3">{["high","medium","low","needs-checking"].map((value) => <option key={value}>{value}</option>)}</select>
              <textarea required minLength={3} name="note" aria-label="Opportunity reviewer note" placeholder="Why these reviewed values are correct" className="min-h-20 rounded-xl bg-white p-3 sm:col-span-2" /><button className="min-h-11 rounded-full bg-ink px-4 text-sm font-black text-white sm:justify-self-start">Save reviewed facts</button>
            </form>
          </details>

          <details className="mt-3 rounded-2xl bg-oat p-4"><summary className="cursor-pointer font-black">Requirements ({item.requirements.length})</summary>
            <div className="mt-4 space-y-3">{item.requirements.map((requirement) => <section key={requirement.id} className="rounded-xl bg-white p-4 text-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-between"><div><p className="font-black">{requirement.label}</p><p>{requirement.kind} · {requirement.publication_state} · {requirement.freshness}{requirement.conflict ? " · conflicting" : ""}{requirement.hard_requirement ? " · deterministic hard rule" : ""}</p><p className="mt-1 text-ink/70">{requirement.supporting_text}</p><a className="mt-1 inline-block font-bold text-leaf underline" href={requirement.source_url} target="_blank" rel="noreferrer">Requirement source</a>{(() => { const review = item.catalogue_manual_revisions.filter((entry) => entry.requirement_id === requirement.id).sort((a,b) => b.reviewed_at.localeCompare(a.reviewed_at))[0]; return review ? <p className="mt-2 text-xs text-ink/55">{review.action} by {review.reviewer_id} at {new Date(review.reviewed_at).toLocaleString()} · {review.reviewer_note}</p> : null; })()}</div><p className="text-xs text-ink/55">Verified {requirement.verified_at ? new Date(requirement.verified_at).toLocaleString() : "never"}</p></div>
              <label className="mt-3 block font-bold">Mandatory requirement note<textarea value={notes[`requirement:${requirement.id}`] ?? ""} onChange={(e) => setNotes({ ...notes, [`requirement:${requirement.id}`]: e.target.value })} className="mt-1 min-h-16 w-full rounded-xl border p-2" /></label>
              <div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={() => void updateRequirement("reverify-requirement", item.id, requirement.id, `requirement:${requirement.id}`)} className="min-h-10 rounded-full border px-3 font-bold">Reverify</button><button type="button" onClick={() => void updateRequirement(requirement.conflict ? "resolve-conflict" : "mark-conflicting", item.id, requirement.id, `requirement:${requirement.id}`)} className="min-h-10 rounded-full border px-3 font-bold">{requirement.conflict ? "Resolve conflict" : "Mark conflicting"}</button><button type="button" onClick={() => void updateRequirement("withdraw-requirement", item.id, requirement.id, `requirement:${requirement.id}`)} className="min-h-10 rounded-full border px-3 font-bold">Withdraw</button></div>
              <details className="mt-3"><summary className="cursor-pointer font-bold">Edit or supersede</summary><RequirementForm requirement={requirement} onSubmit={(event, action) => void replaceRequirement(event, action, item.id, requirement.id)} /></details>
            </section>)}</div>
            <form onSubmit={(event) => void addRequirement(event, item.id)} className="mt-4 grid gap-2 sm:grid-cols-2"><RequirementFields /><textarea required minLength={3} name="note" placeholder="Reviewer note" aria-label="Requirement reviewer note" className="min-h-20 rounded-xl bg-white p-3 sm:col-span-2" /><button className="min-h-11 rounded-full bg-leaf px-4 text-sm font-black text-white sm:justify-self-start">Add reviewed requirement</button></form>
          </details>
        </article>;
      })}</div>}

    <nav aria-label="Catalogue queue pages" className="mt-6 flex items-center justify-between rounded-2xl bg-white p-4">
      <button type="button" disabled={pagination.page <= 1 || loading} onClick={() => void load(pagination.page - 1)} className="min-h-11 rounded-full border px-4 font-bold disabled:opacity-40">Previous</button><p className="text-sm font-bold">Page {pagination.page} of {Math.max(1, pagination.pages)} · {pagination.total} records</p><button type="button" disabled={pagination.page >= pagination.pages || loading} onClick={() => void load(pagination.page + 1)} className="min-h-11 rounded-full border px-4 font-bold disabled:opacity-40">Next</button>
    </nav>
  </>;
}

function RequirementFields({ requirement }: { requirement?: Requirement }) {
  const structured = requirement?.structured_value as { eligibilityRule?: { qualificationType?: string; subject?: string; minimumGrade?: string } } | undefined;
  const rule = structured?.eligibilityRule;
  return <>
    <select name="kind" aria-label="Requirement kind" defaultValue={requirement?.kind ?? "qualification"} className="min-h-11 rounded-xl bg-white px-3">{["qualification","subject","grade","experience","skill","application-stage","other"].map((value) => <option key={value}>{value}</option>)}</select>
    <input required minLength={3} name="label" aria-label="Requirement label" defaultValue={requirement?.label} placeholder="Requirement label" className="min-h-11 rounded-xl bg-white px-3" />
    <input name="qualificationType" aria-label="Qualification type" defaultValue={rule?.qualificationType} placeholder="Qualification type for a hard grade rule" className="min-h-11 rounded-xl bg-white px-3" /><input name="subject" aria-label="Subject" defaultValue={rule?.subject} placeholder="Subject for a hard grade rule" className="min-h-11 rounded-xl bg-white px-3" />
    <input name="minimumGrade" aria-label="Minimum grade" defaultValue={rule?.minimumGrade} placeholder="Minimum grade for a hard grade rule" className="min-h-11 rounded-xl bg-white px-3" /><input required type="url" name="sourceUrl" aria-label="Requirement source URL" defaultValue={requirement?.source_url} placeholder="Requirement source URL" className="min-h-11 rounded-xl bg-white px-3" />
    <textarea required minLength={5} name="supportingText" aria-label="Supporting source text" defaultValue={requirement?.supporting_text} placeholder="Supporting source text" className="min-h-20 rounded-xl bg-white p-3 sm:col-span-2" /><label className="flex items-center gap-2 font-bold"><input type="checkbox" name="hardRequirement" defaultChecked={requirement?.hard_requirement} /> Deterministic hard grade requirement</label>
  </>;
}

function RequirementForm({ requirement, onSubmit }: { requirement: Requirement; onSubmit: (event: FormEvent<HTMLFormElement>, action: "edit-requirement" | "supersede-requirement") => void }) {
  return <form onSubmit={(event) => {
    const action = ((event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value;
    onSubmit(event, action === "supersede-requirement" ? action : "edit-requirement");
  }} className="mt-3 grid gap-2 sm:grid-cols-2"><RequirementFields requirement={requirement} /><textarea required minLength={3} name="note" aria-label="Edit reviewer note" placeholder="Reviewer note" className="min-h-20 rounded-xl bg-oat p-3 sm:col-span-2" /><div className="flex flex-wrap gap-2 sm:col-span-2"><button name="action" value="edit-requirement" className="min-h-10 rounded-full bg-ink px-3 font-bold text-white">Save edit</button><button name="action" value="supersede-requirement" className="min-h-10 rounded-full border px-3 font-bold">Supersede with this version</button></div></form>;
}
