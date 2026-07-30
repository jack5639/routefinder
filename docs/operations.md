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

Run the isolated attack suite only with every `SUPABASE_SECURITY_STAGING_*` variable documented in `.env.example`, an explicit project reference, the exact acknowledgement, and a matching `environment_sentinels` row in an isolated, non-production project:

```bash
pnpm test:supabase-security
```

The command creates two disposable confirmed synthetic accounts, obtains direct anonymous/authenticated PostgREST sessions, uses the staging database connection to inspect every migration through `202607300004`, RLS, grants, triggers and constraints, and removes all synthetic rows in a verified `finally` path. It must never use production values. Only redacted project identifiers may be printed. Record the project/environment, migration versions, timestamp, operator, pass/fail result for migration/RLS, cross-user reads, browser writes, raw catalogue, cross-object relationships, entitlement concurrency, service RPCs, audit/payment integrity, and cleanup outcome. A failed or unrun suite blocks production; static migration-string tests are supplementary only.

### Authenticated commercial verification

The authenticated Playwright suite is opt-in and uses the same sentinel-marked isolated project as the locally started application:

```bash
pnpm test:e2e:commercial
```

It creates confirmed disposable users with the Admin API, establishes normal student sessions without email delivery, disables token-bearing traces/screenshots, and deletes synthetic users and catalogue fixtures in teardown. The service-role key remains in the Node test runner and must never be passed to browser code.

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

Launch requires at least 80 manually reviewed published opportunities: 10 in each technology, engineering, business and finance × university-course and apprenticeship-vacancy cell, with at least 40 of each route type. Each route type must have at least 10 distinct providers/employers and no one provider/employer may account for more than 25%. Every record must have a working official destination, an open state, no passed deadline, verified provider/employer and location, source-backed requirements, provenance, retrieved and last-verified dates, unexpired freshness, attribution where required, and reviewer. The machine-readable `/api/admin/catalogue/readiness` report must pass; a shortfall blocks launch.

### Commercial catalogue operating procedure

Source-run state is `running -> completed` or `running -> failed`. The database rejects overlapping runs for one source. A run left `running` for more than 90 minutes is failed with the bounded code `stale-running-run` before recovery. Fetch or validation errors are recorded as bounded codes; raw payloads and credentials are never sent to logs or alert webhooks.

The apprenticeship job must follow every official API page and its bounded retry policy. A cap, partial response, failed page, failed observation batch, or failed finalisation makes the run incomplete and prevents closure. Only a complete successful snapshot can mark previously observed apprenticeship vacancies missing from that run as closed. Discover Uni archive absence never closes or withdraws a course because dataset anomalies and provider course status require human investigation.

Every processed candidate creates an observation with its source run, last-seen and retrieval times, snapshot hash, classification reason, normalised facts, and a server-restricted raw fact. Draft facts may be refreshed. Published facts do not change: a field-level pending revision is created and the current reviewed value remains public. Repeated identical observations are idempotent, repeated source versions do not create another pending revision or issue, and a genuinely newer source version supersedes the obsolete pending revision.

The review queue at `/admin/catalogue` supports source, route type, sector, publication, freshness, open state, missing requirement, unclassified, pending revision, conflict/source issue, missing verification, and launch-failure filtering. Reviewers use official application and requirement-source links, compare current and proposed values, enter a note, and accept, reject, supersede, or withdraw revisions. Opportunity and requirement edits preserve previous reviewed facts in the restricted audit history.

Publication is one service-role-only transaction. It checks admin authentication at the API boundary and then fails closed in Postgres for missing source approval, non-launch or unclassified sector, closed/unknown state, missing official facts, verification older than 30 days, expired freshness, passed deadline, pending revision, unresolved source issue, missing reviewed requirement, missing supporting evidence, conflict, unsupported deterministic rule, or missing Discover Uni attribution. The publication state, review record, and audit event succeed together. Anonymous and ordinary authenticated clients have no execute grant. Withdrawal remains immediately available with a reviewer note.

The readiness report checks record-level publication failures plus the 80-record total, all eight 10-record cells, both 40-record route totals, diversity, duplicates, source-run health, and review backlog. It reports the next useful queue without exposing raw snapshots.

### Scheduled catalogue work and alerts

- `23 */6 * * *`: complete Find an Apprenticeship snapshot.
- `41 3 * * 3`: weekly Wednesday Discover Uni archive observation.
- `7 4 * * *`: stale-run recovery, freshness expiry, and pending-revision age check.

