# User Workflow

## Primary Flow

1. The user lands on `/` and continues without an account.
2. The user completes `/quiz`, which saves one quiz profile in browser storage.
3. `/results` builds a decision board from the saved answers and route catalogue.
4. The user reacts to route cards with feedback controls. Feedback is saved locally and reweights the visible order.
5. The user opens `/roadmap/[routeId]` from a route card.
6. The user saves one roadmap locally.
7. `/saved-roadmap` and `/parent-summary` use the saved roadmap and quiz profile.
8. `/simulator` lets the user test one changed factor at a time.

## Compatibility Flow

- `/summary` should send users to `/parent-summary`.
- `/roadmap` should be useful when old docs, bookmarks, or testers use the original MVP route. It should direct users toward the saved roadmap, results, or a route-specific roadmap without breaking `/roadmap/[routeId]`.

## Results Page Expectations

The results page should:

- present recommendations as comparison aids
- show route types, scores, reasons, watch-outs, next steps, backups, and data caveats
- preserve decision-board categories where useful
- let users say what does and does not feel useful
- visibly change ordering or category placement after feedback
- store feedback in browser storage only for the MVP
- avoid implying the app has learned a perfect route

## Feedback Control Expectations

Every route card should include:

- I like this
- Maybe
- Not for me
- Too academic
- Too expensive
- Too far
- Too competitive
- More practical routes
- Higher earning routes
- Safer backup options
- Lower-debt routes

These controls should act as lightweight local preferences. They should adjust comparison weights and route order, not hide all alternatives or make claims about certainty.

## Mobile-First Checks

- The quiz remains usable on a narrow viewport.
- Results route cards stack cleanly.
- Feedback controls wrap without overlapping.
- Navigation remains horizontally scrollable when needed.
- Buttons remain large enough to tap.
- Score and feedback labels fit their containers.

## Intentionally Deferred

- Accounts and cross-device sync.
- Complex recommendation history.
- Machine learning.
- Adviser or parent collaboration flows.
- Rich filtering and saved shortlist management.
