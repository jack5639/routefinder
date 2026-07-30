import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { publicOpportunityWithRequirements } from "@/lib/supabase/public-catalogue";

export async function GET(request: Request) {
  const supabase = await createClient();

  if (!supabase) {
    return NextResponse.json({ opportunities: [], configured: false });
  }

  const url = new URL(request.url);
  const sector = url.searchParams.get("sector");
  const kind = url.searchParams.get("kind");
  const location = url.searchParams.get("location");
  const query = url.searchParams.get("q");
  const includeClosed = url.searchParams.get("includeClosed") === "true";

  let builder = supabase
    .from("opportunities")
    .select(publicOpportunityWithRequirements)
    .eq("publication_state", "published")
    .order("deadline", { ascending: true, nullsFirst: false })
    .limit(100);

  if (sector) builder = builder.eq("sector", sector);
  if (kind) builder = builder.eq("kind", kind);
  if (location) builder = builder.ilike("location", `%${location}%`);
  if (query) builder = builder.or(`title.ilike.%${query}%,provider_name.ilike.%${query}%`);
  if (!includeClosed) builder = builder.neq("state", "closed");

  const { data, error } = await builder;

  if (error) {
    return NextResponse.json({ error: { code: "unavailable", message: "Opportunity search is temporarily unavailable." } }, { status: 503 });
  }

  return NextResponse.json({ opportunities: data ?? [], configured: true });
}
