import { NextResponse } from "next/server";
import { syncApprenticeships, syncDiscoverUni } from "@/lib/catalog/commercial/sync";

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  const source = new URL(request.url).searchParams.get("source") ?? "apprenticeships";
  try {
    if (source === "apprenticeships") return NextResponse.json({ source, ...(await syncApprenticeships()) });
    if (source === "discover-uni") return NextResponse.json({ source, ...(await syncDiscoverUni()) });
    return NextResponse.json({ error: "Unknown source." }, { status: 400 });
  } catch { return NextResponse.json({ error: "Catalogue sync failed." }, { status: 502 }); }
}
