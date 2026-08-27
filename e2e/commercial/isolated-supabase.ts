import type { BrowserContext } from "@playwright/test";
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";

const exactAcknowledgement = "routefinder-isolated-commercial-e2e-v1";
const sentinelMarker = "routefinder-disposable-security-test-v1";
const destructiveDeletionAcknowledgement = "routefinder-isolated-commercial-delete-v1";

export interface SyntheticStudent {
  id: string;
  session: Session;
}

export interface SyntheticReviewedOpportunity {
  id: string;
  title: string;
  requirementId: string;
}

export class IsolatedCommercialEnvironment {
  readonly url: string;
  readonly anonKey: string;
  readonly projectRef: string;
  readonly admin: SupabaseClient;
  readonly destructiveDeletionEnabled: boolean;
  private readonly users = new Set<string>();
  private readonly opportunities = new Set<string>();

  constructor() {
    this.url = process.env.COMMERCIAL_E2E_SUPABASE_URL ?? "";
    this.anonKey = process.env.COMMERCIAL_E2E_SUPABASE_ANON_KEY ?? "";
    const serviceKey = process.env.COMMERCIAL_E2E_SUPABASE_SERVICE_ROLE_KEY ?? "";
    this.projectRef = process.env.COMMERCIAL_E2E_SUPABASE_PROJECT_REF ?? "";
    const productionRef = process.env.SUPABASE_PRODUCTION_PROJECT_REF;
    const deletionLedgerUrl = process.env.DELETION_LEDGER_URL?.trim() ?? "";
    const deletionLedgerToken = process.env.DELETION_LEDGER_BEARER_TOKEN?.trim() ?? "";
    const deletionAcknowledged = process.env.COMMERCIAL_E2E_DELETION_LEDGER_ACK === destructiveDeletionAcknowledgement;
    if (!this.url || !this.anonKey || !serviceKey || !this.projectRef || process.env.COMMERCIAL_E2E_ACK !== exactAcknowledgement) {
      throw new Error(`Commercial E2E is opt-in. Set every COMMERCIAL_E2E_* value and acknowledge exactly ${exactAcknowledgement}.`);
    }
    if (!/^[a-z0-9-]{8,64}$/.test(this.projectRef) || new URL(this.url).hostname.split(".")[0] !== this.projectRef) {
      throw new Error("The commercial E2E project reference is invalid or does not match its URL.");
    }
    if (productionRef && productionRef === this.projectRef) throw new Error("Commercial E2E refuses the configured production project.");
    if (process.env.NEXT_PUBLIC_SUPABASE_URL !== this.url || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== this.anonKey) {
      throw new Error("The locally started application must use the same isolated Supabase project as commercial E2E.");
    }
    if ((deletionLedgerUrl || deletionLedgerToken || deletionAcknowledged) && (!deletionLedgerUrl || !deletionLedgerToken || !deletionAcknowledged)) {
      throw new Error(`Destructive account-deletion E2E requires DELETION_LEDGER_URL, DELETION_LEDGER_BEARER_TOKEN, and COMMERCIAL_E2E_DELETION_LEDGER_ACK=${destructiveDeletionAcknowledgement}; otherwise leave all three unset to test fail-closed deletion.`);
    }
    if (deletionLedgerUrl && new URL(deletionLedgerUrl).protocol !== "https:") {
      throw new Error("Destructive account-deletion E2E requires an HTTPS separately durable ledger endpoint.");
    }
    this.destructiveDeletionEnabled = Boolean(deletionLedgerUrl && deletionLedgerToken && deletionAcknowledged);
    this.admin = createClient(this.url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  }

  async verifySentinel() {
    const result = await this.admin.from("environment_sentinels").select("project_ref").eq("purpose", "security-test").eq("project_ref", this.projectRef).eq("marker", sentinelMarker).maybeSingle();
    if (result.error || !result.data) throw new Error("The isolated commercial E2E database sentinel is absent.");
  }

  async createStudent(label: string): Promise<SyntheticStudent> {
    const stamp = crypto.randomUUID();
    const email = `commercial-${label}-${stamp}@example.test`;
    const password = `Routefinder!${crypto.randomUUID()}`;
    const created = await this.admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error) throw new Error("Could not create a synthetic commercial student.");
    this.users.add(created.data.user.id);
    const client = createClient(this.url, this.anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const signedIn = await client.auth.signInWithPassword({ email, password });
    if (signedIn.error || !signedIn.data.session) throw new Error("Could not obtain a synthetic commercial session.");
    return { id: created.data.user.id, session: signedIn.data.session };
  }

  async authenticate(context: BrowserContext, student: SyntheticStudent) {
    const json = JSON.stringify(student.session);
    const value = `base64-${Buffer.from(json).toString("base64url")}`;
    const chunks = value.length <= 3180 ? [value] : value.match(/.{1,3180}/g) ?? [];
    const name = `sb-${this.projectRef}-auth-token`;
    await context.addCookies(chunks.map((chunk, index) => ({
      name: chunks.length === 1 ? name : `${name}.${index}`,
      value: chunk,
      domain: "127.0.0.1",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax" as const,
    })));
  }

  async createOpportunity(publicationState: "published" | "draft" | "withdrawn", suffix: string) {
    const stamp = crypto.randomUUID();
    const result = await this.admin.from("opportunities").insert({
      kind: "university-course",
      sector: "technology",
      title: `RF E2E ${suffix} ${stamp}`,
      provider_name: "Routefinder synthetic provider",
      location: "London",
      summary: "Synthetic commercial release-verification record",
      application_url: "https://example.test/apply",
      source_url: "https://example.test/source",
      source_authority: `commercial-e2e-${stamp}`,
      source_id: stamp,
      retrieved_at: new Date().toISOString(),
      verified_at: new Date().toISOString(),
      freshness: "high",
      state: "open",
      publication_state: publicationState,
      raw_snapshot: { restricted: true },
    }).select().single();
    if (result.error) throw new Error("Could not seed a synthetic commercial opportunity.");
    this.opportunities.add(result.data.id);
    return result.data;
  }

  async createReviewedOpportunity(suffix: string, reviewerId: string, kind: "university-course" | "apprenticeship-vacancy" = "university-course"): Promise<SyntheticReviewedOpportunity> {
    const stamp = crypto.randomUUID();
    const now = new Date();
    const retrievedAt = now.toISOString();
    const deadline = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
    const result = await this.admin.from("opportunities").insert({
      kind,
      sector: "technology",
      title: `RF E2E reviewed ${suffix} ${stamp}`,
      provider_name: "Routefinder synthetic provider",
      location: kind === "apprenticeship-vacancy" ? "Manchester" : "London",
      summary: "Synthetic reviewed commercial activation record",
      deadline,
      application_cycle: kind === "university-course" ? 2027 : null,
      application_url: "https://example.test/apply",
      source_url: "https://example.test/source",
      source_authority: `commercial-e2e-${this.projectRef}`,
      source_id: stamp,
      retrieved_at: retrievedAt,
      verified_at: retrievedAt,
      freshness: "high",
      freshness_expires_at: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      state: "open",
      publication_state: "draft",
      raw_snapshot: { restricted: true, synthetic: true },
    }).select("id,title").single();
    if (result.error || !result.data) throw new Error("Could not seed a synthetic reviewed commercial opportunity.");
    this.opportunities.add(result.data.id);

    const requirement = await this.admin.rpc("review_catalogue_fact_mutation", {
      p_opportunity_id: result.data.id,
      p_requirement_id: null,
      p_reviewer_id: reviewerId,
      p_action: "create-requirement",
      p_fact: {
        kind: "experience",
        label: `Reviewed evidence requirement ${suffix}`,
        supportingText: "Synthetic requirement reviewed against the recorded commercial E2E source.",
        sourceUrl: "https://example.test/source",
        retrievedAt,
        hardRequirement: false,
        structuredValue: { type: "experience", synthetic: true },
      },
      p_note: "Reviewed synthetic requirement for isolated commercial E2E.",
    });
    if (requirement.error || typeof requirement.data !== "string") throw new Error("Could not seed a reviewed synthetic requirement.");

    const publication = await this.admin.rpc("review_catalogue_publication", {
      p_opportunity_id: result.data.id,
      p_reviewer_id: reviewerId,
      p_decision: "published",
      p_note: "Published synthetic reviewed opportunity for isolated commercial E2E.",
    });
    if (publication.error) throw new Error("Could not publish a reviewed synthetic commercial opportunity.");

    return { id: result.data.id, title: result.data.title, requirementId: requirement.data };
  }

  async provisionCycleEntitlement(userId: string) {
    const result = await this.admin.from("entitlements").upsert({
      user_id: userId,
      plan: "cycle",
      status: "active",
      starts_at: new Date().toISOString(),
      ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }, { onConflict: "user_id" }).select("user_id,plan,status,ends_at").single();
    if (result.error) throw new Error("Could not provision a synthetic Cycle entitlement.");
    return result.data;
  }

  async portfolioItemId(userId: string, opportunityId: string) {
    const result = await this.admin.from("portfolio_items").select("id").eq("user_id", userId).eq("opportunity_id", opportunityId).eq("active", true).single();
    if (result.error || !result.data) throw new Error("Could not find the synthetic portfolio item for E2E authorisation coverage.");
    return result.data.id;
  }

  async cleanup() {
    const errors: string[] = [];
    if (this.users.size) {
      const ids = [...this.users];
      for (const table of ["analytics_events", "audit_events", "source_issues", "orders"]) {
        const result = await this.admin.from(table).delete().in("user_id", ids);
        if (result.error) errors.push(table);
      }
      for (const id of ids) {
        const result = await this.admin.auth.admin.deleteUser(id);
        if (result.error && !/not found/i.test(result.error.message)) errors.push("auth");
      }
    }
    if (this.opportunities.size) {
      const result = await this.admin.from("opportunities").delete().in("id", [...this.opportunities]);
      if (result.error) errors.push("opportunities");
    }
    if (errors.length) throw new Error(`Commercial E2E cleanup failed for ${[...new Set(errors)].join(", ")}.`);
  }
}
