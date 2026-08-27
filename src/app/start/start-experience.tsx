"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type StartPath = "focused" | "comparing" | "unsure";
type Requirement = {
  id: string;
  kind: string;
  label: string;
  supporting_text: string;
  source_url: string;
  verified_at?: string;
  freshness: string;
  conflict: boolean;
  hard_requirement: boolean;
};
type Opportunity = {
  id: string;
  title: string;
  provider_name: string;
  kind: "university-course" | "apprenticeship-vacancy";
  sector: "technology" | "engineering" | "business" | "finance";
  location: string;
  deadline?: string;
  application_url: string;
  source_url: string;
  verified_at?: string;
  freshness: string;
  requirements?: Requirement[];
};

const pathOptions: Array<{ id: StartPath; title: string; description: string }> = [
  { id: "focused", title: "I have one opportunity", description: "Check one published requirement and turn it into a next action." },
  { id: "comparing", title: "I am comparing options", description: "Compare two or three reviewed opportunities without blending the decision dimensions." },
  { id: "unsure", title: "I am not sure yet", description: "Get one or two route families to investigate, with unknowns made visible." },
];

function track(eventName: "starting_path_selected" | "first_useful_result_viewed", path: StartPath, campaign?: string) {
  void fetch("/api/funnel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventName, properties: { path, ...(campaign ? { campaign } : {}) } }),
    keepalive: true,
  });
}

function routeLabel(kind: Opportunity["kind"]) {
  return kind === "university-course" ? "University course" : "Apprenticeship vacancy";
}

