# Routefinder Architecture

Last reviewed: 30 July 2026

Status: authoritative technical direction. Current sections describe the repository today; release-gate sections distinguish source-complete work from external production work.

## Architectural goals

Routefinder must support a source-backed application-readiness workflow without allowing UI, AI, billing, or mock data to become the authority for eligibility or opportunity facts.

The architecture optimises for:

- explainable deterministic decisions;
- explicit provenance, freshness, and uncertainty;
- safe handling of student data;
- replaceable infrastructure vendors;
- bounded and testable AI;
- mobile-first delivery;
- incremental migration from the prototype;
- independent evolution of catalogue data and user data.

## Current system

### Runtime and framework

- Next.js 16 App Router
- React 19
- TypeScript with strict checking
- Tailwind CSS
- Vitest and Testing Library
- pnpm 11
- Node's built-in SQLite support for the local catalogue
- OpenAI SDK for optional structured roadmap generation

### Current request flows

```text
Commercial browser
  -> Next.js commercial pages and authenticated API routes
  -> read-only student Supabase role and server-owned validated mutations
  -> RLS-protected Postgres with database relationship and entitlement enforcement
  -> deterministic five-view assessments and weekly prioritisation
  -> reviewed Postgres catalogue and publication workflow
  -> Stripe Checkout and signed webhook projection

Compatibility demo browser
  -> browser storage hooks for quiz, feedback, and saved roadmap
  -> legacy deterministic route-family scoring
  -> local SQLite catalogue when available
  -> clearly labelled demo route families as fallback
```

The commercial implementation now provides the source-code boundary for accounts, durable student records, evidence mapping, applications, entitlements, payments, export, deletion, reviewed catalogue records, and operational controls. It is not a production service until external projects, credentials, reviewed catalogue content, specialist approvals, restore evidence, and production release checks pass. The browser-only prototype remains available under the demo boundary.

### Current module boundaries

| Area | Location | Responsibility |
| --- | --- | --- |
| Pages and API handlers | `src/app` | Request orchestration and route-level rendering |
| UI components | `src/components` | Reusable presentation and interaction |
| Scoring | `src/lib/scoring` | Pure deterministic scoring, board construction, feedback, and simulator comparison |
| Catalogue | `src/lib/catalog` | Source adapters, import, SQLite schema, queries, status, and freshness |
| Commercial MVP domain | `src/lib/mvp` | Validated schemas, entitlements, payment ordering, task selection, and commercial types |
| Commercial persistence | `supabase` and authenticated API routes | Postgres migrations, RLS, auth, user data, catalogue publication, payment projection, export, and deletion |
| Commercial official sources | `src/lib/catalog/commercial` | Display Advert API v2 and Discover Uni dataset boundaries |
| Browser persistence | `src/lib/*-storage.ts` | Normalised local save/load/clear operations and events |
| Client hooks | `src/lib/use-*` | React access to browser or catalogue state |
| Demo data | `src/data/routes` | Broad prototype route families only |
| Roadmap templates | `src/data/roadmaps` | Deterministic prototype roadmap fallback |
| Personas | `src/data/test-personas` | Broad behavioural test inputs and expectations |

Reusable domain logic must not move into pages or components.

## Compatibility catalogue boundary

The local catalogue uses SQLite tables for:

- source runs;
- providers;
- raw source records;
- university courses;
- apprenticeship vacancies;
- tags;
- derived route families.

It stores raw records, snapshots, hashes, first/last-seen timestamps, and freshness status. It is a development and compatibility system, not the commercial catalogue.

### Compatibility source-adapter limitations

- The UCAS adapter parses public HTML and is not an approved commercial integration.
- The Find an Apprenticeship adapter parses search HTML rather than using the official display API.
- The Discover Uni adapter currently records source pages and does not import the published dataset.
- These limitations apply only to the legacy local path. Commercial Postgres records represent requirements independently and fail closed at publication.

Do not increase dependence on these HTML shapes. Replace the adapters behind the existing source boundary with approved integrations.

## Implemented commercial architecture

```text
Mobile-first web client
  -> authenticated application API
     -> user-profile service
     -> opportunity portfolio service
     -> evidence and requirement-mapping service
     -> task and deadline service
     -> application-tracker service
     -> entitlement service
  -> recommendation engine
     -> deterministic eligibility rules
     -> explainable fit rules
     -> readiness and portfolio classification
  -> catalogue query service
     -> reviewed structured facts
     -> provenance and freshness
     -> approved-source ingestion jobs
  -> allowlisted operational audit and analytics
```

These are logical boundaries, not a requirement to deploy separate services. Begin as a modular monolith and extract services only when operational evidence justifies it.

## Core domain boundaries

### Catalogue domain

