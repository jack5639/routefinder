import { z } from "zod";

const publicSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const serverSchema = publicSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  STRIPE_EXPECTED_LIVEMODE: z.enum(["true", "false"]).optional(),
  ADMIN_EMAILS: z.string().optional(),
  DELETION_LEDGER_URL: z.string().url().optional(),
  DELETION_LEDGER_BEARER_TOKEN: z.string().min(1).optional(),
});

export type PublicEnv = z.infer<typeof publicSchema>;
export type ServerEnv = z.infer<typeof serverSchema>;

export function getPublicEnv(): PublicEnv | null {
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  return parsed.success ? parsed.data : null;
}

export function getServerEnv(): ServerEnv {
  return serverSchema.parse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_EXPECTED_LIVEMODE: process.env.STRIPE_EXPECTED_LIVEMODE,
    ADMIN_EMAILS: process.env.ADMIN_EMAILS,
    DELETION_LEDGER_URL: process.env.DELETION_LEDGER_URL,
    DELETION_LEDGER_BEARER_TOKEN: process.env.DELETION_LEDGER_BEARER_TOKEN,
  });
}

export function isProductionConfigured() {
  return getPublicEnv() !== null && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
