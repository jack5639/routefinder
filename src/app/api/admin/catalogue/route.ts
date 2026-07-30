import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError, getApiContext, parseJson } from "@/lib/api-context";
import { createAdminClient, isAdminEmail } from "@/lib/supabase/admin";
import { launchSectors } from "@/lib/mvp/types";

const manualSchema = z.object({
  kind: z.enum(["university-course", "apprenticeship-vacancy"]),
  sector: z.enum(launchSectors),
  title: z.string().trim().min(3).max(200),
  providerName: z.string().trim().min(2).max(200),
  location: z.string().trim().min(2).max(200),
  summary: z.string().trim().min(10).max(1200),
  deadline: z.string().datetime().optional(),
  applicationUrl: z.string().url(),
  sourceUrl: z.string().url(),
});

async function adminContext() {
  const context = await getApiContext();
  return context && isAdminEmail(context.user.email) ? context : null;
}

export async function GET() {
  if (!(await adminContext())) return apiError("Admin access required.", 403, "forbidden");
  const admin = createAdminClient();
  const [opportunities, runs, issues] = await Promise.all([
    admin.from("opportunities").select("*, requirements(*), catalogue_fact_revisions(*)").order("updated_at", { ascending: false }).limit(200),
    admin.from("source_runs").select("*").order("started_at", { ascending: false }).limit(20),
    admin.from("source_issues").select("*, opportunities(title)").neq("status", "resolved").order("created_at"),
  ]);
  return NextResponse.json({ opportunities: opportunities.data ?? [], runs: runs.data ?? [], issues: issues.data ?? [] });
}

export async function POST(request: Request) {
  const context = await adminContext();
  if (!context) return apiError("Admin access required.", 403, "forbidden");
  const parsed = manualSchema.safeParse(await parseJson(request));
  if (!parsed.success) return apiError("Check the manual opportunity fields.");
  const admin = createAdminClient();
  const organisationKind = parsed.data.kind === "university-course" ? "university-provider" : "employer";
  const { data: organisation } = await admin.from("organisations").upsert({
    kind: organisationKind,
    name: parsed.data.providerName,
    website_url: new URL(parsed.data.sourceUrl).origin,
    source_authority: parsed.data.kind === "university-course" ? "provider-manual-review" : "employer-manual-review",
    updated_at: new Date().toISOString(),
  }, { onConflict: "kind,name" }).select("id").single();
  const { data, error } = await admin.from("opportunities").insert({
    organisation_id: organisation?.id,
    kind: parsed.data.kind,
    sector: parsed.data.sector,
    title: parsed.data.title,
    provider_name: parsed.data.providerName,
    location: parsed.data.location,
    summary: parsed.data.summary,
    deadline: parsed.data.deadline,
    application_url: parsed.data.applicationUrl,
    source_url: parsed.data.sourceUrl,
    source_authority: parsed.data.kind === "university-course" ? "provider-manual-review" : "employer-manual-review",
    retrieved_at: new Date().toISOString(),
    freshness: "needs-checking",
    state: "unknown",
    publication_state: "draft",
  }).select("*").single();
  if (error) return apiError("The draft could not be created.", 503, "unavailable");
  await admin.from("audit_events").insert({ user_id: context.user.id, action: "catalogue.draft_created", entity_type: "opportunity", entity_id: data.id, metadata: {} });
  return NextResponse.json({ opportunity: data }, { status: 201 });
}