Owns providers, employers, courses, vacancies, requirements, dates, locations, application destinations, source provenance, publication state, and freshness.

It must not own student profiles, billing, or recommendation preferences.

### User domain

Owns account identity, student profile, consent state, saved opportunities, evidence, applications, tasks, shares, export, and deletion.

It references catalogue records by durable identifiers and preserves a safe snapshot of material facts used for a decision where required for auditability.

### Recommendation domain

Consumes a student profile, reviewed opportunity facts, and student-owned evidence. Produces separate eligibility, fit, readiness, confidence, and portfolio-role outputs with explanations.

It does not persist billing state or mutate verified catalogue facts.

### Post-MVP AI boundary

Receives the minimum structured context required for one task. Inputs and outputs are schema-validated. It may personalise explanations, suggested actions, feedback, and practice. It may not become a fact store, eligibility engine, or autonomous publisher.

### Entitlement domain

Owns plan access, cycle end date, fair-use allowances, payment-provider identifiers, refunds, and entitlement checks.

Components should query entitlements through one interface rather than embedding price or plan logic throughout the UI.

### Analytics boundary

Receives defined product events with data minimisation. Product analytics must not become an undeclared student-profile store. Sensitive free text and application content should not be copied into analytics events.

## Commercial data model

The first commercial model needs at least these concepts:

- `User`
- `StudentProfile`
- `Qualification`
- `Opportunity`
- `ProviderOrEmployer`
- `Requirement`
- `RequirementSource`
- `EvidenceItem`
- `EvidenceRequirementLink`
- `EligibilityAssessment`
- `ReadinessAssessment`
- `PortfolioItem`
- `Task`
- `Application`
- `ConsentRecord`
- `Entitlement`
- `SourceRun`
- `PublicationReview`
- `AuditEvent`

### Requirement fact

A material requirement should preserve:

- opportunity identifier;
- requirement type;
- structured value;
- original supporting text;
- source identifier and URL;
- retrieved timestamp;
- last verified timestamp;
- effective or application cycle where known;
- freshness status;
- conflict status;
- review and publication state.

AI-extracted text remains a draft until the publication rule for that fact is satisfied.

## Persistence strategy

### Prototype

Browser storage remains acceptable for low-risk prototype state. The local SQLite catalogue remains acceptable for development and ingestion validation.

### Commercial implementation

- Authenticated server-side storage is required before payments.
- Use a transactional database appropriate for accounts, relationships, audit history, and deletion.
- Authenticated browser/session roles may read only the rows and published catalogue columns they are authorised to see.
- Commercial mutations pass through authenticated API routes and a server-only service-role client; the service-role key is never exposed to the browser.
- A readiness profile and its qualification rows are replaced through one server-only transaction. Qualification identifiers and achieved, predicted, or unknown status are retained; a failed row mutation must not leave a partially updated profile.
- Readiness replacement, required consent evidence, and its operational audit record commit through one service-only transaction; product analytics remains explicitly best effort.
- Evidence-link updates and their assessment-version history commit through one service-only transaction.
- Active catalogue and external portfolio destinations have concurrency-safe uniqueness. A repeated save returns the existing active item.
- Database constraints and triggers independently enforce user ownership, cross-object relationships, and concurrency-safe entitlement limits.
- Database migrations revoke browser-role table and function privileges by default, then grant only explicitly reviewed read access and server RPC execution.
- Keep database access behind repository or domain interfaces.
- Treat provider selection as an implementation decision; do not leak provider SDKs through the UI.
- Use migrations and backups.
- Define retention and deletion by data category.
- Keep local UI preferences separate from recoverable product data.
- Do not migrate browser data into an account without an explicit user action and validation.

See `adr/001-local-storage-boundary.md`.

## Catalogue ingestion workflow

1. Fetch an approved source.
2. Store source-run metadata and permitted raw evidence.
3. Normalise deterministic fields.
4. Extract unstructured requirements into draft facts where necessary.
5. validate schema and qualification rules.
6. compare with published facts and flag change or conflict.
7. require human review for new, ambiguous, conflicting, or high-impact requirements.
8. publish with provenance.
9. monitor closure, staleness, and source failure.
10. withdraw or mark stale records without erasing audit history.

The official Find an Apprenticeship Display Vacancy Advert API is the preferred English vacancy source. Discover Uni/HESA may provide open university data within its licence. Comprehensive UCAS data requires an approved commercial basis.

Commercial sync stores append-only source observations and pending field revisions. External records are validated before ingestion and sent to Postgres in bounded batches of at most 100. One transaction per batch records the organisation, draft or last-seen state, restricted raw observation, hash, classification reason, and revision decision input. It may update a draft candidate, but it never overwrites a published fact: the public record remains authoritative until an authorised reviewer accepts a revision.

