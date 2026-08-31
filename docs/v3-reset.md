# Routefinder V3 Reset and Migration Boundary

Last updated: 31 August 2026

Status: authoritative Phase 0 guidance for separating the frozen V2 repository from future V3 work. It is not a V3 product specification.

## Purpose

Routefinder is changing direction to the mission in [`product-direction.md`](product-direction.md): **give every student a personalised careers strategist**.

V2 remains functional and preserved. V3 has no implemented product workflow, domain model, or feature architecture yet. Future work must validate the new direction before deciding what to retain, replace, or migrate.

## Likely reusable infrastructure

These areas appear broadly useful, subject to V3 requirements and normal review:

| Area | Existing locations | Reuse guidance |
| --- | --- | --- |
| Framework and developer tooling | Next.js, React, TypeScript, Tailwind, Vitest, Playwright, ESLint, `package.json` | Reuse as the runtime and quality baseline unless a future technical decision changes it. |
| Tests and delivery checks | `src/**/*.test.*`, `scripts/`, CI configuration | Reuse the testing and release discipline; replace V2 behavioural expectations only when V3 is designed. |
| Source and catalogue boundaries | `src/lib/catalog/`, `src/lib/catalog/commercial/` | Preserve adapters, normalisation, source identity, provenance, freshness, conflict, and review patterns. Evaluate source coverage and licences for V3 separately. |
| Boundary validation and request safety | Zod schemas, API route validation, `src/lib/same-origin.ts`, logging and environment helpers | Reuse the patterns, not automatically the V2 request shapes or error copy. |
| Structured AI patterns | V2 structured-generation route and validation helpers | Reuse narrow inputs, schema validation, auditing, cost limits, and fallbacks only after V3 defines a safe AI job. |
| Security and persistence patterns | Supabase boundary, migrations, RLS, audit, export, deletion, and deletion ledger | Preserve privacy, authorisation, and audit lessons. Re-evaluate every V2 table, policy, and lifecycle against the V3 data model. |

## Legacy V2 product-specific code

These areas are preserved for compatibility and research but must not become V3 defaults:

| V2 concern | Main locations |
| --- | --- |
| Quiz profile and browser persistence | `src/app/quiz/`, `src/lib/quiz-storage.ts`, `src/lib/use-saved-quiz-answers.ts`, `src/data/default-answers.ts`, `QuizAnswers` in `src/types.ts` |
| Route-family recommendation and aggregate scoring | `src/lib/scoring/`, `src/lib/route-feedback-storage.ts`, `src/lib/use-route-feedback.ts`, `RouteOption` and `ScoredRoute` in `src/types.ts` |
| Results board and simulator | `src/app/results/`, `src/app/simulator/`, related route-card and score-bar components |
| Route roadmap experience | `src/app/roadmap/`, `src/app/saved-roadmap/`, `src/lib/roadmaps/`, `src/lib/saved-roadmap-storage.ts`, `src/data/roadmaps/` |
| Parent summary | `src/app/parent-summary/`, `src/app/summary/` |
| V2 application-readiness workspace | `src/app/start/`, `src/app/(workspace)/`, `src/lib/mvp/`, V2 portfolio, evidence, task, application, entitlement, and payment routes |
| V2 product data and personas | `src/data/routes/`, `src/data/test-personas/` |

The V2 commercial catalogue, eligibility, evidence, and application flows may contain valuable operational ideas, but their route- and application-centred purpose is legacy product logic.

## Unknown: evaluate after V3 validation

| Area | Why it is not pre-approved for reuse |
| --- | --- |
| UI components and page shells | Some are generic; others encode V2 copy, navigation, or assumptions. |
| Authentication, account, and consent flows | Their security controls are valuable, but V3’s identity, age, data-minimisation, retention, and sharing needs are unknown. |
| Payments and entitlements | The V2 Cycle offer and limits are not V3 pricing decisions. |
| Commercial database schema | Ownership and audit patterns may transfer, while V2 opportunity, evidence, application, and assessment tables may not. |
| AI prompts and roadmap schemas | Their output-safety patterns may transfer; their route/roadmap content model must not. |

## Working rules for V3

1. Put new V3 product code under [`../src/v3/README.md`](../src/v3/README.md) until V3 has a validated architecture.
2. Keep V2 routes and tests working. Do not move, rename, or delete V2 code merely to make the tree look cleaner.
3. Do not import V2 quiz, scoring, roadmap, readiness, or application types into V3 without a documented migration decision.
4. Retain relevant source, privacy, security, and AI safeguards from accepted ADRs; update an ADR only when making a durable replacement decision.
5. Treat the active [`product-direction.md`](product-direction.md) as intentionally incomplete. User validation, not Phase 0 scaffolding, determines V3’s detailed product model.
