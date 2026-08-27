import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError, getApiContext, parseJson } from "@/lib/api-context";
import { isSameOriginRequest } from "@/lib/same-origin";
import { opportunityPublicationFailures } from "@/lib/catalog/commercial/readiness";
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
  applicationCycle: z.coerce.number().int().refine((value) => value === 2027).optional(),
  applicationUrl: z.string().url(),
  sourceUrl: z.string().url(),
});

async function adminContext() {
  const context = await getApiContext();
  return context && isAdminEmail(context.user.email) ? context : null;
}

const filterValues = {
  kind: ["university-course", "apprenticeship-vacancy"],
  sector: [...launchSectors, "unclassified"],
  publication: ["draft", "review", "published", "withdrawn"],
  freshness: ["high", "medium", "low", "needs-checking"],
  state: ["open", "closed", "unknown"],
} as const;

export async function GET(request: Request) {
  if (!(await adminContext())) return apiError("Admin access required.", 403, "forbidden");
  const params = new URL(request.url).searchParams;
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  const pageSize = Math.min(50, Math.max(10, Number(params.get("pageSize") ?? 20) || 20));
  const source = params.get("source");
  const kind = params.get("kind");
  const sector = params.get("sector");
  const publication = params.get("publication");
  const freshness = params.get("freshness");
  const state = params.get("state");
  const sort = params.get("sort") ?? "urgent";
  const admin = createAdminClient();
  const queue = await admin.rpc("catalogue_review_queue", {
    p_page: page,
    p_page_size: pageSize,
    p_source: source || null,
    p_kind: (filterValues.kind as readonly string[]).includes(kind ?? "") ? kind : null,
    p_sector: (filterValues.sector as readonly string[]).includes(sector ?? "") ? sector : null,
    p_publication: (filterValues.publication as readonly string[]).includes(publication ?? "") ? publication : null,
    p_freshness: (filterValues.freshness as readonly string[]).includes(freshness ?? "") ? freshness : null,
    p_state: (filterValues.state as readonly string[]).includes(state ?? "") ? state : null,
    p_missing_requirements: params.get("missingRequirements") === "true",
    p_unclassified: params.get("unclassified") === "true",
    p_pending_revision: params.get("pendingRevision") === "true",
    p_source_issue: params.get("sourceIssue") === "true",
    p_missing_verification: params.get("missingVerification") === "true",
    p_launch_failure: params.get("launchFailure") === "true",
    p_sort: sort,
  });
  if (queue.error) return apiError("Admin catalogue queue unavailable.", 503, "unavailable");
  const queueRows = (queue.data ?? []) as Array<{ opportunity_id: string; total_count: number }>;
  const ids = queueRows.map((row) => row.opportunity_id);
  const query = admin.from("opportunities").select(`
    id,kind,sector,title,provider_name,location,summary,application_cycle,deadline,application_url,source_url,source_authority,source_id,
    retrieved_at,verified_at,freshness,freshness_expires_at,state,publication_state,
    attribution,last_seen_at,latest_source_change_at,created_at,updated_at,
    requirements(id,kind,label,structured_value,supporting_text,source_url,retrieved_at,verified_at,freshness,freshness_expires_at,conflict,hard_requirement,publication_state,updated_at),
    catalogue_fact_revisions(id,status,field_changes,proposed_fact,reviewer_id,reviewer_note,reviewed_at,created_at),
    source_issues(id,issue_kind,detail,status,created_at,resolved_at),
    publication_reviews(id,reviewer_id,decision,note,reviewed_at),
    catalogue_manual_revisions(id,requirement_id,action,reviewer_id,reviewer_note,reviewed_at)
  `).in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  const [opportunities, runs, issues, attestations] = await Promise.all([
    query,
    admin.from("source_runs").select("*").order("started_at", { ascending: false }).limit(20),
    admin.from("source_issues").select("*, opportunities(title)").neq("status", "resolved").order("created_at"),
    admin.from("catalogue_source_attestations").select("source_authority,attested_at,revoked_at").is("revoked_at", null),
  ]);
  if (opportunities.error || runs.error || issues.error || attestations.error) return apiError("Admin catalogue unavailable.", 503, "unavailable");
  const byId = new Map((opportunities.data ?? []).map((item) => [item.id, item]));
  const filtered = ids.flatMap((id) => {
    const item = byId.get(id);
    return item ? [{ ...item, readinessFailures: opportunityPublicationFailures(item, new Date(), attestations.data ?? []) }] : [];
  });
  const total = Number(queueRows[0]?.total_count ?? 0);
  return NextResponse.json({
    opportunities: filtered,
    pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) },
    runs: runs.data ?? [],
    issues: issues.data ?? [],
  });
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return apiError("Cross-origin requests are not allowed.", 403, "cross-origin");
  const context = await adminContext();
  if (!context) return apiError("Admin access required.", 403, "forbidden");
  const parsed = manualSchema.safeParse(await parseJson(request));
  if (!parsed.success) return apiError("Check the manual opportunity fields.");
  const admin = createAdminClient();
  const result = await admin.rpc("create_catalogue_manual_draft", {
    p_reviewer_id: context.user.id,
    p_fact: parsed.data,
  });
  if (result.error || !result.data) return apiError("The draft could not be created; nothing was changed.", 503, "unavailable");
  return NextResponse.json({ opportunity: { id: result.data } }, { status: 201 });
}
