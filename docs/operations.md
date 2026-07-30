# Routefinder Production Operations

## Status and ownership

This document is the durable operating baseline for the customer-ready MVP planned for 15 October 2026. The founder owns each procedure until a named delegate is recorded. Privacy, terms, safeguarding, complaints, accessibility, refunds, and retention require specialist review before the production launch gate can pass.

## Environments and release

- Vercel preview uses the staging Supabase project; the production Vercel project uses only the production Supabase project.
- Both Supabase projects must be created in London. Vercel functions use `lhr1`.
- Preview and production credentials must never be copied into `.env.local`, source control, logs, screenshots, or support tickets.
- Production is opened only from a commit that passed test, lint, strict type-check, production build, documentation, browser, accessibility, security, privacy, payment, restore, and catalogue gates. Apply every Supabase migration, including direct-database-access hardening migrations, to staging before production and record the RLS/direct-RPC verification result.
- Local SQLite is restricted to the labelled prototype and catalogue development. Commercial routes read Postgres.

### Direct Supabase security verification

Applied migrations are immutable history. Never repair a deployed project by editing an older migration. Before applying a new migration, query each known staging and production project's `supabase_migrations.schema_migrations` ledger (or use the linked Supabase CLI migration listing) and record whether `202607290001` and all later versions are present. Apply the forward-only repair migration to staging before production.

Run the isolated attack suite only with the five `SUPABASE_SECURITY_STAGING_*` variables documented in `.env.example` and an isolated, non-production staging project:

```bash
pnpm test:supabase-security
```

The command creates two disposable confirmed synthetic accounts, obtains direct anonymous/authenticated PostgREST sessions, uses the staging database connection to inspect migration/RLS/trigger metadata, and deletes the accounts in a `finally` block. It must never use production values. Record the project/environment, migration versions, timestamp, redacted synthetic-account identifiers, operator, pass/fail result for migration/RLS, cross-user reads, browser writes, raw catalogue, cross-object relationships, entitlement concurrency, service RPCs, and audit/payment integrity, plus cleanup outcome. A failed or unrun suite blocks production; static migration-string tests are supplementary only.

## Data map and DPIA baseline

| Data | Purpose | Store | Access | Default retention |
| --- | --- | --- | --- | --- |
| Account email and session | Authentication and recovery | Supabase Auth | Student; authorised operations | Account lifetime plus approved security retention |
| Readiness profile and qualifications | Requirement comparison | Supabase Postgres | Student read via RLS; authenticated API mutation | Until deletion or retention process |
| Portfolio, evidence, mappings, tasks, applications | Application preparation | Supabase Postgres | Student read via RLS; authenticated API mutation | Until deletion or retention process |
| Consent and audit records | Prove policy choice and investigate changes | Supabase Postgres | Student for own readable records; authorised operations | Period set by specialist review |
| Entitlement and Stripe event IDs | Access, refund, dispute, tax, and fraud controls | Supabase Postgres and Stripe | Student entitlement read; server-only payment writes | Statutory and dispute period |
| Allowlisted analytics | Product funnel without a shadow profile | Supabase Postgres | Restricted product operations | Aggregated then deleted on approved schedule |
| Catalogue facts and source runs | Verifiable opportunity display | Supabase Postgres | Allowlisted published columns only; raw records and writes restricted to admin operations | While current plus audit history |

The MVP deliberately excludes uploads, detailed sensitive circumstances, public profiles, messages, parent sharing, coaching, schools, and generative AI. Key risks are users under 18, educational inferences, account takeover, object-authorisation failure, sensitive free text, stale opportunity facts, and payment disputes. Controls include data minimisation, magic links, read-only authenticated database roles, RLS, server-owned mutations, database relationship and entitlement enforcement, provenance, publication review, explicit unknown states, export, deletion, redacted logs, server-only rate limits, and no behavioural advertising.

The specialist DPIA review must confirm lawful bases, age-appropriate transparency, children’s best interests, necessity and proportionality, data-subject rights, international transfers, residual risk, and ICO consultation threshold.

## Catalogue source register and launch gate

The founder owns the source register and must record a written approval reference before a source can create commercial published records. A configured API key is not evidence of permission. Automated imports create candidates or pending revisions; human review is always required for published material facts.

