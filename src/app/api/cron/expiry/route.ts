import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("entitlements")
    .update({ status: "expired", updated_at: new Date().toISOString() })
    .eq("status", "active")
    .lt("ends_at", new Date().toISOString())
    .select("id");
  if (error) return NextResponse.json({ error: "Expiry processing failed." }, { status: 500 });
  return NextResponse.json({ expired: data?.length ?? 0, completedAt: new Date().toISOString() });
}
