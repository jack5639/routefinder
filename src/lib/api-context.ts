import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

export async function getApiContext(): Promise<{ supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>; user: User } | null> {
  const supabase = await createClient();

  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ? { supabase, user } : null;
}

export function apiError(message: string, status = 400, code = "invalid") {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function parseJson(request: Request) {
  try {
    return (await request.json()) as unknown;
  } catch {
    return null;
  }
}

export async function consumeRateLimit(
  context: NonNullable<Awaited<ReturnType<typeof getApiContext>>>,
  scope: string,
  maximum: number,
  windowSeconds: number,
) {
  const { data, error } = await context.supabase.rpc("consume_rate_limit", {
    bucket_key: `${scope}:${context.user.id}`,
    maximum,
    window_seconds: windowSeconds,
  });

  return !error && data !== false;
}
