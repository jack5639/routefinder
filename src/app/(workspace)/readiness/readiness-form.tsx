"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const sectors = ["technology", "engineering", "business", "finance"] as const;

type ExistingProfile = {
  profile?: {
    current_stage?: "Year 12" | "Year 13";
    application_cycle?: number;
    home_region?: string;
    max_travel_minutes?: number;
    relocation_preference?: "stay-local" | "could-relocate" | "unsure";
    route_intent?: "university" | "apprenticeship" | "combined";
    sectors?: string[];
    work_styles?: string[];
    financial_preference?: "open" | "cost-aware" | "prefer-lower-debt";
    constraints?: string[];
    experience_summary?: string;
  } | null;
  qualifications?: Array<{ qualification_type: string; subject: string; grade?: string; status: "predicted" | "achieved" | "unknown" }>;
};

export function ReadinessForm() {
  const router = useRouter();
  const [existing, setExisting] = useState<ExistingProfile | null>(null);
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventName: "readiness_started", properties: {} }),
    });
    fetch("/api/profile")
      .then((response) => response.json())
      .then((data: ExistingProfile) => {
        setExisting(data);
        setSelectedSectors(data.profile?.sectors ?? []);
      })
      .catch(() => setExisting({}));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const qualifications = String(form.get("qualifications") ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [qualificationType = "A level", subject = "Unknown", grade = ""] = line.split("|").map((value) => value.trim());
        return { qualificationType, subject, grade: grade || undefined, status: grade ? "predicted" : "unknown" };
      });
    const payload = {
      currentStage: form.get("currentStage"),
      applicationCycle: Number(form.get("applicationCycle")),
      homeRegion: form.get("homeRegion"),
      maxTravelMinutes: Number(form.get("maxTravelMinutes")),
      relocationPreference: form.get("relocationPreference"),
      routeIntent: form.get("routeIntent"),
      sectors: selectedSectors,
      workStyles: String(form.get("workStyles") ?? "").split(",").map((value) => value.trim()).filter(Boolean),
      financialPreference: form.get("financialPreference"),
      constraints: String(form.get("constraints") ?? "").split("\n").map((value) => value.trim()).filter(Boolean),
      experienceSummary: form.get("experienceSummary") || undefined,
      qualifications,
      policyVersion: "2026-07-29",
    };
    const response = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(result.error?.message ?? "Check your answers and try again.");
      setSaving(false);
      return;
    }
    router.push("/strategy");
    router.refresh();
  }

  if (!existing) return <p role="status" className="rounded-2xl bg-white p-6 font-semibold">Loading your saved progress…</p>;
  const profile = existing.profile;
  const qualificationText = (existing.qualifications ?? [])
    .map((item) => `${item.qualification_type} | ${item.subject} | ${item.grade ?? ""}`)
    .join("\n");
  const field = "mt-2 min-h-12 w-full rounded-2xl border border-ink/15 bg-white px-4 py-3 font-semibold outline-none focus:border-leaf focus:ring-4 focus:ring-leaf/10";

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="grid gap-5 rounded-[2rem] bg-white/80 p-5 shadow-sm sm:grid-cols-2 sm:p-7">
        <label className="font-black">Current stage
          <select name="currentStage" defaultValue={profile?.current_stage ?? "Year 12"} className={field}>
            <option>Year 12</option><option>Year 13</option>
          </select>
        </label>
        <label className="font-black">Application cycle
          <select name="applicationCycle" defaultValue={profile?.application_cycle ?? 2027} className={field}>
            {[2027, 2028, 2029, 2030, 2031, 2032].map((year) => <option key={year}>{year}</option>)}
          </select>
        </label>
        <label className="font-black">Broad home area
          <input name="homeRegion" required minLength={2} defaultValue={profile?.home_region ?? ""} placeholder="For example: West Midlands" className={field} />
          <span className="mt-2 block text-xs font-semibold text-ink/50">Do not enter your full address or postcode.</span>
        </label>
        <label className="font-black">Maximum one-way travel time
          <input name="maxTravelMinutes" type="number" min="0" max="360" defaultValue={profile?.max_travel_minutes ?? 60} className={field} />
        </label>
        <label className="font-black">Relocation
          <select name="relocationPreference" defaultValue={profile?.relocation_preference ?? "unsure"} className={field}>
            <option value="stay-local">Prefer to stay local</option>
            <option value="could-relocate">Could relocate</option>
            <option value="unsure">Not sure yet</option>
          </select>
        </label>
        <label className="font-black">Routes to explore
          <select name="routeIntent" defaultValue={profile?.route_intent ?? "combined"} className={field}>
            <option value="combined">University and apprenticeships</option>
            <option value="university">University</option>
            <option value="apprenticeship">Apprenticeships</option>
          </select>
        </label>
      </section>

      <fieldset className="rounded-[2rem] bg-white/80 p-5 shadow-sm sm:p-7">
        <legend className="px-1 text-xl font-black">Areas you want to explore</legend>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          {sectors.map((sector) => (
            <label key={sector} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-ink/10 bg-oat/70 px-4 font-black capitalize">
              <input
                type="checkbox"
                checked={selectedSectors.includes(sector)}
                onChange={(event) => setSelectedSectors((current) => event.target.checked ? [...current, sector] : current.filter((value) => value !== sector))}
                className="h-5 w-5 accent-leaf"
              />
              {sector}
            </label>
          ))}
        </div>
      </fieldset>

      <section className="space-y-5 rounded-[2rem] bg-white/80 p-5 shadow-sm sm:p-7">
        <label className="block font-black">Qualifications
          <textarea name="qualifications" required rows={5} defaultValue={qualificationText} placeholder={"A level | Mathematics | A\nA level | Physics | \nGCSE | English Language | 6"} className={field} />
          <span className="mt-2 block text-xs font-semibold leading-5 text-ink/50">One per line: type | subject | predicted or achieved grade. Leave the grade blank when it is unknown.</span>
        </label>
        <label className="block font-black">Work styles you prefer
          <input name="workStyles" defaultValue={profile?.work_styles?.join(", ") ?? ""} placeholder="Practical, team-based, analytical" className={field} />
        </label>
        <label className="block font-black">Financial preference
          <select name="financialPreference" defaultValue={profile?.financial_preference ?? "open"} className={field}>
            <option value="open">Open to different options</option>
            <option value="cost-aware">Cost is an important factor</option>
            <option value="prefer-lower-debt">Prefer options with lower debt</option>
          </select>
        </label>
        <label className="block font-black">Existing experience and responsibilities
          <textarea name="experienceSummary" rows={4} defaultValue={profile?.experience_summary ?? ""} maxLength={1000} placeholder="Projects, work, caring responsibilities, clubs, volunteering, or other experience you already have." className={field} />
        </label>
        <label className="block font-black">Important constraints or unknowns
          <textarea name="constraints" rows={4} defaultValue={profile?.constraints?.join("\n") ?? ""} placeholder={"I am not sure whether I can relocate\nI need to check a predicted grade"} className={field} />
        </label>
      </section>

      {message && <p role="alert" className="rounded-2xl bg-coral/10 p-4 font-bold text-ink">{message}</p>}
      <div className="flex flex-col items-start justify-between gap-4 rounded-[2rem] bg-ink p-5 text-white sm:flex-row sm:items-center sm:p-7">
        <p className="max-w-xl text-sm font-semibold leading-6 text-white/70">Your answers create a starting strategy. They do not rank routes or predict whether an application will succeed.</p>
        <button disabled={saving || selectedSectors.length === 0} className="min-h-12 rounded-full bg-white px-6 font-black text-ink disabled:cursor-not-allowed disabled:opacity-50">
          {saving ? "Saving…" : "Save and find opportunities"}
        </button>
      </div>
    </form>
  );
}
