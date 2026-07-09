# MVP Spec

## Summary

Future Route Planner is a mobile-first Next.js MVP for comparing possible education, apprenticeship, college, work, and portfolio routes. It supports students who are unsure, have a target career, have a target course, or have constraints around grades, cost, location, and earning soon.

The MVP should help users compare routes; it should not tell them what to do.

## MVP Capabilities

- Onboarding/sign-in placeholder.
- Route-builder quiz with saved browser state.
- Deterministic scoring and ranking.
- Results decision board with cautious recommendations.
- Local recommendation feedback and reranking.
- Route-specific roadmap pages.
- One saved local roadmap.
- What-if simulator for limited one-factor comparisons.
- Parent-friendly summary based on saved quiz and saved roadmap.
- Ten test personas with expectation metadata.

## Current Route Types

- University degree
- Degree apprenticeship
- Higher apprenticeship
- College course
- Foundation year
- Access course
- Direct work/training
- Portfolio/project route

## Route/Page Naming

Canonical current pages:

- `/results`
- `/roadmap/[routeId]`
- `/saved-roadmap`
- `/parent-summary`
- `/simulator`

Compatibility pages:

- `/roadmap`
- `/summary`

Both compatibility pages should exist because the original MVP brief referred to `/roadmap` and `/summary`.

## Data Integration Notes

Mock route data exists to exercise scoring and UI. It is not the product focus now. The next data phase should introduce source-backed records from official or provider data sources while preserving the current route shape where possible.

Real data should include:

- source URL and application URL
- deadline or recruitment window
- last checked date
- evidence level
- cost or pay information
- bursary/support notes
- entry requirements
- location/travel assumptions
- route risks and next steps

If data is missing or stale, confidence should fall and the UI should say what needs checking.

## Copy Requirements

- Say "currently looks strong", not "best".
- Say "may be harder because", not "you cannot".
- Say "could improve your chances", not "you should".
- Explain that recommendations are planning prompts based on saved answers and available data.
- Keep mock-data caveats visible until source-backed data exists.

## Testing Requirements

- scoring unit tests
- storage tests for quiz, saved roadmap, and feedback
- route feedback/reranking tests
- persona expectation tests
- build and lint checks

## Out Of Scope For This Pass

- Expanding demo route data to 40 records.
- Rebuilding the quiz branching flow.
- Overhauling scoring weights.
- Deepening generated roadmap content.
- Expanding simulator factors.
- Expanding parent summary beyond compatibility needs.
