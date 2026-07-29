# ADR 001: Browser storage is prototype-only persistence

## Status

Accepted for the prototype. Migration to authenticated server-side persistence is required before taking payments.

Last reviewed: 29 July 2026.

## Context

The prototype stores quiz answers, recommendation feedback, and one saved roadmap in browser storage. This enables a low-friction demonstration without accounts or infrastructure.

Students will eventually expect paid plans, evidence, applications, tasks, sharing permissions, and preparation history to be recoverable across devices. Browser storage cannot reliably provide recovery, authorisation, consent records, support access, retention enforcement, or account deletion.

Some users are under 18, so unnecessary collection and silent migration of local data would create additional privacy risk.

## Decision

Browser storage may hold prototype state, temporary drafts, and low-risk device preferences.

Recoverable commercial product data requires authenticated server-side persistence with:

- object-level authorisation;
- export and deletion;
- defined retention;
- consent and share records;
- secure backup and recovery;
- auditability for material changes;
- clear age-appropriate privacy information.

No payment entitlement may depend only on browser storage.

Local prototype data must not be migrated into a new account silently. The student must receive a clear choice, the data must be validated, and unnecessary fields must be discarded.

## Current behaviour

Browser storage currently contains:

- quiz answers and progress;
- route-feedback preferences;
- one saved roadmap, including an optional generated roadmap.

This state is:

- scoped to one browser and device;
- not synchronised;
- not an account;
- not guaranteed to survive browser clearing;
- unsuitable for sensitive or uniquely recoverable application data.

The UI must not describe it as secure cloud storage.

## Consequences

### Benefits

- The prototype remains simple and usable without an account.
- Storage helpers already isolate normalisation and events.
- Commercial persistence can be introduced behind domain-facing interfaces.
- Students are not forced to create accounts before the paid workflow needs one.

### Costs

- Prototype state can be lost.
- Cross-device use and support recovery are unavailable.
- Sharing remains limited.
- A deliberate migration flow is required later.

## Engineering rules

- Keep browser helpers in `src/lib/*-storage.ts`.
- Keep load, normalise, save, clear, and change-event behaviour tested.
- Do not access product storage keys directly from unrelated components.
- Keep catalogue records separate from user records.
- Add server repositories behind domain interfaces rather than importing a database vendor throughout the UI.
- Keep local UI preferences separate from server-owned recoverable data.
- Do not store credentials, payment state, sensitive documents, or unrestricted application content in browser storage.

## Migration trigger

Authenticated server persistence must be implemented before any of these launch:

- payments or entitlements;
- cross-device saved plans;
- evidence bank;
- application tracker;
- deadline notifications tied to a user;
- parent or adviser access;
- support-assisted recovery;
- consent-dependent processing.

## Migration acceptance criteria

- Authentication and session security are tested.
- Every user-owned record has server-side authorisation.
- Export and deletion cover all user data.
- Retention and backup behaviour are documented.
- Share grants are scoped, visible, revocable, and off by default.
- Local-to-account import is explicit and idempotent.
- Invalid or obsolete local records are rejected safely.
- The privacy notice and Data Protection Impact Assessment cover the migration.
