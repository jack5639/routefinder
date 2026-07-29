# Routefinder Agent Guide

## Purpose

Routefinder is an application-readiness workspace for late Year 12 and early Year 13 students in England applying to university, higher apprenticeships, degree apprenticeships, or a combination of these.

The commercial launch focuses on technology, engineering, business, and finance. University opportunities may be in England, Wales, or Scotland; apprenticeship vacancies are England-only.

Routefinder helps students understand verified requirements, connect their genuine evidence to those requirements, see gaps and uncertainty, and complete useful actions before deadlines. It is a decision and preparation aid, not a careers adviser, admissions predictor, or application-writing service.

## Mandatory Reading Before Work

For every task:

1. Read this file completely.
2. Read [`docs/README.md`](docs/README.md) and follow its task-routing table.
3. Read every document marked required for the type of change.
4. Inspect the current implementation and relevant tests before editing.
5. Check whether the requested work conflicts with a recorded decision. If it does, explain the conflict before changing direction.

Do not rely on an old task description, stale plan, or filename alone. Code describes current behaviour; the documents below describe intended behaviour and constraints.

### Required documents by task

| Change | Read before working |
| --- | --- |
| Product scope, pricing, users, workflow, growth, or priorities | `docs/product-decisions.md` |
| Pages, APIs, storage, catalogue, authentication, or module boundaries | `docs/architecture.md` and relevant ADRs |
| Scoring, ranking, eligibility, fit, readiness, confidence, portfolio roles, or feedback | `docs/scoring-model.md` and `docs/adr/002-verified-data-and-bounded-ai.md` |
| Local storage, accounts, sharing, export, deletion, or user data | `docs/adr/001-local-storage-boundary.md` and `docs/architecture.md` |
| Catalogue sources, requirements, freshness, AI, or agents | `docs/product-decisions.md`, `docs/architecture.md`, and `docs/adr/002-verified-data-and-bounded-ai.md` |
| Copy, recommendations, parent/adviser summaries, or onboarding | Product principles in this file and the relevant workflow in `docs/product-decisions.md` |
| Tests, build tooling, dependencies, or developer setup | `README.md`, `docs/architecture.md`, and `package.json` |

If several rows apply, read the union of the listed documents.

## Source-Of-Truth Order

When documents disagree:

1. `AGENTS.md` controls how work is performed.
2. Accepted ADRs control the architectural decision they record.
3. `docs/product-decisions.md` controls product and commercial direction.
4. `docs/architecture.md` controls intended technical boundaries.
5. `docs/scoring-model.md` controls recommendation semantics.
6. `README.md` describes current setup and repository navigation.
7. Current code and tests describe implemented behaviour, which may lag the intended plan.

Do not silently resolve a material conflict. Update the stale document in the same change or report why it cannot yet be updated.

## Product Principles

- Be supportive, cautious, transparent, and non-judgemental.
- Never describe students as smart, dumb, incapable, or ruled out.
- Do not say "best route", "you should do this", "you cannot do this", or imply acceptance is likely.
- Prefer language such as "currently looks strong", "may be harder because", "could improve your preparation by", and "worth checking directly".
- Treat recommendations as comparison and preparation aids.
- Show reasons, risks, missing information, sources, useful next actions, backup options, and confidence limits.
- Keep eligibility, fit, application readiness, information confidence, and portfolio role separate.
- Do not present a single total score or acceptance probability in the commercial experience.
- Hard requirements must be deterministic and source-backed.
- Revenue, sponsorship, and partnerships must never affect ordering or recommendations.
- The free product must produce a genuine useful outcome and avoid dark patterns.
- Student work remains student-owned. Feedback may guide; it must not fabricate or generate a final application for submission.

## Current Product Boundary

The repository is a prototype being migrated toward the commercial workflow.

Current prototype capabilities include:

- browser-only quiz, feedback, and saved-roadmap persistence;
- deterministic route-family scoring;
- demo route families with a local source-backed catalogue boundary;
- results, roadmaps, simulator, saved roadmap, and parent summary;
- a structured AI roadmap endpoint with a template fallback.

The intended first commercial workflow is:

1. readiness check;
2. real opportunity shortlist;
3. separate decision views;
4. evidence bank;
5. requirements-to-evidence gap map;
6. a three-action `This Week` view;
7. unified application tracker;
8. bounded feedback and practice;
9. student-controlled sharing.

Do not deepen legacy quiz, total-score, simulator, generic roadmap, or demo-catalogue behaviour unless required for compatibility or the task explicitly targets migration.

## Engineering Principles

