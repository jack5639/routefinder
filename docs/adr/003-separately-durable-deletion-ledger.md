# ADR 003: Keep deletion replay records outside the restored database

## Status

Proposed implementation; production use is blocked pending recorded privacy/legal approval and an isolated restore exercise.

## Context

A database backup can predate an account deletion. Restoring it can therefore recreate student-owned data. A tombstone in that same database backup cannot prove the later deletion.

## Decision

Routefinder writes a minimum deletion record to an authenticated HTTPS deletion-ledger service before deleting an Auth user. The service must be independently durable from Supabase backups and failure domains; a Supabase table, a database replica, or a Vercel deployment-only store is not sufficient.

The record is limited to an opaque ledger identifier, the Supabase user UUID, deletion timestamp, and the fixed reason `account-deletion`. The service must return a matching durable receipt. If it cannot do so, account deletion fails closed.

During restore, an operator requests a complete signed batch for the interval from the backup point through the intended service-resumption time. Missing, malformed, partial, or out-of-range responses block restoration. For each entry, the restore process removes the Auth user when present, invokes the service-role-only replay cleanup, verifies student-owned data is gone, preserves only detached lawful records, and repeats the batch to prove idempotency before service traffic resumes.

The ledger API is behind `src/lib/deletion-ledger.ts`; application routes and restore tooling do not depend on its storage vendor. The deployed service must use separate credentials, encrypted transport and storage, restricted operations access, redacted logs, immutable availability/audit records, and a tested recovery process.

## Consequences

Account deletion is unavailable until the ledger is configured. An orphan record can remain when ledger recording succeeds but Auth deletion fails; retrying deletion is safe, and no user data is removed without the durable ledger evidence.

Before production use, the founder and privacy/legal reviewer must approve the exact fields, lawful basis, access roles, encryption, processor/transfer position, retention period, destruction procedure, and children’s-data impact. This ADR records no approval reference and does not itself grant approval.
