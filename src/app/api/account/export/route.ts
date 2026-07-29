import { NextResponse } from "next/server";

import { apiError, getApiContext } from "@/lib/api-context";

const exportedTables = [
  "profiles",
  "qualifications",
  "consent_records",
  "portfolio_items",
  "evidence_items",
  "evidence_requirement_links",
  "assessment_versions",
  "tasks",
  "plan_refreshes",
  "applications",
  "entitlements",
  "orders",
  "audit_events",
  "source_issues",
  "prototype_imports",
  "analytics_events",
] as const;

export async function GET() {
  const context = await getApiContext();
  if (!context) return apiError("Sign in to export your data.", 401, "unauthorised");

  const entries = await Promise.all(
    exportedTables.map(async (table) => {
      const query = context.supabase.from(table).select("*");
      const result = table === "profiles" ? await query.eq("id", context.user.id) : await query.eq("user_id", context.user.id);
      if (result.error) throw result.error;
      return [table, result.data ?? []] as const;
    }),
  ).catch(() => null);

  if (!entries) return apiError("Your export is temporarily unavailable.", 503, "unavailable");

  await context.supabase.from("analytics_events").insert({
    user_id: context.user.id,
    event_name: "export_requested",
    properties: {},
  });

  return NextResponse.json(
    {
      exportVersion: 1,
      exportedAt: new Date().toISOString(),
      account: { id: context.user.id, email: context.user.email, createdAt: context.user.created_at },
      data: Object.fromEntries(entries),
    },
    {
      headers: {
        "Content-Disposition": `attachment; filename="routefinder-export-${new Date().toISOString().slice(0, 10)}.json"`,
        "Cache-Control": "no-store",
      },
    },
  );
}
