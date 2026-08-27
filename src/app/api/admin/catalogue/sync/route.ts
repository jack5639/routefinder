import { NextResponse } from "next/server";
import { apiError, getApiContext } from "@/lib/api-context";
import { isSameOriginRequest } from "@/lib/same-origin";
import { syncApprenticeships, syncDiscoverUni } from "@/lib/catalog/commercial/sync";
import { isAdminEmail } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return apiError("Cross-origin requests are not allowed.", 403, "cross-origin");
  const context = await getApiContext();
  if (!context || !isAdminEmail(context.user.email)) return apiError("Admin access required.", 403, "forbidden");
  const source = new URL(request.url).searchParams.get("source");
  try {
    if (source === "apprenticeships") return NextResponse.json({ source, ...(await syncApprenticeships()) });
    if (source === "discover-uni") return NextResponse.json({ source, ...(await syncDiscoverUni()) });
  } catch (error) { return apiError(error instanceof Error ? error.message : "The official catalogue sync failed.", 502, "source-error"); }
  return apiError("Choose apprenticeships or discover-uni.");
}