- Use TypeScript and preserve strict type checking.
- Keep deterministic domain logic pure and separate from UI, data access, storage, and AI.
- Keep scoring and recommendation logic in `src/lib/scoring`.
- Keep catalogue ingestion, persistence, queries, and source adapters in `src/lib/catalog`.
- Keep browser persistence helpers in `src/lib/*-storage.ts`.
- Keep demo route data in `src/data/routes` and label it clearly.
- Keep roadmap templates in `src/data/roadmaps`.
- Keep broad test personas in `src/data/test-personas`.
- Pages and route handlers should orchestrate domain modules rather than contain reusable business logic.
- Validate all external, persisted, and AI-generated data at boundaries.
- Preserve provenance and freshness for material opportunity facts.
- Design server-side user persistence behind domain-facing interfaces; do not spread vendor-specific access across components.
- Avoid coupling billing, catalogue, recommendation, and user-profile concerns.
- Never expand mock data as a substitute for approved real integration.
- Prefer small migrations that move the prototype toward the target architecture.
- Keep mobile-first layouts stable and accessible at narrow widths.

## Data And AI Rules

- Approved commercial sources and licence requirements must be confirmed before integration.
- The current UCAS and Find an Apprenticeship HTML parsers are prototypes, not approved commercial integrations.
- Prefer the official Find an Apprenticeship Display Vacancy Advert API for English vacancies.
- Use the Discover Uni/HESA dataset only for fields it legitimately provides and preserve attribution.
- License UCAS course data if comprehensive UCAS data is required.
- Store source identity, source URL, retrieved time, verified time, freshness, supporting text, and conflicts for material facts.
- Missing, stale, or conflicting information must remain visible.
- AI may explain verified facts, personalise suggested actions, critique student-owned drafts, and create practice questions.
- AI may not determine eligibility, invent facts or evidence, calculate acceptance likelihood, publish unverified catalogue data, or submit applications.
- Material AI outputs require schema validation, auditability, cost limits, test cases, and a deterministic or human fallback.
- Safeguarding, privacy, legal, complaints, pricing, and production decisions remain human responsibilities.

## Privacy And Security

- Collect only data required to deliver a defined feature.
- Do not collect detailed sensitive circumstances by default.
- Never commit credentials, tokens, personal student data, catalogue snapshots containing restricted data, or local databases.
- Browser storage is prototype-only for recoverable product data.
- Payments require authenticated server-side persistence, deletion and export, retention rules, consent records, and clear privacy information.
- Parent/adviser sharing is off by default, scoped, visible, revocable, and controlled by the student.
- Do not sell student data, leads, inferred interests, evidence, or application activity.
- Do not add behavioural advertising or paid ranking.

## Required Tests

Add or update tests when changing:

- scoring, classification, ranking, or portfolio behaviour;
- eligibility and requirement evaluation;
- source parsing, normalisation, provenance, freshness, or conflicts;
- browser or server storage normalisation and events;
- recommendation feedback and reranking;
- evidence mapping and gap generation;
- task prioritisation and deadline behaviour;
- saved roadmap or application-tracker behaviour;
- quiz/readiness-check persistence;
- payment entitlements or fair-use limits;
- AI schemas, fallback behaviour, and safety boundaries;
- test personas and broad expected outcomes.

Persona tests should assert broad route-type expectations, constraints, uncertainty, and portfolio roles. Avoid brittle exact ordering unless deliberately protecting a specified behaviour.

For UI changes, verify a narrow mobile viewport and keyboard-accessible interaction. Add component or end-to-end coverage when the failure would be costly or easy to regress.

## Commands

Use the package manager declared in `package.json`.

```bash
pnpm install
pnpm dev
pnpm test
pnpm lint
pnpm build
pnpm docs:check
pnpm data:init
pnpm data:sync
pnpm data:status
```

Do not claim a command passed if dependencies, network access, credentials, or the local environment prevented it from running.

## Documentation Rules

- `docs/README.md` is the documentation index. Update it whenever a durable document is added, renamed, or removed.
- Run `pnpm docs:check` after documentation, instruction, or environment-variable changes.
- Update documentation in the same change when behaviour, architecture, product policy, environment variables, commands, or safety boundaries change.
- Do not create task-specific status Markdown files, duplicate roadmaps, or alternative product plans.
- Add an ADR only for a durable architectural decision with meaningful alternatives and consequences.
- Keep `README.md` focused on current setup and navigation; keep commercial strategy in `docs/product-decisions.md`.
- Mark current behaviour and target behaviour explicitly where they differ.
- Use repository-relative links inside Markdown and verify them after changes.

## Definition Of Done

A task is complete only when:

- the requested behaviour works;
- relevant tests pass;
- lint and production build pass, or each unrun/failing check is reported accurately;
- mobile and accessibility implications are checked;
- copy remains cautious and supportive;
- recommendation outputs remain explainable and source-aware;
- privacy, security, safeguarding, and AI boundaries remain intact;
- demo data is not presented as verified live data;
- existing compatibility routes are preserved unless an approved migration removes them;
- relevant documentation and ADRs are updated;
- no dead documentation links, contradictory instructions, or untracked environment requirements are introduced.
