import { z } from "zod";

const publicSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const serverSchema = publicSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  PAYMENTS_ENABLED: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  STRIPE_EXPECTED_LIVEMODE: z.enum(["true", "false"]).optional(),
  ADMIN_EMAILS: z.string().optional(),
  DELETION_LEDGER_URL: z.string().url().optional(),
  DELETION_LEDGER_BEARER_TOKEN: z.string().min(1).optional(),
});

function optionalEnvironmentValue(value: string | undefined) {
  return value?.trim() || undefined;
}

export type PublicEnv = z.infer<typeof publicSchema>;
export type ServerEnv = z.infer<typeof serverSchema>;

export function canonicalOriginIsValid(value: string | undefined, production = process.env.NODE_ENV === "production") {
  if (!value) return !production;
  try {
    const url = new URL(value);
    if (url.pathname !== "/" || url.search || url.hash || url.username || url.password) return false;
    if (!production) return url.protocol === "http:" || url.protocol === "https:";
    return url.protocol === "https:" && !["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
}

function publicInput() {
  return {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? (process.env.NODE_ENV === "production" ? undefined : "http://localhost:3000"),
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

function normalisedPublicInput() {
  const input = publicInput();
  return {
    ...input,
    NEXT_PUBLIC_APP_URL: input.NEXT_PUBLIC_APP_URL ? new URL(input.NEXT_PUBLIC_APP_URL).origin : input.NEXT_PUBLIC_APP_URL,
  };
}

export function getPublicEnv(): PublicEnv | null {
  const input = publicInput();
  if (!canonicalOriginIsValid(input.NEXT_PUBLIC_APP_URL)) return null;
  const parsed = publicSchema.safeParse(normalisedPublicInput());

  return parsed.success ? parsed.data : null;
}

export function getServerEnv(): ServerEnv {
  const input = publicInput();
  if (!canonicalOriginIsValid(input.NEXT_PUBLIC_APP_URL)) throw new Error("Invalid canonical application origin.");
  return serverSchema.parse({
    ...normalisedPublicInput(),
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    PAYMENTS_ENABLED: optionalEnvironmentValue(process.env.PAYMENTS_ENABLED),
    STRIPE_SECRET_KEY: optionalEnvironmentValue(process.env.STRIPE_SECRET_KEY),
    STRIPE_WEBHOOK_SECRET: optionalEnvironmentValue(process.env.STRIPE_WEBHOOK_SECRET),
    STRIPE_EXPECTED_LIVEMODE: optionalEnvironmentValue(process.env.STRIPE_EXPECTED_LIVEMODE),
    ADMIN_EMAILS: optionalEnvironmentValue(process.env.ADMIN_EMAILS),
    DELETION_LEDGER_URL: optionalEnvironmentValue(process.env.DELETION_LEDGER_URL),
    DELETION_LEDGER_BEARER_TOKEN: optionalEnvironmentValue(process.env.DELETION_LEDGER_BEARER_TOKEN),
  });
}

export function isProductionConfigured() {
  return getPublicEnv() !== null && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
