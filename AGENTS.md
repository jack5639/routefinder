# Future Route Planner Agent Guide

## Project

This is an MVP for a careers and education route planner for 16-19-year-olds. It helps users compare university, apprenticeships, college, foundation, Access, work-based, and portfolio routes without presenting any route as certain or final.

## Product Principles

- Be supportive, cautious, and non-judgemental.
- Never describe students as smart, dumb, incapable, or ruled out.
- Use language such as high academic attainment, grade-constrained, debt-averse, location-constrained, practical learner, portfolio-oriented, and competitive-course applicant.
- Route recommendations are decision aids, not careers advice. They should help compare trade-offs and next steps.
- Do not say "best route", "you should do this", "you cannot do this", or "you are not smart enough".
- Prefer cautious copy such as "currently looks strong", "may be harder because", "could improve your chances by", and "worth checking directly".
- Every recommendation should show reasons, risks, missing information, next steps, backup options, and confidence limits.
- Real data integration is coming next. Keep copy clear that current route records are demo/mock data until source-backed data replaces them.
- Avoid dark patterns in freemium, saving, or parent-summary flows.

## Engineering Principles

- Use TypeScript and keep logic deterministic unless the task explicitly adds another approach.
- Keep scoring, UI, route data, storage, and recommendation feedback separated.
- Keep pure recommendation/scoring logic in `src/lib/scoring`.
- Keep browser persistence helpers in `src/lib/*-storage.ts`.
- Keep mock route data in `src/data/routes`.
- Keep roadmap templates in `src/data/roadmaps`.
- Keep test personas and broad expectation metadata in `src/data/test-personas`.
- Do not overfit scoring or tests around the current mock data. Real provider-backed route records should be able to replace the demo catalogue without a redesign.
- Keep mobile-first layouts stable: no overflowing labels, cramped buttons, or hidden key actions on small screens.

## Required Tests

Add or update tests when changing:

- scoring and ranking behavior
- browser storage normalisation or events
- route recommendation feedback and reranking
- saved roadmap behavior
- quiz answer persistence
- test personas and broad expected ranking behavior

Persona tests should check broad route-type expectations, constraints, and backup/stretch behavior rather than brittle exact ordering unless a specific current route is intentionally being protected.

## Current MVP Constraints

- Do not expand mock route data as a substitute for real integration.
- Do not integrate live UCAS, GOV.UK, apprenticeship, provider, salary, finance, or travel APIs until the data-integration phase.
- Do not redesign quiz branching or expand the scoring model weights unless that is the task.
- Do not deepen roadmap generation, simulator scope, or parent-summary content unless required by compatibility work.
- Do not add payments, AI generation, or account storage until the core deterministic experience is reliable.
- Do not collect unnecessary sensitive data.

## Commands

Use the package manager declared in `package.json`.

- `pnpm dev`
- `pnpm lint`
- `pnpm test`
- `pnpm build`

## Definition Of Done

A task is complete only when:

- the feature works on mobile-sized layouts
- relevant tests pass
- lint and build pass, or any failure is clearly reported
- copy stays cautious and supportive
- route recommendations remain explainable decision aids
- implementation does not break `/results`, `/roadmap/[routeId]`, `/saved-roadmap`, `/parent-summary`, `/summary`, or `/roadmap`
- future real-data integration has not been made harder by mock-data-specific assumptions