function isSafeOfficialUrl(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function StartExperience({ campaign }: { campaign?: string }) {
  const [path, setPath] = useState<StartPath>();
  const [items, setItems] = useState<Opportunity[]>([]);
  const [catalogueState, setCatalogueState] = useState<"loading" | "ready" | "unconfigured" | "unavailable">("loading");
  const [selectedId, setSelectedId] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [evidenceState, setEvidenceState] = useState<"supported" | "missing" | "uncertain">("uncertain");
  const [sector, setSector] = useState<Opportunity["sector"]>("technology");
  const [routeOpenness, setRouteOpenness] = useState<"both" | "university" | "apprenticeship">("both");
  const [locationConstraint, setLocationConstraint] = useState<"local" | "relocate" | "unsure">("unsure");
  const [showResult, setShowResult] = useState(false);
  const reportedResult = useRef<string | undefined>(undefined);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/opportunities?pageSize=24", { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error("unavailable");
        setItems(result.opportunities ?? []);
        setCatalogueState(result.configured === false ? "unconfigured" : "ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setCatalogueState("unavailable");
      });
    return () => controller.abort();
  }, []);

  const selected = items.find((item) => item.id === selectedId);
  const externalUrlIsValid = isSafeOfficialUrl(externalUrl);
  const compared = items.filter((item) => selectedIds.includes(item.id));
  const unsureMatches = useMemo(() => items.filter((item) => item.sector === sector && (
    routeOpenness === "both" || (routeOpenness === "university" ? item.kind === "university-course" : item.kind === "apprenticeship-vacancy")
  )).slice(0, 2), [items, routeOpenness, sector]);

  function choosePath(next: StartPath) {
    setPath(next);
    setShowResult(false);
    track("starting_path_selected", next, campaign);
  }

  function reveal() {
    if (!path) return;
    setShowResult(true);
    const resultKey = `${path}:${selectedId}:${externalUrlIsValid ? "external" : ""}:${selectedIds.join(",")}:${sector}:${routeOpenness}:${locationConstraint}:${evidenceState}`;
    if (reportedResult.current !== resultKey) {
      reportedResult.current = resultKey;
      track("first_useful_result_viewed", path, campaign);
    }
  }

  const signInHref = `/signin?next=${encodeURIComponent("/readiness")}${campaign ? `&campaign=${encodeURIComponent(campaign)}` : ""}`;
  return (
    <section className="mt-8">
      <fieldset>
        <legend className="text-lg font-black">Where are you starting?</legend>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {pathOptions.map((option) => (
            <button key={option.id} type="button" aria-pressed={path === option.id} onClick={() => choosePath(option.id)} className={`min-h-28 rounded-3xl border-2 p-5 text-left transition focus:outline-none focus:ring-4 focus:ring-leaf/20 ${path === option.id ? "border-leaf bg-mint" : "border-white bg-white/80 hover:border-leaf/30"}`}>
              <strong className="block text-lg">{option.title}</strong>
              <span className="mt-2 block text-sm font-semibold leading-6 text-ink/60">{option.description}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {path ? (
        <div className="mt-6 rounded-[2rem] bg-white/85 p-5 shadow-sm sm:p-7">
          {catalogueState === "loading" ? <p role="status" className="font-bold">Checking the reviewed catalogue…</p> : null}
          {catalogueState === "unconfigured" ? <p role="status" className="rounded-2xl bg-sky p-4 font-bold">The reviewed catalogue is not connected in this environment. The unsure path can still suggest a route family, but no current opportunity can be verified here.</p> : null}
          {catalogueState === "unavailable" ? <p role="alert" className="rounded-2xl bg-coral/10 p-4 font-bold">The reviewed catalogue is temporarily unavailable. No opportunity result will be inferred from missing data.</p> : null}
          {catalogueState === "ready" && items.length === 0 ? <p role="status" className="rounded-2xl bg-oat p-4 font-bold">There are no public, current reviewed opportunities in the catalogue yet. This is an honest coverage gap.</p> : null}

          {path === "focused" ? (
            <div className="mt-2">
              <label htmlFor="focused-opportunity" className="font-black">Reviewed opportunity</label>
              <select id="focused-opportunity" value={selectedId} onChange={(event) => { setSelectedId(event.target.value); if (event.target.value) setExternalUrl(""); setShowResult(false); }} disabled={catalogueState !== "ready" || items.length === 0} className="mt-2 min-h-14 w-full rounded-2xl border border-ink/15 bg-white px-4 font-semibold">
                <option value="">Choose one opportunity</option>
                {items.map((item) => <option key={item.id} value={item.id}>{item.title} — {item.provider_name}</option>)}
              </select>
              <div className="my-5 flex items-center gap-3 text-sm font-black text-ink/45" aria-hidden="true"><span className="h-px flex-1 bg-ink/10" /><span>or</span><span className="h-px flex-1 bg-ink/10" /></div>
              <label htmlFor="focused-official-url" className="font-black">Official opportunity URL</label>
              <input id="focused-official-url" type="url" inputMode="url" placeholder="https://provider.example/opportunity" value={externalUrl} onChange={(event) => { setExternalUrl(event.target.value); if (event.target.value) setSelectedId(""); setShowResult(false); }} aria-invalid={externalUrl.length > 0 && !externalUrlIsValid} aria-describedby="focused-url-help" className="mt-2 min-h-14 w-full rounded-2xl border border-ink/15 bg-white px-4 font-semibold" />
              <p id="focused-url-help" className="mt-2 text-sm font-semibold text-ink/55">Use the provider or employer’s HTTPS page. Routefinder will not infer requirements from this URL.</p>
              {externalUrl.length > 0 && !externalUrlIsValid ? <p role="alert" className="mt-2 text-sm font-bold text-coral">Enter a complete HTTPS URL.</p> : null}
              {selected ? selected.requirements?.[0]?.hard_requirement && selected.requirements[0].kind === "grade" ? <p className="mt-5 rounded-2xl bg-oat p-4 text-sm font-bold leading-6">This is a deterministic hard grade requirement. It can only be compared with a qualification record after sign-in; an experience example cannot satisfy it.</p> : <fieldset className="mt-5">
                <legend className="font-black">For its first published requirement, what can you honestly show?</legend>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(["supported", "missing", "uncertain"] as const).map((state) => <button key={state} type="button" aria-pressed={evidenceState === state} onClick={() => { setEvidenceState(state); setShowResult(false); }} className={`min-h-11 rounded-full px-5 text-sm font-black capitalize ${evidenceState === state ? "bg-ink text-white" : "border border-ink/15 bg-white"}`}>{state === "supported" ? "I have evidence" : state === "missing" ? "I do not have it yet" : "I am not sure"}</button>)}
                </div>
              </fieldset> : null}
              <button type="button" disabled={!selected && !externalUrlIsValid} onClick={reveal} className="mt-6 min-h-12 rounded-full bg-leaf px-6 font-black text-white disabled:opacity-40">Show my requirement result</button>
            </div>
          ) : null}

          {path === "comparing" ? (
            <fieldset className="mt-2">
              <legend className="font-black">Choose two or three reviewed opportunities</legend>
              <div className="mt-3 grid gap-2">
                {items.slice(0, 12).map((item) => {
                  const checked = selectedIds.includes(item.id);
                  return <label key={item.id} className="flex min-h-12 items-center gap-3 rounded-2xl border border-ink/10 p-3 font-semibold"><input type="checkbox" checked={checked} disabled={!checked && selectedIds.length >= 3} onChange={() => { setSelectedIds(checked ? selectedIds.filter((id) => id !== item.id) : [...selectedIds, item.id]); setShowResult(false); }} /><span>{item.title} <span className="text-ink/50">· {item.provider_name}</span></span></label>;
                })}
              </div>
              <button type="button" disabled={selectedIds.length < 2} onClick={reveal} className="mt-6 min-h-12 rounded-full bg-leaf px-6 font-black text-white disabled:opacity-40">Compare these options</button>
            </fieldset>
          ) : null}

          {path === "unsure" ? (
            <div className="mt-2 grid gap-4 sm:grid-cols-3">
              <label className="font-black">Area to explore<select value={sector} onChange={(event) => { setSector(event.target.value as Opportunity["sector"]); setShowResult(false); }} className="mt-2 min-h-12 w-full rounded-2xl border border-ink/15 bg-white px-3 font-semibold"><option value="technology">Technology</option><option value="engineering">Engineering</option><option value="business">Business</option><option value="finance">Finance</option></select></label>
              <label className="font-black">Route openness<select value={routeOpenness} onChange={(event) => { setRouteOpenness(event.target.value as typeof routeOpenness); setShowResult(false); }} className="mt-2 min-h-12 w-full rounded-2xl border border-ink/15 bg-white px-3 font-semibold"><option value="both">Open to both</option><option value="university">University only for now</option><option value="apprenticeship">Apprenticeship only for now</option></select></label>
              <label className="font-black">Location constraint<select value={locationConstraint} onChange={(event) => { setLocationConstraint(event.target.value as typeof locationConstraint); setShowResult(false); }} className="mt-2 min-h-12 w-full rounded-2xl border border-ink/15 bg-white px-3 font-semibold"><option value="unsure">Not sure</option><option value="local">Need to stay local</option><option value="relocate">Could relocate</option></select></label>
              <button type="button" onClick={reveal} className="min-h-12 rounded-full bg-leaf px-6 font-black text-white sm:col-span-3 sm:justify-self-start">Show route families to investigate</button>
            </div>
          ) : null}
        </div>
      ) : null}

      {showResult && path === "focused" && selected ? <FocusedResult opportunity={selected} evidenceState={evidenceState} /> : null}
      {showResult && path === "focused" && !selected && externalUrlIsValid ? <ExternalUrlResult officialUrl={externalUrl} /> : null}
      {showResult && path === "comparing" && compared.length >= 2 ? <ComparisonResult opportunities={compared} /> : null}
      {showResult && path === "unsure" ? <UnsureResult sector={sector} routeOpenness={routeOpenness} locationConstraint={locationConstraint} examples={unsureMatches} catalogueState={catalogueState} /> : null}

      {showResult ? (
        <aside className="mt-5 rounded-[2rem] bg-ink p-6 text-white sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div><h2 className="text-xl font-black">Continue with your own private workspace</h2><p className="mt-2 text-sm font-semibold leading-6 text-white/70">This result stays on this page only. Sign in to complete readiness details, save opportunities, and build your three actions.</p></div>
          <Link href={signInHref} className="mt-5 inline-flex min-h-12 shrink-0 items-center rounded-full bg-white px-6 font-black text-ink sm:mt-0">Sign in to continue</Link>
        </aside>
      ) : null}
    </section>
  );
}

function ExternalUrlResult({ officialUrl }: { officialUrl: string }) {
  return <article aria-live="polite" className="mt-5 rounded-[2rem] border-2 border-leaf/30 bg-mint/70 p-6">
    <p className="text-xs font-black uppercase tracking-wide text-leaf">Requirement → evidence → state → action</p>
    <h2 className="mt-3 text-2xl font-black">Official opportunity needs checking</h2>
    <p className="mt-4 font-semibold leading-7 text-ink/65">Routefinder has not inferred or verified any requirement from this URL.</p>
    <p className="mt-4 rounded-2xl bg-white/70 p-4 font-bold">Current state: needs checking. No eligibility, fit, readiness, or source-confidence conclusion is available yet.</p>
    <p className="mt-4 font-semibold"><strong>Useful next action:</strong> Open the official page, record one material requirement exactly as published, and note its source and date before comparing your evidence.</p>
    <a href={officialUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 items-center font-black text-leaf underline">Check the official opportunity ↗</a>
  </article>;
}

function FocusedResult({ opportunity, evidenceState }: { opportunity: Opportunity; evidenceState: "supported" | "missing" | "uncertain" }) {
  const requirement = opportunity.requirements?.[0];
  const deterministicGrade = requirement?.hard_requirement && requirement.kind === "grade";
  const stateCopy = deterministicGrade ? "Not assessed — a qualification record is required, and evidence examples do not change this result." : evidenceState === "supported" ? "Possibly supported — your evidence still needs checking against the exact wording." : evidenceState === "missing" ? "Gap identified — you have said you cannot evidence this yet." : "Needs checking — uncertainty is being kept visible.";
  const action = deterministicGrade ? "Check the published minimum, then add the exact achieved, predicted, or unknown qualification result after sign-in." : evidenceState === "supported" ? "Write down the exact example and what you personally did, then compare it with the source wording." : evidenceState === "missing" ? "Choose one small activity that could produce genuine evidence, without inventing experience." : "Open the source and note the exact point you need to confirm with the provider or employer.";
  return <article aria-live="polite" className="mt-5 rounded-[2rem] border-2 border-leaf/30 bg-mint/70 p-6">
    <p className="text-xs font-black uppercase tracking-wide text-leaf">Requirement → evidence → state → action</p>
    <h2 className="mt-3 text-2xl font-black">{opportunity.title}</h2>
    {requirement ? <>
      <p className="mt-4 font-black">Requirement: {requirement.label}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-ink/65">{requirement.supporting_text}</p>
      <p className="mt-4 rounded-2xl bg-white/70 p-4 font-bold">Current state: {stateCopy}</p>
      <p className="mt-4 font-semibold"><strong>Useful next action:</strong> {action}</p>
      <p className="mt-4 text-sm font-semibold text-ink/55">Verified: {requirement.verified_at ? new Date(requirement.verified_at).toLocaleDateString("en-GB") : "not recorded"} · Freshness: {requirement.freshness}</p>
      <a href={requirement.source_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 items-center font-black text-leaf underline">Check the requirement source ↗</a>
    </> : <p className="mt-4 rounded-2xl bg-white/70 p-4 font-bold">No published requirement is available for this record. Worth checking directly on the official page before acting.</p>}
  </article>;
}

function ComparisonResult({ opportunities }: { opportunities: Opportunity[] }) {
  return <section aria-live="polite" className="mt-5 overflow-x-auto rounded-[2rem] bg-white p-5 shadow-sm sm:p-7"><h2 className="text-2xl font-black">Separate comparison views</h2><p className="mt-2 font-semibold text-ink/60">No total score or acceptance likelihood is calculated.</p>
    <table className="mt-5 min-w-[760px] w-full border-separate border-spacing-0 text-left text-sm"><caption className="sr-only">Comparison of selected opportunities across separate decision dimensions</caption><thead><tr><th className="border-b border-ink/15 p-3">Dimension</th>{opportunities.map((item) => <th key={item.id} scope="col" className="border-b border-ink/15 p-3"><span className="block font-black">{item.title}</span><span className="font-semibold text-ink/50">{item.provider_name}</span></th>)}</tr></thead><tbody>
      {[
        ["Route and location", (item: Opportunity) => `${routeLabel(item.kind)} · ${item.location}`],
        ["Eligibility", () => "Needs your qualification record"],
        ["Fit", () => "Not assessed in this first result"],
        ["Application readiness", () => "No evidence compared yet"],
        ["Information confidence", (item: Opportunity) => `${item.freshness}; ${item.verified_at ? `verified ${new Date(item.verified_at).toLocaleDateString("en-GB")}` : "verification date missing"}`],
        ["Portfolio role", () => "Needs checking after more options are saved"],
        ["Deadline", (item: Opportunity) => item.deadline ? new Date(item.deadline).toLocaleDateString("en-GB") : "Check directly"],
        ["Next action", (item: Opportunity) => item.requirements?.[0] ? `Check: ${item.requirements[0].label}` : "Check the official page for requirements"],
      ].map(([label, value]) => <tr key={String(label)}><th scope="row" className="border-b border-ink/8 p-3 font-black">{String(label)}</th>{opportunities.map((item) => <td key={item.id} className="border-b border-ink/8 p-3 font-semibold text-ink/65">{(value as (item: Opportunity) => string)(item)}</td>)}</tr>)}
    </tbody></table>
  </section>;
}

function UnsureResult({ sector, routeOpenness, locationConstraint, examples, catalogueState }: { sector: Opportunity["sector"]; routeOpenness: "both" | "university" | "apprenticeship"; locationConstraint: "local" | "relocate" | "unsure"; examples: Opportunity[]; catalogueState: "loading" | "ready" | "unconfigured" | "unavailable" }) {
  const families = routeOpenness === "both" ? ["University courses", "Higher and degree apprenticeships"] : routeOpenness === "university" ? ["University courses"] : ["Higher and degree apprenticeships"];
  return <section aria-live="polite" className="mt-5 rounded-[2rem] bg-mint/70 p-6"><p className="text-xs font-black uppercase tracking-wide text-leaf">Families to investigate — not a recommendation</p><h2 className="mt-3 text-2xl font-black">{families.join(" and ")} in {sector}</h2><p className="mt-3 font-semibold leading-7 text-ink/65">These match the route openness you selected. {locationConstraint === "local" ? "A local-only constraint may narrow both coverage and availability." : locationConstraint === "relocate" ? "You said relocation could be possible, but costs and practical constraints remain unassessed." : "Your location constraint is still unknown."}</p>
    <div className="mt-4 rounded-2xl bg-white/70 p-4"><h3 className="font-black">What remains unknown</h3><p className="mt-2 text-sm font-semibold leading-6 text-ink/65">Your qualifications, learning preferences, finances, travel limits, deadlines, and the exact requirements of each opportunity have not been assessed.</p></div>
    <p className="mt-4 font-semibold"><strong>Low-cost next action:</strong> Open one current example from each route family you are considering and write down one published requirement plus one practical question.</p>
    {examples.length ? <div className="mt-5"><h3 className="font-black">Current reviewed examples to inspect</h3><ul className="mt-2 space-y-2">{examples.map((item) => <li key={item.id}><a className="inline-flex min-h-11 items-center font-bold text-leaf underline" href={item.application_url} target="_blank" rel="noreferrer">{item.title} — {item.provider_name} ↗</a></li>)}</ul></div> : <p className="mt-4 text-sm font-bold">{catalogueState === "ready" ? "No current reviewed example matches these choices. That coverage gap is not being filled with demo data." : "Current reviewed examples cannot be checked in this environment."}</p>}
  </section>;
}
