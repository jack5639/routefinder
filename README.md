# Routefinder

Routefinder is a mobile-first application-readiness workspace for English late-Year-12 and early-Year-13 students preparing university, higher-apprenticeship, and degree-apprenticeship applications.

The commercial direction focuses first on technology, engineering, business, and finance. It helps students compare real opportunities, understand published requirements, map their genuine evidence, see gaps and uncertainty, and complete useful actions before deadlines.

Routefinder is a decision and preparation aid. It does not predict admission, replace an adviser, or write applications for students.

## Repository status

This repository contains the customer-ready MVP implementation scheduled for 15 October 2026, alongside a clearly separated compatibility demo. External infrastructure, reviewed launch catalogue content, production credentials, and specialist approvals are still release gates.

Commercial MVP implementation:

- Supabase email magic-link authentication, protected pages, Postgres migrations, RLS, audit and consent records;
- readiness check with explicit unknown qualification states;
- published-opportunity search, official apprenticeship API ingestion, Discover Uni archive verification, manual provider-source entry, and fail-closed publication review;
- five deterministic decision views with source facts, risks, missing information, and direct-check actions;
- server-owned portfolio, evidence bank, requirement mapping, weekly actions, and application tracker;
- Free and Cycle limits, one-time Stripe Checkout, signed idempotent webhooks, refunds, disputes, and cycle expiry;
- allowlisted analytics, source reporting, JSON export, explicit prototype import, and account deletion;
- commercial landing, pricing, source-backed guides, policy baselines, health checks, secure headers, redacted logging, CI, component tests, and browser-test infrastructure.

Compatibility demo implementation:

- browser-saved route quiz, route-family scoring, roadmaps, saved roadmap, simulator, and parent summary;
- clearly labelled demo catalogue data and local SQLite catalogue development;
- legacy experimental AI roadmap endpoint with a deterministic fallback.

Release gates not satisfiable from source code alone:

- create and configure separate London-region staging and production Supabase projects;
- connect separate Vercel preview and production projects and production domain;
- provide Stripe and official catalogue credentials;
- populate and review the minimum launch catalogue without demo records;
- complete specialist legal, privacy, safeguarding, accessibility, refund, complaint, and retention review;
- run and record production restore, security, accessibility, payment, catalogue, and smoke-test exercises.

## Start here

Before making changes, read [AGENTS.md](AGENTS.md) and the [documentation index](docs/README.md). They define required reading, sources of truth, safety constraints, and completion criteria.

The final product and commercial direction is in [docs/product-decisions.md](docs/product-decisions.md).

## Requirements

- Node.js 20.19+, 22.13+, or 24+
- pnpm 11

The project uses the package manager pinned in `package.json`.

## Local setup

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open the local URL printed by Next.js, normally `http://localhost:3000`.

`OPENAI_API_KEY` is optional and applies only to the legacy demo. Generative AI is not part of the commercial MVP.

## Quality checks

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
pnpm docs:check
pnpm test:e2e
pnpm verify:local
```

Run the relevant checks before handing off a change. `docs:check` validates required documents, internal links, the documentation index, retired duplicate plans, conflict markers, and `.env.example` coverage. If the environment prevents a check, report that limitation rather than implying success.

`verify:local` runs the ordinary non-destructive source and public-browser gates. `release:verify` is a separate strict operator command: it fails unless every isolated Supabase security, authenticated commercial, Stripe staging, and restore suite is explicitly selected and configured. It never substitutes production credentials for missing test configuration.

## Catalogue commands

```bash
pnpm data:init
pnpm data:sync
pnpm data:status
pnpm data:agent
```

The catalogue defaults to `data/catalog/catalog.sqlite`. Local databases and snapshots are ignored by Git.

The local commands above are for the compatibility catalogue. Commercial ingestion uses the Find an Apprenticeship Display Advert API v2 and the Discover Uni/HESA dataset boundary, then requires human publication review. Do not use the prototype HTML parsers commercially.

Commercial catalogue operation is performed from `/admin/catalogue` by an account in `ADMIN_EMAILS`. The review workspace provides a server-paged queue, source and readiness filters, safe source-change diffs, reviewed opportunity and requirement editing, and the authoritative launch-readiness report. Source credentials and founder-recorded approval references are hard gates. Imports create drafts or pending revisions only; the service-role-only database publication transaction is the sole publication path.

The scheduled commercial cadence is:

- Find an Apprenticeship full snapshot every six hours;
- Discover Uni archive observation each Wednesday;
- daily stale-run recovery, freshness expiry, and old-review-backlog checks.

Only a complete successful apprenticeship snapshot can close missing vacancies. Discover Uni absence never automatically closes or withdraws a course.

## Current route map

| Route | Current purpose |
| --- | --- |
| `/` | Commercial landing page |
| `/demo` | Clearly labelled prototype entry |
| `/signin` | Supabase email magic-link sign-in |
| `/readiness` | Authenticated readiness check |
| `/app` | Authenticated `This Week` home |
| `/opportunities` | Published commercial opportunity search |
| `/portfolio` | Five decision views and gap map |
| `/evidence` | Evidence bank and requirement mapping |
| `/tracker` | Application tracker |
| `/account` | Entitlement, export, explicit import, deletion, and sign-out |
| `/admin/catalogue` | Allowlisted internal source and publication review |
| `/pricing` | Free and one-time Cycle offer |
| `/quiz` | Browser-saved route quiz |
| `/results` | Deterministic comparison board |
| `/roadmap/[routeId]` | Route-specific prototype roadmap |
| `/saved-roadmap` | Locally saved roadmap |
| `/simulator` | One-factor comparison simulator |
| `/parent-summary` | Locally generated parent-friendly summary |
| `/roadmap` | Compatibility entry to saved or selected roadmap |
| `/summary` | Compatibility redirect to parent summary |

Do not remove compatibility routes without an explicit migration decision.

## Repository structure

```text
src/app/                    Next.js pages and API route handlers
src/components/             Reusable UI components
src/data/routes/            Clearly labelled demo route families
src/data/roadmaps/          Prototype deterministic roadmap templates
src/data/test-personas/     Broad recommendation test personas
src/lib/scoring/            Pure scoring and recommendation logic
src/lib/catalog/            Catalogue ingestion, SQLite, queries, and freshness
src/lib/catalog/commercial/ Commercial official-source ingestion boundaries
src/lib/mvp/                Commercial schemas, entitlements, tasks, and types
src/lib/*-storage.ts        Prototype browser-persistence boundaries
scripts/catalog/            Catalogue command entry point
supabase/                   Postgres migrations, local configuration, and seed
docs/                       Product, architecture, recommendation, and ADR sources of truth
```

## Documentation

Use [docs/README.md](docs/README.md) to find the authoritative document for a task. Do not introduce a second product plan, backlog, or architecture description when an existing source of truth can be updated.
