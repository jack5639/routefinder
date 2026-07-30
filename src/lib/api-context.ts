import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export interface ApiContext {
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>;
  user: User;
}

export interface MutationApiContext extends ApiContext {
  admin: ReturnType<typeof createAdminClient>;
}

export async function getApiContext(): Promise<ApiContext | null> {
  const supabase = await createClient();

  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ? { supabase, user } : null;
}

export async function getMutationApiContext(): Promise<MutationApiContext | null> {
  const context = await getApiContext();

  return context ? { ...context, admin: createAdminClient() } : null;
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
  context: MutationApiContext,
  scope: string,
  maximum: number,
  windowSeconds: number,
) {
  const { data, error } = await context.admin.rpc("consume_rate_limit", {
    bucket_key: `${scope}:${context.user.id}`,
    maximum,
    window_seconds: windowSeconds,
  });

  return !error && data !== false;
}

export function databaseErrorIs(error: unknown, identifier: string) {
  if (!error || typeof error !== "object" || !("message" in error)) {
    return false;
  }

  return String(error.message).includes(identifier);
}
