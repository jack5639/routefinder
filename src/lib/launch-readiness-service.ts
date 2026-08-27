import "server-only";

import { evaluateCatalogueReadiness } from "@/lib/catalog/commercial/readiness";
import { canonicalOriginIsValid, getServerEnv } from "@/lib/env";
import { launchReadinessStatus, type LaunchReadinessChecks } from "@/lib/launch-readiness";
import { evaluatePaymentConfiguration } from "@/lib/payment-configuration";
import { createAdminClient } from "@/lib/supabase/admin";

export const releaseProbeVersion = "20260827202316";

export async function getLaunchReadiness() {
  const origin = canonicalOriginIsValid(process.env.NEXT_PUBLIC_APP_URL)
    ? "ready" as const
    : "not-ready" as const;
  let env: ReturnType<typeof getServerEnv>;
  try {
    env = getServerEnv();
  } catch {
    const checks: LaunchReadinessChecks = {
      origin,
      supabase: "unconfigured",
      migrations: "unconfigured",
      catalogue: "unconfigured",
      deletionLedger: "unconfigured",
      payments: process.env.PAYMENTS_ENABLED === "true" ? "partial" : "disabled",
    };
    return { status: launchReadinessStatus(checks), checks };
  }

  const payments = evaluatePaymentConfiguration({
    enabled: env.PAYMENTS_ENABLED,
    secretKey: env.STRIPE_SECRET_KEY,
    webhookSecret: env.STRIPE_WEBHOOK_SECRET,
    expectedLivemode: env.STRIPE_EXPECTED_LIVEMODE,
  }).state;
  const ledgerHttps = env.DELETION_LEDGER_URL ? new URL(env.DELETION_LEDGER_URL).protocol === "https:" : false;
  const deletionLedger = ledgerHttps && env.DELETION_LEDGER_BEARER_TOKEN ? "ready" as const : "unconfigured" as const;

  const admin = createAdminClient();
  const probe = await admin.rpc("routefinder_release_probe");
  if (probe.error) {
    const connectivity = await admin.from("payment_offers").select("code", { count: "exact", head: true });
    const supabase = connectivity.error ? "unavailable" as const : "ready" as const;
    const checks: LaunchReadinessChecks = {
      origin, supabase, migrations: supabase === "ready" ? "not-ready" : "unavailable",
      catalogue: "unavailable", deletionLedger, payments,
    };
    return { status: launchReadinessStatus(checks), checks };
  }

  const migrations = probe.data === releaseProbeVersion ? "ready" as const : "not-ready" as const;
  const [opportunities, runs, attestations] = await Promise.all([
    admin.from("opportunities").select(`
      id,kind,sector,title,provider_name,location,application_url,source_url,source_authority,source_id,
      attribution,application_cycle,deadline,verified_at,freshness,freshness_expires_at,state,
      publication_state,latest_source_change_at,
      requirements(id,publication_state,supporting_text,source_url,verified_at,freshness,freshness_expires_at,conflict,hard_requirement,structured_value),
      catalogue_fact_revisions(id,status,created_at),source_issues(id,status,issue_kind)
    `).limit(500),
    admin.from("source_runs").select("id,source_authority,status,started_at,completed_at,complete_snapshot,retrieved_count,records_changed").order("started_at", { ascending: false }).limit(100),
    admin.from("catalogue_source_attestations").select("source_authority,attested_at,revoked_at").is("revoked_at", null),
  ]);
  const catalogueUnavailable = opportunities.error || runs.error || attestations.error;
  const catalogue = catalogueUnavailable
    ? "unavailable" as const
    : evaluateCatalogueReadiness(opportunities.data ?? [], runs.data ?? [], new Date(), attestations.data ?? []).ready
      ? "ready" as const
      : "not-ready" as const;
  const checks: LaunchReadinessChecks = {
    origin, supabase: "ready", migrations, catalogue, deletionLedger, payments,
  };
  return { status: launchReadinessStatus(checks), checks };
}
