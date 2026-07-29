# Routefinder Production Operations

## Status and ownership

This document is the durable operating baseline for the customer-ready MVP planned for 15 October 2026. The founder owns each procedure until a named delegate is recorded. Privacy, terms, safeguarding, complaints, accessibility, refunds, and retention require specialist review before the production launch gate can pass.

## Environments and release

- Vercel preview uses the staging Supabase project; the production Vercel project uses only the production Supabase project.
- Both Supabase projects must be created in London. Vercel functions use `lhr1`.
- Preview and production credentials must never be copied into `.env.local`, source control, logs, screenshots, or support tickets.
- Production is opened only from a commit that passed test, lint, strict type-check, production build, documentation, browser, accessibility, security, privacy, payment, restore, and catalogue gates.
- Local SQLite is restricted to the labelled prototype and catalogue development. Commercial routes read Postgres.

## Data map and DPIA baseline

| Data | Purpose | Store | Access | Default retention |
| --- | --- | --- | --- | --- |
| Account email and session | Authentication and recovery | Supabase Auth | Student; authorised operations | Account lifetime plus approved security retention |
| Readiness profile and qualifications | Requirement comparison | Supabase Postgres | Student via RLS | Until deletion or retention process |
| Portfolio, evidence, mappings, tasks, applications | Application preparation | Supabase Postgres | Student via RLS | Until deletion or retention process |
| Consent and audit records | Prove policy choice and investigate changes | Supabase Postgres | Student for own readable records; authorised operations | Period set by specialist review |
| Entitlement and Stripe event IDs | Access, refund, dispute, tax, and fraud controls | Supabase Postgres and Stripe | Student entitlement read; server-only payment writes | Statutory and dispute period |
| Allowlisted analytics | Product funnel without a shadow profile | Supabase Postgres | Restricted product operations | Aggregated then deleted on approved schedule |
| Catalogue facts and source runs | Verifiable opportunity display | Supabase Postgres | Public only after review; admin write | While current plus audit history |

The MVP deliberately excludes uploads, detailed sensitive circumstances, public profiles, messages, parent sharing, coaching, schools, and generative AI. Key risks are users under 18, educational inferences, account takeover, object-authorisation failure, sensitive free text, stale opportunity facts, and payment disputes. Controls include data minimisation, magic links, RLS, server authorisation, provenance, publication review, explicit unknown states, export, deletion, redacted logs, rate limits, and no behavioural advertising.

The specialist DPIA review must confirm lawful bases, age-appropriate transparency, children’s best interests, necessity and proportionality, data-subject rights, international transfers, residual risk, and ICO consultation threshold.

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
- threat model and cross-user authorisation results;
- backup restore record;
- Stripe checkout, duplicate/reordered webhook, refund, dispute, and expiry results;
- production smoke-test record using non-personal test accounts;
- catalogue review list proving sector coverage, source, verification, freshness, and closure checks;
- support, refund, source-correction, incident, complaint, and safeguarding owners and response targets.