| Source | Owner and evidence | Access and permitted-use position | Attribution | Cadence and failure policy | Approval status |
| --- | --- | --- | --- | --- | --- |
| Find an Apprenticeship Display Vacancy Advert API v2 | [API catalogue](https://www.api.gov.uk/tas/display-vacancy-advert-api/) | API key and commercial/display terms must be confirmed with the source owner. Pagination/rate limits are treated as contractual integration parameters, not inferred from this repository. | Record any wording supplied by the source owner before publication. | Six-hour incremental full snapshot; no closure after incomplete/failed run; alert and investigate failed runs. | **Blocked** until founder records written permission in `APPRENTICESHIP_SOURCE_APPROVAL_REFERENCE`. |
| Discover Uni dataset | [HESA Discover Uni dataset](https://www.hesa.ac.uk/support/tools-and-downloads/unistats) | CC BY 4.0: reuse is allowed with credit, licence link, and indication of changes. HESA advises onward users to contact it about presentation considerations. Provider pages remain authoritative for application facts and requirements. | “HESA, www.hesa.ac.uk”, CC BY 4.0, with a link and statement of changes. | Weekly Wednesday check; imported courses remain drafts until provider-source review. | Record owner confirmation/contact outcome in `DISCOVER_UNI_SOURCE_APPROVAL_REFERENCE`; not a substitute for provider verification. |
| UCAS comprehensive course listings | [UCAS Courses Data Service](https://www.ucas.com/business/all-our-commercial-marketing-and-data-products) | Do not import or scrape comprehensive UCAS listings. UCAS advertises a paid Courses Data Service; use only after a separately approved commercial agreement. | As specified by the agreement. | No automated ingestion. | **Blocked** without executed UCAS agreement. |

Launch requires at least 80 manually reviewed published opportunities: 10 in each technology, engineering, business and finance × university-course and apprenticeship-vacancy cell, with at least 40 of each route type and meaningful provider/employer diversity. Every record must have a working official destination, correct/open or explicitly unknown deadline, verified provider/employer and location, source-backed requirements, provenance, retrieved and last-verified dates, freshness, attribution, and reviewer. The machine-readable `/api/admin/catalogue/readiness` report must pass; a shortfall blocks launch.

## Subprocessors

| Processor | Purpose | Production condition |
| --- | --- | --- |
| Vercel | Next.js hosting and function execution | DPA, region, retention, access, and incident terms reviewed |
| Supabase | Authentication, Postgres, backups | London project, RLS tests, DPA, restore test, and restricted service role |
| Stripe | One-time payments, refunds, disputes | Webhook signature tests, DPA, privacy notice, and support process |

No analytics, email, support, AI, or catalogue vendor is added without updating this list, the data map, public notices, and consent analysis.

## Retention and deletion

- Account deletion removes the authentication user and cascades student-owned records.
- Minimal payment, tax, fraud, dispute, complaint, breach, and legal records may be retained only for an approved period and anonymised where practical.
- Backup rotation must be documented in Supabase settings. Deleted records are not restored for ordinary product use.
- When a disaster restore reintroduces data deleted after the backup point, the deletion ledger and audit record must be replayed before service resumes.
- Retention processing runs on a documented schedule and produces counts, not student content, in operational logs.

## Backup and restore

Enable scheduled staging and production backups in Supabase. At least quarterly, restore a recent staging backup into a new isolated restore-test project:

```bash
pnpm db:restore-test
```

Use distinct database URLs and the exact acknowledgement in `.env.example`. Verify migrations, table counts, RLS, authentication references, a synthetic profile/export/delete cycle, and deletion replay. Record date, operator, backup identifier, result, follow-up actions, and when the restore project was destroyed. Never restore over staging or production.

## Support and incidents

### Support and account recovery

The founder owns `support@routefinder.app` before launch and publishes monitored hours and response targets. Staff never ask for magic links, passwords, card details, evidence, grades, or full application content. Recovery uses Supabase email authentication; identity exceptions require a documented, privacy-reviewed process.

### Source corrections

Create a source issue, preserve the reported URL and minimal detail, compare primary sources, mark conflicts visibly, withdraw unsafe records, record the review, and tell the reporter the outcome when contact is available. Revenue and partnerships never affect the result.

### Refunds and complaints

Payment support checks Stripe event IDs and entitlement audit history. Approved refunds update Stripe and end entitlement through the webhook. Complaints receive a case owner, acknowledgement, evidence review, outcome, and second-review route. Safeguarding, privacy, discrimination, or legal matters use the relevant specialist procedure.

### Security incident or breach

1. Contain access without destroying evidence.
2. Record times, systems, categories, approximate people affected, and owner.
3. Rotate exposed credentials and revoke sessions where justified.
4. Preserve redacted logs and verify RLS and object authorisation.
5. Assess risk to people, regulator notification, and user communication with specialist advice.
6. Correct the cause, test the correction, and record follow-up work.

### Safeguarding escalation

Minimise the record, restrict it to the designated owner, avoid promising secrecy, and seek qualified safeguarding advice. Routefinder support is not an emergency service. Immediate danger is directed to emergency services and a trusted adult or responsible professional.

## Launch evidence

Before opening the production domain, attach or link:

- specialist approvals and policy versions;
- 390px, desktop, keyboard, screen-reader, and WCAG 2.2 AA results;
- threat model plus direct-Supabase, cross-user, cross-object, concurrent-entitlement, raw-catalogue, audit-integrity, and rate-limit authorisation results;
- backup restore record;
- Stripe checkout, duplicate/reordered webhook, refund, dispute, and expiry results;
- production smoke-test record using non-personal test accounts;
- catalogue review list proving sector coverage, source, verification, freshness, and closure checks;
- support, refund, source-correction, incident, complaint, and safeguarding owners and response targets.
