# Future Route Planner

A mobile-first MVP prototype for helping 16-19-year-olds compare education, apprenticeship, college, work-based, and portfolio routes without presenting advice as certain or final.

## What is included

- Sign-in/onboarding placeholder at `/`
- Full-screen five-question route-builder quiz at `/quiz`
- Mock recommendation results with local feedback/reranking at `/results`
- Compatibility roadmap landing at `/roadmap`
- Route roadmaps at `/roadmap/[routeId]`
- One saved local roadmap at `/saved-roadmap`
- One-change-at-a-time what-if simulator at `/simulator`
- Copyable parent-friendly summary at `/parent-summary`
- Compatibility summary redirect at `/summary`
- Pure deterministic scoring logic in `src/lib/scoring`
- Mock route data in `src/data/routes`
- Mock roadmap templates in `src/data/roadmaps`
- 10 test personas with broad expected ranking behavior in `src/data/test-personas`
- Practical product docs in `docs/`
- Vitest unit tests for scoring, storage, personas, and route feedback

## Route map

Canonical app routes:

- `/`
- `/quiz`
- `/results`
- `/roadmap/[routeId]`
- `/saved-roadmap`
- `/simulator`
- `/parent-summary`

Compatibility routes from the original MVP brief:

- `/roadmap` opens the saved route-specific roadmap when one exists, otherwise it points users back to results/saved roadmap.
- `/summary` redirects to `/parent-summary`.

## Run locally

Prerequisites:

- Node.js 20.19+, 22.13+, or 24+
- pnpm 11+

Install dependencies:

```bash
pnpm install
```

Start the development server:

```bash
pnpm dev
```

Then open the local URL printed by Next.js, usually:

```text
http://localhost:3000
```

## Check the project

```bash
pnpm test
pnpm lint
pnpm build
```

## Notes

This scaffold intentionally does not include real authentication, payments, or live UCAS/GOV.UK/apprenticeship APIs. It has a local catalogue boundary that can surface source-backed records after a local sync, while preserving clearly labelled demo route families as a fallback. Browser saves remain prototype-only; see `docs/adr/001-local-storage-boundary.md`.
