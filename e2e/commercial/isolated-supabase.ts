import type { BrowserContext } from "@playwright/test";
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";

const exactAcknowledgement = "routefinder-isolated-commercial-e2e-v1";
const sentinelMarker = "routefinder-disposable-security-test-v1";

export interface SyntheticStudent {
  id: string;
  session: Session;
}

export class IsolatedCommercialEnvironment {
  readonly url: string;
  readonly anonKey: string;
  readonly projectRef: string;
  readonly admin: SupabaseClient;
  private readonly users = new Set<string>();
  private readonly opportunities = new Set<string>();

  constructor() {
    this.url = process.env.COMMERCIAL_E2E_SUPABASE_URL ?? "";
    this.anonKey = process.env.COMMERCIAL_E2E_SUPABASE_ANON_KEY ?? "";
    const serviceKey = process.env.COMMERCIAL_E2E_SUPABASE_SERVICE_ROLE_KEY ?? "";
    this.projectRef = process.env.COMMERCIAL_E2E_SUPABASE_PROJECT_REF ?? "";
    const productionRef = process.env.SUPABASE_PRODUCTION_PROJECT_REF;
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
