# Routefinder Product Direction (V3)

Last updated: 31 August 2026

Status: active high-level product direction. V3 is not designed or implemented in this phase.

## Mission

> Give every student a personalised careers strategist.

## Core question

> Given who I am, what paths could I realistically take, what do those paths lead to, and what should I do now to maximise the outcome I care about?

## Starting conceptual model

```text
Person -> Goals -> Possible paths -> Trade-offs -> Strategy -> Next actions
```

This is a framing tool, not a V3 schema, workflow, feature list, or database design.

## Phase 0 decision

V2 is frozen and preserved while V3 is validated and designed. The V2 application-readiness workflow, route-family scoring, roadmaps, and university/apprenticeship framing remain available in the repository as legacy code; they are not the active product direction.

V3 starts from the likely initial user of a UK student around age 16–18 making post-18 decisions. That starting point must be tested rather than treated as a permanent market or scope decision.

## Deliberate non-assumptions

Phase 0 does not assume that V3:

- is a chatbot;
- uses one overall recommendation score;
- begins with a university course or apprenticeship recommendation;
- treats isolated course recommendations as more important than possible paths and their trade-offs;
- reuses V2 domain types, data models, routes, pricing, or workflow;
- uses AI for a material decision before its role, authority, safeguards, and fallback have been validated.

Exact V3 domain types, architecture, data sources, AI boundaries, and user journey must follow user research and validation. This document intentionally does not prescribe them.

## Relationship to V2 and technical foundations

- [`product-decisions.md`](product-decisions.md) is the archived V2 product and commercial plan.
- [`architecture.md`](architecture.md) records V2 architecture and potentially reusable technical foundations.
- [`v3-reset.md`](v3-reset.md) classifies reusable, legacy, and unknown areas of the repository.
- Accepted ADRs retain authority for the durable technical, privacy, source, and AI boundaries they record until deliberately superseded.