The existing optional `CATALOGUE_ALERT_WEBHOOK_URL` receives only event names, source/run identifiers, bounded error codes, and counts. Failed, incomplete, stale, unusually changed, review-backlog, old-pending-revision, and freshness-expiry conditions also use redacted server logs. No raw record or student data is included. No external monitoring vendor is implied.

### Building the minimum reviewed launch catalogue

1. Record the founder’s written permission reference for the apprenticeship API and the Discover Uni owner/contact outcome. Do not treat a credential as permission.
2. Configure source credentials only in the intended server environment and apply every migration through `202607300005`.
3. Run each source from the admin console and confirm its source run completed; only apprenticeship runs marked `complete snapshot` are closure-safe.
4. Work the unclassified, missing-verification, missing-requirement, pending-revision, and source-issue queues first.
5. For Discover Uni drafts, open the provider’s primary course page, correct the official destination and current facts, and add each requirement from that primary source. Discover Uni is not the entry-requirement authority.
6. For every requirement, preserve supporting wording, source URL, retrieval time, verification time, reviewer note, and a supported structured rule only when it is a deterministic A-level or GCSE grade rule.
7. Use the eight readiness cells to maintain at least 10 reviewed records in each cell, at least 40 of each route type, and the documented diversity rule. Do not fill shortfalls with demo, fabricated, automatically inferred, or unreviewed records.
8. Resolve or explicitly reject/supersede source revisions and source issues. Withdraw any record whose safety is uncertain.
9. Publish one record at a time through the reviewed transaction. Record the reviewer and reason.
10. Do not open launch until `/api/admin/catalogue/readiness` returns `ready: true` and the separate security, policy, accessibility, payment, restore, and production gates pass.

No review-manifest import/export was added. The filtered queue remains the single review system and avoids a second path that could drift from the database publication authority.

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

Use distinct project references and database URLs, the exact acknowledgement, and a matching disposable `restore-test` sentinel in the target before restoration. Verify migrations, schema security, authentication references, a synthetic profile/qualification/portfolio/evidence/task/application export-and-delete cycle, retained-record anonymisation, cleanup, and deletion replay. Record date, operator, backup identifier, result, follow-up actions, and when the restore project was destroyed. Never restore over staging or production.

Deletion-ledger replay remains a launch blocker. A database backup cannot contain a deletion tombstone created after that backup point, so an in-database table would give false assurance. Before implementation, the founder and privacy/legal reviewer must approve the separately durable ledger store, minimum fields, lawful basis, retention period, access, encryption, and destruction procedure. `pnpm db:restore-test` verifies the other restore controls and exits non-zero at this explicit decision boundary.

### Release command

`pnpm verify:local` runs ordinary non-destructive local/CI-equivalent checks. `pnpm release:verify` is strict and requires the exact release acknowledgement plus explicit `1` flags for the isolated Supabase attack, authenticated commercial Playwright, Stripe staging, and restore suites. A missing selection is reported as `required-but-skipped` and fails the run. Each suite prints a concise human status and the orchestrator emits a credential-free JSON summary.

## Support and incidents

### Support and account recovery

The founder owns `support@routefinder.app` before launch and publishes monitored hours and response targets. Staff never ask for magic links, passwords, card details, evidence, grades, or full application content. Recovery uses Supabase email authentication; identity exceptions require a documented, privacy-reviewed process.

### Source corrections

Create a source issue, preserve the reported URL and minimal detail, compare primary sources, mark conflicts visibly, withdraw unsafe records, record the review, and tell the reporter the outcome when contact is available. Revenue and partnerships never affect the result.

### Refunds and complaints

Payment support checks Stripe event IDs and entitlement audit history. Approved refunds update Stripe and end entitlement through the webhook. Complaints receive a case owner, acknowledgement, evidence review, outcome, and second-review route. Safeguarding, privacy, discrimination, or legal matters use the relevant specialist procedure.

### Stripe staging verification

Before enabling a live Stripe key, apply every payment migration to the isolated staging Supabase project and run the opt-in payment integration suite with `PAYMENT_STAGING_BASE_URL`, `PAYMENT_STAGING_SUPABASE_URL`, `PAYMENT_STAGING_SUPABASE_SERVICE_ROLE_KEY`, and `PAYMENT_STAGING_STRIPE_WEBHOOK_SECRET`. Confirm a Stripe test-mode signed webhook for each of: one paid completion, duplicate concurrent delivery, an unpaid/incomplete completion, wrong currency/amount/metadata, full refund, partial refund, dispute creation, dispute closure, an older completion after a terminal event, and a temporary database failure followed by retry. Record the migration versions, event IDs (redacted where required), resulting entitlement/order/event states, and cleanup result. Do not use live customer data or a production project for this procedure.

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
