# Product Plan

## Product Purpose

Future Route Planner helps 16-19-year-olds compare education and work routes without pretending to know the perfect answer. The MVP should make trade-offs visible across fit, feasibility, constraints, confidence, next steps, and backup options.

Recommendations are decision aids, not careers advice. The app should help a student, parent, tutor, or adviser have a calmer planning conversation.

## Current Priorities

- Document the intended architecture and route map clearly.
- Add route feedback so students can react to recommendations and see the local order change.
- Update test personas to match the original 10 requested scenarios and include broad expected ranking behavior.
- Keep `/roadmap/[routeId]`, `/saved-roadmap`, and `/parent-summary` working while adding `/roadmap` and `/summary` compatibility.
- Keep mock data small because real route data integration is planned next.

## Intended App Architecture

- `src/app`: route pages and page-level client wiring.
- `src/components`: reusable UI components that receive already-scored or already-normalised data where practical.
- `src/data/routes`: temporary demo route catalogue. Real source-backed records should replace or sit behind this shape later.
- `src/data/roadmaps`: temporary roadmap templates.
- `src/data/test-personas`: reusable persona inputs plus expectation metadata.
- `src/lib/scoring`: pure scoring, classification, simulator comparison, feedback adjustment, and decision-board helpers.
- `src/lib/*-storage.ts`: local browser storage normalisation, save/load/clear helpers, and change events.
- `src/lib/use-*`: client hooks over browser storage.

Scoring, route data, UI rendering, and browser storage should stay separate so real data can be added without rewriting the results page.

## Route Map

- `/`: onboarding/sign-in placeholder.
- `/quiz`: mobile-first route-builder quiz.
- `/results`: decision board with scored route recommendations and local feedback controls.
- `/roadmap`: compatibility landing that can guide users to a saved or selected roadmap.
- `/roadmap/[routeId]`: route-specific action plan.
- `/saved-roadmap`: the one locally saved roadmap.
- `/simulator`: one-change-at-a-time what-if comparison.
- `/parent-summary`: current parent-friendly summary page.
- `/summary`: compatibility redirect to `/parent-summary`.

## Data Model Expectations

Route records should keep fields for:

- route id, title, type, and summary
- source and application URLs
- deadlines and last checked date
- evidence level: demo, partial, or source-backed
- costs, pay, bursaries, and support notes
- related interests, careers, and courses
- preferred grade bands and travel expectations
- debt level and earning-soon profile
- work styles and supported constraints
- why it may fit, risks, next steps, and backup options

Real records should preserve explainability and confidence caveats. Missing fields should lower confidence or produce visible missing-information notes instead of disappearing silently.

## Language Rules

- Use "currently looks strong", "may be harder", "worth exploring", "could help", and "check directly".
- Avoid "best", "guaranteed", "should", "cannot", and ability judgements.
- Call high-cost, far-travel, or competitive routes stretch-like rather than impossible.
- Make it clear that demo data is not a promise about entry requirements, vacancies, fees, pay, deadlines, or local availability.

## Testing Expectations

- Unit-test pure scoring and feedback behavior.
- Test storage normalisation and invalid data handling.
- Test persona expectations broadly by route type, stretch/backups, and priority constraints.
- Avoid brittle exact rankings except where a route is intentionally protected by the MVP brief.
- Run `pnpm test`, `pnpm lint`, and `pnpm build` before handoff.

## Intentionally Out Of Scope Now

- Expanding mock route data to 40 routes.
- Live UCAS, GOV.UK, apprenticeship, provider, finance, pay, or travel data.
- Complex quiz branching.
- Major scoring model reweighting.
- Rich roadmap generation.
- Simulator expansion beyond the current one-change pattern.
- Deeper parent summary content.
