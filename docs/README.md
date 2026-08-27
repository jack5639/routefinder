# Routefinder Documentation

This directory contains the durable sources of truth for Routefinder. Read `AGENTS.md` first, then use this index to load only the documents relevant to the task.

## Document map

| Document | Authority | Read when |
| --- | --- | --- |
| [`product-decisions.md`](product-decisions.md) | Product strategy and commercial plan | Changing target users, scope, workflow, pricing, growth, metrics, data policy, AI policy, launch sequence, or priorities |
| [`architecture.md`](architecture.md) | Current and target technical architecture | Changing pages, APIs, persistence, accounts, catalogue, AI integration, module boundaries, or environment configuration |
| [`scoring-model.md`](scoring-model.md) | Recommendation semantics | Changing eligibility, fit, readiness, confidence, portfolio roles, ranking, feedback, simulator logic, or recommendation copy |
| [`adr/001-local-storage-boundary.md`](adr/001-local-storage-boundary.md) | Prototype persistence decision | Changing local storage, accounts, sharing, recovery, export, deletion, or migration |
| [`adr/002-verified-data-and-bounded-ai.md`](adr/002-verified-data-and-bounded-ai.md) | Source and AI authority decision | Changing catalogue sources, requirements, provenance, automation, AI outputs, agents, or eligibility |
| [`adr/003-separately-durable-deletion-ledger.md`](adr/003-separately-durable-deletion-ledger.md) | Recovery deletion-replay boundary | Changing commercial account deletion, backups, restoration, or retention |
| [`operations.md`](operations.md) | Production operations, data map, DPIA baseline, retention, subprocessors, restore, and incident procedures | Changing deployment operations, privacy operations, support, security response, backups, deletion, or launch evidence |
| [`threat-model.md`](threat-model.md) | Commercial trust boundaries, threat register, route coverage, and release evidence | Changing authentication, authorisation, state-changing routes, direct Supabase access, payments, deletion recovery, or security testing |

Repository-level guidance:

- [`../AGENTS.md`](../AGENTS.md): mandatory working rules and task-specific reading requirements.
- [`../README.md`](../README.md): current setup, commands, routes, limitations, and repository navigation.

## Authority and conflicts

Use this order when information disagrees:

1. `AGENTS.md` for working rules.
2. An accepted ADR for the architectural decision it records.
3. `product-decisions.md` for product and commercial direction.
4. `architecture.md` for intended system boundaries.
5. `scoring-model.md` for recommendation meaning.
6. `README.md` for current setup.
7. Code and tests for currently implemented behaviour.

Current behaviour may lag the intended plan. Mark that difference explicitly; do not rewrite strategy to match prototype limitations.

## Documentation lifecycle

Update an existing source of truth instead of creating a parallel plan.

Create a new durable document only when:

- the subject has a distinct owner or update cycle;
- putting it in an existing document would make that document unclear;
- future contributors need it repeatedly; and
- it can be named as authoritative for a well-defined question.

Create an ADR only when a decision:

- affects architecture or operations for more than one feature;
- had meaningful alternatives;
- would be costly or confusing to reverse; and
- needs its context and consequences preserved.

Do not create:

- task-status Markdown files;
- duplicate product plans or roadmaps;
- meeting-note files without a durable decision;
- generated inventories that immediately become stale;
- speculative feature lists without validation criteria.

When a document becomes obsolete, merge any unique durable information into the correct source of truth, update inbound links, and remove it.

## Change checklist

When editing documentation:

- distinguish implemented behaviour from target behaviour;
- use the name Routefinder consistently;
- use cautious student-facing language;
- preserve repository-relative links;
- include exact commands only when they exist in `package.json`;
- document every required environment variable in `.env.example`;
- avoid unsupported market or outcome claims;
- add sources for material external facts;
- update this index when files are added, renamed, or removed;
- search for stale references and contradictory terminology.

Run:

```bash
pnpm docs:check
```

The check enforces required files, relative links, index coverage, retired filenames, conflict markers, and environment-variable documentation.

## Consolidated documents

The former `mvp-spec.md`, `phase-plan.md`, `product-plan.md`, and `user-workflow.md` were removed on 29 July 2026. They described the original broad prototype and duplicated one another. Their useful implementation facts are now represented in `README.md`, `product-decisions.md`, `architecture.md`, and `scoring-model.md`.
