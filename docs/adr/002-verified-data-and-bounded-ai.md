# ADR 002: Verified data and deterministic rules remain authoritative

## Status

Accepted on 29 July 2026.

## Context

Routefinder handles consequential education and employment preparation for many users under 18. Opportunity requirements are distributed across official datasets, provider pages, employer vacancies, and application guidance. Some information is structured, some must be extracted from text, and some is missing or conflicting.

AI can make explanations and preparation more useful, but it can also fabricate facts, obscure uncertainty, overstate eligibility, or generate work that is not genuinely the student's.

The system needs a clear authority boundary before real data, accounts, payments, and more AI features are added.

## Decision

Verified source records and deterministic rules are authoritative for material facts and eligibility.

AI is a bounded assistant. It may extract draft requirements, explain verified facts, personalise suggested actions, provide feedback on student-owned work, and generate practice material. It may not publish facts autonomously, determine eligibility, predict acceptance, invent student evidence, or submit applications.

Every material opportunity fact must preserve provenance, freshness, conflicts, and publication state. Missing or uncertain information remains visible.

## Consequences

### Benefits

- Recommendation explanations can cite the fact that produced them.
- Source changes and errors can be audited and corrected.
- AI failure cannot silently change eligibility.
- Tests can cover deterministic rules without network or model variability.
- Students, parents, advisers, and schools can see uncertainty.
- Model vendors and implementations remain replaceable.

### Costs

- Data ingestion and human review require more operational work.
- Some records will remain unpublished or marked incomplete.
- AI extraction cannot immediately create a large trusted catalogue.
- The product must support conflict, stale, and unknown states throughout the UI.
- Fast expansion is limited by source rights and review capacity.

These costs are accepted because trust and accuracy are core commercial requirements.

## Implementation rules

- Use approved sources and record their licence or permitted-use basis.
- Store original supporting text where permitted.
- Store source, retrieved time, verified time, freshness, and conflicts.
- Treat AI-extracted requirements as drafts.
- Require human review for new, ambiguous, conflicting, or high-impact requirements until measured error rates justify a narrower automated publication rule.
- Keep eligibility evaluation in deterministic, versioned code.
- Validate all AI input and output schemas.
- Log safe operational metadata, prompt version, model, validation result, and fallback state.
- Provide a deterministic or human fallback for material AI features.
- Do not send unnecessary student identifiers or sensitive content to a model.
- Do not allow sponsorship, payment, or partnership state into recommendation ordering.

## Current implementation

The compatibility catalogue still contains prototype HTML adapters and remains clearly labelled. The commercial path is separate:

- Find an Apprenticeship uses the official Display Vacancy Advert API boundary and complete-snapshot discipline.
- Discover Uni verifies and parses the approved HESA archive, preserves required attribution, and imports only draft candidates.
- append-only observations, hashes, restricted raw evidence, deduplicated pending revisions, and audit-preserving human decisions keep reviewed facts authoritative;
- service-role-only database transactions enforce opportunity, requirement, revision, and publication rules;
- unsupported deterministic qualification rules fail closed. The supported vocabulary remains deliberately narrow.

External source permission references, real credentials, provider-page requirement review, the real 80-record catalogue, and isolated Supabase verification remain founder-owned launch gates. The legacy AI roadmap endpoint continues to use structured output and a fallback; generative AI is not part of the commercial MVP.

## Alternatives rejected

### Let an LLM determine eligibility directly

Rejected because output may be inconsistent, difficult to audit, and vulnerable to missing or fabricated facts.

### Publish every extracted requirement automatically

Rejected because source ambiguity and extraction error would create unacceptable trust risk during the initial commercial phase.

### Avoid AI entirely

Rejected because bounded AI can provide valuable personalisation, feedback, and practice when deterministic facts and safety limits remain authoritative.

### Use only manually entered data

Rejected as the permanent model because it would not scale. Human review should focus on ambiguity and high-impact changes while approved structured sources and deterministic validation handle routine records.
