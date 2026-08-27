import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { launchApplicationCycle } from "@/lib/catalog/commercial/policy";
import { publicOpportunityWithRequirements } from "@/lib/supabase/public-catalogue";

const safeSearchText = z.string().trim().max(80).regex(/^[\p{L}\p{N}\s.'&+\/-]+$/u);
const querySchema = z.object({
  q: safeSearchText.optional(),
  sector: z.enum(["technology", "engineering", "business", "finance"]).optional(),
  kind: z.enum(["university-course", "apprenticeship-vacancy"]).optional(),
  location: safeSearchText.optional(),
  page: z.coerce.number().int().min(1).max(50).default(1),
  pageSize: z.coerce.number().int().min(1).max(24).default(12),
});

function parseQuery(url: URL) {
  return querySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
}

export async function GET(request: Request) {
  const parsed = parseQuery(new URL(request.url));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid-query", message: "Use the available search filters and a page size of 24 or fewer." } },
      { status: 400 },
    );
  }
  const supabase = await createClient();

  if (!supabase) {
    return NextResponse.json({ opportunities: [], configured: false, pagination: { page: parsed.data.page, pageSize: parsed.data.pageSize, hasMore: false } });
  }

  const { q, sector, kind, location, page, pageSize } = parsed.data;
  const now = new Date();
  const nowIso = now.toISOString();
  const freshnessCutoff = new Date(now.getTime() - 30 * 86_400_000).toISOString();

  let builder = supabase
    .from("opportunities")
    .select(publicOpportunityWithRequirements)
    .eq("publication_state", "published")
    .eq("state", "open")
    .or([
      "and(deadline.is.null,kind.eq.apprenticeship-vacancy)",
      `and(deadline.is.null,kind.eq.university-course,application_cycle.eq.${launchApplicationCycle})`,
      `and(deadline.gt.${nowIso},kind.eq.apprenticeship-vacancy)`,
      `and(deadline.gt.${nowIso},kind.eq.university-course,application_cycle.eq.${launchApplicationCycle})`,
    ].join(","))
    .in("freshness", ["high", "medium"])
    .gt("freshness_expires_at", nowIso)
    .gte("verified_at", freshnessCutoff)
    .order("deadline", { ascending: true, nullsFirst: false });

  if (sector) builder = builder.eq("sector", sector);
  if (kind) builder = builder.eq("kind", kind);
  if (location) builder = builder.ilike("location", `%${location}%`);
  if (q) builder = builder.or(`title.ilike.*${q}*,provider_name.ilike.*${q}*`);
  const first = (page - 1) * pageSize;
  builder = builder.range(first, first + pageSize);
  const { data, error } = await builder;

  if (error) {
    return NextResponse.json({ error: { code: "unavailable", message: "Opportunity search is temporarily unavailable." } }, { status: 503 });
  }

  const rows = data ?? [];
  return NextResponse.json({
    opportunities: rows.slice(0, pageSize),
    configured: true,
    pagination: { page, pageSize, hasMore: rows.length > pageSize },
  });
}