`source_runs` follow `running -> completed` or `running -> failed`. A source-specific database lock prevents overlap; a run abandoned for 90 minutes is changed to `failed` before a later run may begin. A run is closure-safe only when fetch, pagination, boundary validation, every observation batch, and finalisation all succeed and `complete_snapshot` is true. Only that state may close missing apprenticeship vacancies. Partial, capped, failed, and Discover Uni snapshots never close missing records.

The database keeps at most one pending revision for an opportunity. An identical observation is idempotent; an identical proposed source version reuses the pending decision; a newer proposed version supersedes the older pending revision without changing published facts. Active source issues are fingerprinted so retries do not multiply identical issues.

The admin review queue reads only safe normalised facts, bounded diffs, review metadata, and readiness failures. Raw source observations remain service-only. Opportunity facts and requirement create, edit, reverify, conflict, resolution, withdrawal, and supersession operations run through one audit-preserving database transaction.

Publication is a service-role-only database transaction attributed to an authenticated allowlisted reviewer. It fails unless the opportunity is open, in a launch sector, recently verified and unexpired, source-approved where required, attributable where derived from Discover Uni, has complete official destinations and source fields, has no passed deadline, pending revision, or unresolved source issue, and has at least one source-backed reviewed requirement. Conflicting or unsupported deterministic hard requirements block publication. The opportunity mutation, publication review, and audit event commit atomically. Withdrawal uses the same reviewed path but intentionally remains available immediately.

The pure catalogue readiness evaluator is shared by `/api/admin/catalogue/readiness` and the review API. It enforces 80 published records, ten in every sector × route cell, forty per route type, at least ten distinct providers/employers per route type with no provider above 25%, record publication gates, duplicate detection, and recent complete source runs.

## Recommendation boundary

The compatibility prototype computes fit, feasibility, constraint, confidence, and a weighted total. The commercial implementation uses separate decision views:

1. eligibility;
2. fit;
3. application readiness;
4. information confidence;
5. portfolio role.

The implemented boundary:

- keep legacy routes working;
- make demo and legacy calculations visible as prototype-only;
- keeps the new typed outputs alongside the old model;
- excludes the total score and legacy “Strong fit” language from commercial pages;
- retain deterministic tests for legacy compatibility until the old consumers are removed.

See `scoring-model.md`.

## API design rules

- Validate request bodies, query parameters, persisted records, and external responses.
- Return typed error states that distinguish unavailable, stale, incomplete, unauthorised, and invalid.
- Do not expose internal prompts, credentials, raw provider errors, or unnecessary personal data.
- Apply authentication and object-level authorisation server-side.
- Treat an authenticated Supabase client as untrusted: do not grant it direct commercial table mutation or operational-function execution.
- Scope every service-role update and deletion to the authenticated user or an independently authorised admin target.
- Make writes idempotent where retries are likely.
- Rate-limit expensive or abuse-prone endpoints.
- Log correlation identifiers and safe operational metadata.
- Keep route handlers thin and move reusable behaviour into domain modules.

## Post-MVP AI implementation rules

- Use a narrow task-specific prompt and the smallest necessary input.
- Require structured output schemas.
- Reject or safely fall back on invalid output.
- Do not send unnecessary identifiers or sensitive free text.
- Pin and evaluate model behaviour before changing production models.
- Maintain fixed evaluation cases for factuality, fabricated evidence, eligibility boundaries, unsafe writing assistance, and uncertainty.
- Record model, prompt version, latency, token use, validation result, and fallback state without logging unnecessary student content.
- Enforce per-user and per-feature cost budgets.

See `adr/002-verified-data-and-bounded-ai.md`.

## Security, privacy, and safety

Implemented source-code controls include secure session handling; read-only authenticated database roles; RLS; explicit server object authorisation; database-enforced relationship and entitlement checks; server-only rate limits, audit writes, and analytics writes; public catalogue column allowlists; consent records; export; deletion; redacted structured logging; signed payment webhooks; secure response headers; and fail-closed catalogue publication.

Raw catalogue snapshots, source-run metadata, publication reviews, payment projections, rate-limit buckets, and operational analytics are not available through anonymous or authenticated Supabase clients. A requirement is publicly readable only while both it and its parent opportunity are published.

Before commercial launch, external and specialist gates still require:

- complete threat modelling and a Data Protection Impact Assessment;
- document lawful bases, retention, subprocessors, and international transfers;
- encrypt in transit and at rest;
- protect state-changing requests;
- configure infrastructure controls and test cross-user access against staging;
- conduct accessibility testing against WCAG 2.2 AA;
- obtain specialist legal and data-protection review.

Do not treat this document as legal advice.

## Environment variables

All supported local variables must be documented in `.env.example`.

Current variables are listed in `.env.example`. The commercial groups are:

