import { NextResponse } from "next/server";
import { apiError, getApiContext } from "@/lib/api-context";
import { createAdminClient, isAdminEmail } from "@/lib/supabase/admin";

const sectors = ["technology", "engineering", "business", "finance"];
const kinds = ["university-course", "apprenticeship-vacancy"];

export async function GET() {
  const context = await getApiContext();
  if (!context || !isAdminEmail(context.user.email)) return apiError("Admin access required.", 403, "forbidden");
  const admin = createAdminClient();
  const { data: opportunities, error } = await admin.from("opportunities").select("id,sector,kind,publication_state,freshness,verified_at,state,requirements(conflict,publication_state,verified_at)");
  if (error) return apiError("Catalogue readiness is unavailable.", 503, "unavailable");
  const rows = opportunities ?? [];
  const distribution = sectors.flatMap((sector) => kinds.map((kind) => ({ sector, kind, count: rows.filter((row) => row.sector === sector && row.kind === kind && row.publication_state === "published").length })));
  const invalidPublished = rows.filter((row) => row.publication_state === "published" && (!row.verified_at || row.freshness === "needs-checking" || row.sector === "unclassified" || row.state === "unknown" || !(row.requirements ?? []).length || (row.requirements ?? []).some((requirement: { conflict: boolean; publication_state: string; verified_at?: string }) => requirement.conflict || requirement.publication_state !== "published" || !requirement.verified_at)));
  const published = rows.filter((row) => row.publication_state === "published");
  return NextResponse.json({ minimum: 80, published: published.length, distribution, invalidPublished: invalidPublished.map((row) => row.id), ready: published.length >= 80 && distribution.every((item) => item.count >= 10) && invalidPublished.length === 0 });
}
