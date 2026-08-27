import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeading } from "@/components/page-heading";
import { requireUser } from "@/lib/auth";
import { buildStartingStrategy } from "@/lib/mvp/starting-strategy";
import { launchApplicationCycle } from "@/lib/catalog/commercial/policy";
import type { Qualification, StudentProfile } from "@/lib/mvp/types";
import { createClient } from "@/lib/supabase/server";

export default async function StrategyPage() {
  const user = await requireUser("/strategy");
  const supabase = await createClient();
  if (!supabase) redirect("/signin?next=/strategy");
  const [profileResult, qualificationResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("qualifications").select("*").eq("user_id", user.id),
  ]);
  if (!profileResult.data || profileResult.data.application_cycle !== launchApplicationCycle) redirect("/readiness");
  const row = profileResult.data;
  const profile: StudentProfile = {
    id: user.id,
    currentStage: row.current_stage,
    applicationCycle: row.application_cycle,
    homeRegion: row.home_region,
    maxTravelMinutes: row.max_travel_minutes,
    relocationPreference: row.relocation_preference,
    routeIntent: row.route_intent,
    sectors: row.sectors,
    workStyles: row.work_styles,
    financialPreference: row.financial_preference,
    constraints: row.constraints,
    qualificationsComplete: row.qualifications_complete ?? false,
    experienceSummary: row.experience_summary ?? undefined,
  };
  const qualifications: Qualification[] = (qualificationResult.data ?? []).map((qualification) => ({
    id: qualification.id,
    qualificationType: qualification.qualification_type,
    subject: qualification.subject,
    grade: qualification.grade ?? undefined,
    status: qualification.status,
  }));
  const strategy = buildStartingStrategy(profile, qualifications);
  return <>
    <PageHeading eyebrow="Readiness complete" title={strategy.headline} description="Use this sequence to build a useful comparison while keeping uncertainty explicit." />
    <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-[2rem] bg-white p-6 shadow-sm sm:p-8"><h2 className="text-2xl font-black">What your answers suggest checking</h2><ul className="mt-5 space-y-3">{strategy.observations.map((observation) => <li key={observation} className="rounded-2xl bg-oat p-4 font-semibold leading-7">{observation}</li>)}</ul></section>
      <section className="rounded-[2rem] bg-ink p-6 text-white shadow-sm sm:p-8"><h2 className="text-2xl font-black">First three actions</h2><ol className="mt-5 space-y-4">{strategy.firstActions.map((action, index) => <li key={action} className="flex gap-3 font-semibold leading-7"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mint text-sm font-black text-ink">{index + 1}</span>{action}</li>)}</ol><Link href="/opportunities" className="mt-7 inline-flex min-h-12 items-center rounded-full bg-white px-6 font-black text-ink">Find reviewed opportunities</Link></section>
    </div>
    <p className="mt-5 rounded-2xl bg-sky p-4 text-sm font-bold">{strategy.caveat}</p>
  </>;
}