| Variable | Required | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | No | Enables optional structured roadmap generation |
| `NEXT_PUBLIC_APP_URL` | Yes | Canonical application origin and auth redirects |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Public Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only administrative database and auth operations |
| `STRIPE_SECRET_KEY` | When payments open | Server-only Stripe API access |
| `STRIPE_WEBHOOK_SECRET` | When payments open | Stripe webhook signature verification |
| `STRIPE_EXPECTED_LIVEMODE` | When payments open | Explicitly pins webhook and checkout to Stripe test (`false`) or live (`true`) mode |
| `PAYMENT_STAGING_*` | Staging integration test only | Isolated staging endpoint, Supabase service role, and Stripe test webhook secret; never production credentials |
| `COMMERCIAL_E2E_*` | Authenticated staging browser test only | Isolated project identity, anonymous key, server-only setup key, and exact acknowledgement |
| `SUPABASE_SECURITY_STAGING_*` | Destructive security test only | Explicit isolated project identity, database connection, sentinel, keys, and exact acknowledgement |
| `SUPABASE_RESTORE_TEST_*` | Destructive restore test only | Separate disposable restore target identity, API and database access |
| `RELEASE_VERIFY_*` | Strict release operator only | Exact acknowledgement and explicit selection of every external launch suite |

### Payment projection and retries

Checkout receives a short-lived reservation from the database. That reservation is the sole authority for the offer, GBP amount, application cycle, and access end date; it also atomically allocates the limited founding price and refuses a new checkout while Cycle is active. A signed webhook is accepted only in the configured Stripe environment. A completion must be `complete` and `paid`, carry validated metadata, and match its unconsumed reservation and profile.

One service-role-only, fixed-`search_path` RPC serialises each Stripe event, updates the entitlement and order, writes the minimal audit/analytics projection, and only then marks the event processed. Any required-write failure rolls back the projection. The handler records a bounded retryable `failed` marker separately and returns a non-2xx response; malformed, unsupported, and environment-mismatched events fail closed without retaining their payload. Duplicate delivery returns successfully without a second projection.

Refunds and disputes remove access. A partial refund moves the entitlement to `payment_review`, which has Free limits, until support explicitly resolves it. Same-second conflicting events are resolved conservatively: a terminal event can supersede a completion, but a completion never supersedes an existing same-second terminal event. A dispute closure never restores access automatically.
| `CRON_SECRET` | Production | Authorises entitlement-expiry jobs |
| `ADMIN_EMAILS` | Production review | Catalogue-review allowlist |
| `APPRENTICESHIP_API_KEY` | Catalogue sync | Official Display Advert API v2 |
| `DISCOVER_UNI_DATASET_URL` | Catalogue sync | Approved current HESA archive URL |
| `CATALOG_DB_PATH` | No | Overrides the local SQLite catalogue path |
| `CATALOG_APPRENTICESHIP_SYNC_MINUTES` | No | Prototype apprenticeship sync interval |
| `CATALOG_UNIVERSITY_SYNC_HOUR` | No | Prototype daily university sync hour in local process time |

Never add a secret value to `.env.example`.

## Testing strategy

### Unit

- pure recommendation rules;
- qualification and requirement evaluation, including incomplete qualification records and retained qualification identities;
- evidence mapping;
- task prioritisation;
- normalisation and state transitions;
- entitlement decisions.

### Integration

- catalogue imports, provenance, freshness, and conflict handling;
- database repositories and migrations;
- API validation and authorisation;
- direct anonymous/authenticated Supabase denial, cross-user relationship rejection, and concurrent entitlement enforcement;
- storage migration;
- AI schema validation and fallbacks;
- payment webhook idempotency.

### Behavioural personas

Test broad expectations across university-only, apprenticeship-only, combined, location-constrained, debt-averse, grade-constrained, practical, academic, and uncertain profiles. Do not encode fragile exact rankings.

### User interface

Test critical mobile flows, keyboard interaction, loading, empty, stale, conflict, error, and permission states.

### Release checks

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
pnpm docs:check
pnpm test:e2e
pnpm verify:local
pnpm release:verify
```

## Remaining production sequence

1. Create and connect separate Vercel preview/production and London Supabase staging/production projects.
2. Apply migrations, configure secrets, and run staging auth, RLS, payment, restore, and cross-user tests.
3. Import, manually verify, and spot-check the minimum source-backed launch catalogue.
4. Complete specialist policy, DPIA, safeguarding, retention, accessibility, and threat-model review.
5. Run the complete production smoke and launch-gate evidence checklist in `operations.md`.
6. Add bounded AI feedback, controlled sharing, and institutional capabilities only as separately approved post-MVP work.

The commercial validation gates and dated execution plan are in `product-decisions.md`.
