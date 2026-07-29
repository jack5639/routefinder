# Routefinder

Routefinder is a mobile-first application-readiness workspace for English late-Year-12 and early-Year-13 students preparing university, higher-apprenticeship, and degree-apprenticeship applications.

The commercial direction focuses first on technology, engineering, business, and finance. It helps students compare real opportunities, understand published requirements, map their genuine evidence, see gaps and uncertainty, and complete useful actions before deadlines.

Routefinder is a decision and preparation aid. It does not predict admission, replace an adviser, or write applications for students.

## Repository status

This repository currently contains a working prototype and the foundations of a source-backed catalogue. It is not yet the paid commercial product described in the strategy.

Implemented today:

- five-question browser-saved route quiz;
- deterministic route-family scoring and recommendation feedback;
- results decision board;
- route roadmaps, one saved roadmap, simulator, and parent summary;
- clearly labelled demo route families;
- local SQLite catalogue, source runs, snapshots, freshness status, and API boundaries;
- prototype UCAS, Discover Uni, and Find an Apprenticeship source adapters;
- structured AI roadmap generation with a template fallback;
- Vitest coverage for scoring, storage, catalogue, personas, and generation boundaries.

Important limitations:

- saved student state is browser-only and device-specific;
- authentication, payments, entitlements, secure user storage, evidence mapping, and application tracking are not implemented;
- source adapters are prototypes and are not approved commercial data integrations;
- demo records must not be presented as verified opportunities;
- the current total-score UI is a migration target, not the intended commercial recommendation model.

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

`OPENAI_API_KEY` is optional. Without it, generated roadmaps use the deterministic template fallback.

## Quality checks

```bash
pnpm test
pnpm lint
pnpm build
pnpm docs:check
```

Run the relevant checks before handing off a change. `docs:check` validates required documents, internal links, the documentation index, retired duplicate plans, conflict markers, and `.env.example` coverage. If the environment prevents a check, report that limitation rather than implying success.

## Catalogue commands

```bash
pnpm data:init
pnpm data:sync
pnpm data:status
pnpm data:agent
```

The catalogue defaults to `data/catalog/catalog.sqlite`. Local databases and snapshots are ignored by Git.

The current source adapters fetch and parse public pages for prototype validation. Do not operate them as the commercial data pipeline. The target data policy requires approved APIs, open datasets with attribution, licensed data where necessary, provenance, freshness, conflict handling, and human review for high-impact requirements.

## Current route map

| Route | Current purpose |
| --- | --- |
| `/` | Prototype landing and onboarding |
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
src/lib/*-storage.ts        Prototype browser-persistence boundaries
scripts/catalog/            Catalogue command entry point
docs/                       Product, architecture, recommendation, and ADR sources of truth
```

## Documentation

Use [docs/README.md](docs/README.md) to find the authoritative document for a task. Do not introduce a second product plan, backlog, or architecture description when an existing source of truth can be updated.
