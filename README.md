# Future Route Planner

A mobile-first MVP prototype for helping 16-19-year-olds compare education, apprenticeship, college, work-based, and portfolio routes without presenting advice as certain or final.

## What is included

- Landing page at `/`
- Route-builder quiz placeholder at `/quiz`
- Mock recommendation results at `/results`
- Route roadmaps at `/roadmap/[routeId]`
- One saved local roadmap at `/saved-roadmap`
- Basic what-if simulator at `/simulator`
- Pure deterministic scoring logic in `src/lib/scoring`
- Mock route data in `src/data/routes`
- Mock roadmap templates in `src/data/roadmaps`
- 10 test personas in `src/data/test-personas`
- Vitest unit tests for scoring behavior

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

This scaffold intentionally does not include authentication, payments, live UCAS/GOV.UK/apprenticeship APIs, account storage, or shareable parent summaries yet. Route data is mocked so the scoring and UX can be shaped before adding live integrations.
