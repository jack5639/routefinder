# Phase Plan

## Phase 1: Current Cleanup

Focus:

- proper `AGENTS.md`
- practical docs
- recommendation feedback and local reranking
- exact 10 test persona scenarios with broad expectations
- `/summary` and `/roadmap` compatibility
- README route map clarity

Do not expand mock data or rebuild major flows in this phase.

## Phase 2: Real Route Data

Focus:

- define source-backed route import shape
- add official/provider source URLs and last-checked metadata
- replace or augment demo route records
- handle stale, missing, partial, and conflicting data
- update confidence scoring for source quality
- keep persona tests broad enough to survive a larger catalogue

Likely sources to evaluate later include official apprenticeship search, course/provider data, UCAS-style course information, GOV.UK guidance, provider pages, and finance/support sources. Exact integration choices should be checked at implementation time.

## Phase 3: Scoring Expansion

Focus:

- review weights after real data exists
- add explicit route availability and eligibility signals
- improve grade, subject, travel, cost, and competition modelling
- add explainable scoring traces where useful
- keep recommendation copy cautious

Avoid changing weights only to satisfy current mock-data snapshots.

## Phase 4: Quiz Branching And Workflow

Focus:

- better branching for unsure, target-career, target-course, and constraint-heavy users
- clearer missing-information recovery
- stronger mobile progress states
- richer save/return flow

## Phase 5: Roadmap, Simulator, And Summary Depth

Focus:

- route-specific roadmap generation from real requirements
- simulator expansion after scoring and data are stable
- parent/adviser summary depth
- share and account options if privacy and usefulness are clear

## Ongoing Quality Bar

- mobile-first checks
- accessible controls and readable labels
- tests for scoring, storage, feedback, personas, and page compatibility
- no claims of guaranteed outcomes
- no overfitting around demo data
