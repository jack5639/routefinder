# Routefinder threat model

## Status

This is the repository threat-model baseline for the commercial MVP. Source-code controls and local tests are implemented where stated. Direct Supabase, isolated authenticated E2E, Stripe, restore, production-domain, and specialist review evidence remain release-gate evidence and must be run in the named disposable or production environment.

## Scope and trust boundaries

```text
Student browser
  -> same-origin Next.js routes and Supabase session cookies
  -> read-only authenticated Supabase client for reads
  -> server-owned validated mutations with service-role RPCs
  -> RLS-protected London Supabase project

Catalogue sources / Stripe / cron
  -> signed or bearer-authenticated server routes
  -> bounded service-only jobs and reviewed publication transactions

Supabase backups
  -> isolated restore-test project
  -> separately durable deletion ledger replay before service resumption
```

The browser is untrusted. The service role, Stripe secrets, source credentials, deletion-ledger credential, database URLs, and raw catalogue observations are server-only. Demo/local SQLite data is outside the commercial trust boundary and must remain labelled as demo data.

## Threat register and evidence

| Threat | Assets at risk | Control | Evidence / status |
| --- | --- | --- | --- |
| Cross-site request or forged browser mutation | Student profile, portfolio, evidence, tasks, payments, catalogue review | Authenticated mutations enforce configured same-origin / `Sec-Fetch-Site` checks; admin routes use the same guard. Stripe and cron are explicit non-browser exceptions protected by signature/bearer auth. | `src/lib/api-context.test.ts`, route inspection, isolated attack suite; external browser run still required. |
| Cross-user read or write / object-ID substitution | Student-owned records and relationships | RLS, server ownership predicates, composite foreign keys, relationship triggers, service-only mutation RPCs, and tests using real foreign portfolio IDs. | `src/lib/security-boundaries.test.ts`, `scripts/verify-supabase-security.mjs`, commercial E2E; isolated run required. |
| Direct Supabase privilege escalation | Raw catalogue, audit, payment, rate-limit, and student tables | Browser roles are read-only/allowlisted; sensitive tables and RPCs are revoked; fixed `search_path`, triggers, and migration-ledger checks are verified. | Static tests plus destructive isolated SQL/PostgREST suite; isolated run required. |
| Raw or stale catalogue exposure | Incorrect requirements, private source payloads, student decisions | Public column allowlists and current publication predicate; provenance, freshness, source attestation, review, conflict, and deadline gates. | Catalogue readiness and security tests; reviewed launch catalogue evidence required. |
| Payment replay, wrong environment, refund/dispute ordering | Entitlements, order history, paid access | Signed Stripe webhook, explicit livemode match, idempotent service RPC, event ordering, refund/dispute terminal handling, and database constraints. | Unit tests and opt-in Stripe staging matrix; real staging run required. |
| Rate-limit bypass / concurrent limit race | Email, checkout, evidence, applications, weekly actions | Server-only atomic counters, advisory locks, database entitlement/workflow limits, and concurrent attack cases. | Unit tests and isolated security suite; isolated run required. |
| Account deletion followed by backup restore | Deleted student data and retained lawful records | Durable HTTPS deletion ledger outside Supabase backup scope; fail-closed account deletion; isolated post-backup restore, replay, idempotency, and anonymisation test. | `src/lib/deletion-ledger.test.ts`, `pnpm db:restore-test`; approval and configured ledger remain blocked. |
| Secret leakage or sensitive logging | Credentials, student data, source payloads | `.env.local` ignored, server-only env validation, redacted logs, no service key in browser tests, synthetic fixtures only. | Code review and isolated suite output; operational review required. |
| Availability or unsafe AI output | Student trust and cost budget | AI is optional, schema-validated, timeout-bounded, `store: false`, deterministic fallback; no AI authority over eligibility or catalogue facts. | Roadmap schema tests and architecture/ADR rules; production cost controls required before enabling. |

## State-changing route coverage

Authenticated API product mutations use `getMutationApiContext(request)`, which applies the same-origin boundary before looking up the user. Sign-out, public recommendation/roadmap and magic-link POSTs apply the same guard directly. Admin catalogue mutations apply it before admin authorization. The auth callback is an intentional cross-site GET from a one-time email/OAuth link; it exchanges only a validated code or allowlisted OTP type and normalises the post-login path. Stripe webhooks intentionally do not use same-origin checks because Stripe is the caller; they require a valid signature and configured environment. Cron routes intentionally do not use same-origin checks because the scheduler is the caller; they require the configured bearer secret. These exceptions are not general browser-callable product mutations.

Every API mutation still validates its JSON with a schema where it accepts a body, checks ownership at the API boundary, and relies on database constraints below the API. A missing external suite result is a failed release gate, not evidence of safety.

## Residual risks and required release evidence

- Supabase staging and production projects must be separate London projects with migrations applied in order and no shared secrets.
- Vercel Preview must point only at staging; Production must point only at production, with the canonical domain and HTTPS redirects verified.
- Stripe test and live keys/webhook secrets must be exercised separately; live tests use only synthetic/non-personal accounts.
- Source permission attestations, the deletion-ledger privacy/legal approval, DPIA, accessibility review, and support/incident ownership are human gates.
- The catalogue must meet the fixed commercial persona coverage gate before launch; a raw record count is insufficient.
