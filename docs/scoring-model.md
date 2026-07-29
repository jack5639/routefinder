# Routefinder Recommendation Model

Last reviewed: 29 July 2026

Status: authoritative recommendation semantics. The repository still contains a legacy prototype total score; the commercial experience must migrate to the separate views defined here.

## Purpose

Routefinder helps a student compare opportunities and prepare useful next actions. It does not predict acceptance, determine a final route, or replace direct checks with a provider, employer, school, or qualified adviser.

Recommendation logic must be:

- deterministic where facts or rules determine the result;
- explainable to a student;
- cautious about missing and contextual information;
- independent from payment or sponsorship;
- testable without relying on AI;
- resilient when catalogue records are incomplete or stale.

## Commercial decision views

Never compress these into one user-facing total score.

### 1. Eligibility

Question: Do the published minimum requirements appear to align with the student's recorded profile?

Allowed states:

- `appears-met`
- `may-be-met`
- `appears-unmet`
- `needs-checking`
- `unknown`

Eligibility uses verified structured requirements and deterministic comparison rules. It must preserve:

- the requirement;
- the student's relevant recorded fact;
- the source and verification date;
- the comparison reason;
- missing or conflicting information;
- contextual caveats;
- a direct-check action.

Only a provider or employer makes the actual decision. Do not translate this state into acceptance likelihood.

### 2. Fit

Question: How closely does the opportunity align with the student's stated interests, preferences, constraints, and current intentions?

Fit may consider:

- subject and sector interests;
- target courses or careers;
- preferred ways of working and learning;
- location, travel, or relocation constraints;
- earning-soon and debt preferences;
- stated personal constraints.

Fit is explainable and adjustable. It is not a judgement of ability and must not override hard requirements.

Suggested display states:

- `currently-strong`
- `mixed`
- `currently-weaker`
- `insufficient-information`

### 3. Application readiness

Question: How well does the student's current genuine evidence and preparation cover the opportunity's requirements and application stages?

Readiness may consider:

- requirement coverage;
- strength and specificity of linked evidence;
- missing evidence;
- understanding of the provider or employer;
- draft preparation;
- assessment, interview, or portfolio preparation;
- incomplete tasks;
- time remaining before deadlines.

Suggested display states:

- `well-supported`
- `partly-supported`
- `early-stage`
- `urgent-gaps`
- `unknown`

Readiness must change when the student adds evidence or completes useful actions. It must not reward fabricated volume.

### 4. Information confidence

Question: How much confidence can be placed in the facts and assessment?

Confidence depends on:

- source authority;
- source freshness;
- requirement completeness;
- student-profile completeness;
- unresolved conflicts;
- extraction or review status;
- opportunity closure state.

Suggested display states:

- `high`
- `medium`
- `low`
- `needs-checking`

Low confidence does not mean the opportunity is poor. It means more verification is needed.

### 5. Portfolio role

Question: What role could this opportunity play within the student's current application portfolio?

Allowed roles:

- `ambitious`
- `currently-plausible`
- `lower-risk-backup`
- `exploratory`
- `needs-checking`

Portfolio role combines the separate views without claiming certainty. It must consider diversification across requirements, locations, deadlines, route types, and application effort.

Do not force at least one opportunity into a favourable role. If all options need checking or have material gaps, say so.

## Requirements-to-evidence graph

The core recommendation structure is a graph:

```text
Opportunity
  -> verified requirement
     -> student-owned evidence item
        -> coverage assessment
        -> missing detail
        -> suggested action
```

An evidence link must record:

- requirement identifier;
- evidence identifier;
- why the evidence may be relevant;
- coverage strength;
- missing specificity;
- student confirmation or edit state;
- assessment version.

AI may suggest a link or question. Deterministic rules and student confirmation preserve the distinction between recorded evidence and generated interpretation.

## Suggested actions

Actions should:

- relate to a verified requirement, application stage, missing fact, or deadline;
- be ethical and realistically achievable;
- explain why they matter;
- include an effort estimate and due date where useful;
- avoid implying completion guarantees an outcome;
- prioritise no more than three items in `This Week`.

Priority should consider:

1. hard deadline risk;
2. apparently unmet or unknown hard requirements;
3. application-stage dependency;
4. high-value evidence gaps shared across several opportunities;
5. effort and time remaining;
6. portfolio resilience.

## Current prototype model

The current code in `src/lib/scoring` calculates:

- fit;
- feasibility;
- constraint;
- confidence;
- a weighted total score;
- local deterministic feedback adjustments;
- decision-board categories;
- simulator comparisons.

This model is useful for prototype comparison and compatibility tests. It is not the final commercial semantics because:

- broad grade bands are not provider-specific requirements;
- total score conflates distinct questions;
- confidence primarily reflects profile and demo-data completeness;
- current categories can overstate precision;
- the decision board may force a top route into a favourable category;
- feedback can alter ordering without changing source facts.

Do not tune legacy weights to imitate the target model.

## Migration plan

1. Introduce typed requirement and source records.
2. Introduce a deterministic eligibility evaluator.
3. Introduce evidence items and requirement links.
4. Calculate readiness independently.
5. Calculate information confidence from source and profile state.
6. Assign portfolio roles from the separate views.
7. Add the new response beside the legacy scored route.
8. Migrate `/results`, roadmap inputs, summaries, and tracker consumers.
9. Remove total-score presentation from the commercial flow.
10. Retire legacy scoring only after compatibility consumers and tests are migrated.

## Feedback rules

Student feedback may adjust preference fit or mark an option as unwanted. It may not:

- change verified eligibility;
- alter requirement facts;
- hide all alternatives;
- imply machine learning or certainty;
- convert a preference into an objective quality judgement.

Feedback remains reversible and its effect must be explainable.

## Missing and conflicting data

- Missing requirement: eligibility is `unknown` or `needs-checking`.
- Stale source: reduce information confidence and create a verification action.
- Conflicting sources: show the conflict; do not silently select the more favourable value.
- Missing student fact: ask for it only if it materially improves the assessment.
- Closed vacancy: do not recommend applying; preserve it only where useful for history or preparation.
- Demo record: never present its requirements or deadlines as verified.

## AI boundary

AI may:

- explain a verified comparison;
- suggest evidence links for student review;
- ask questions that improve a genuine evidence item;
- personalise deterministic actions;
- critique student-owned drafts;
- generate practice questions from verified specifications.

AI may not:

- determine eligibility;
- invent or strengthen evidence without student input;
- generate an acceptance probability;
- alter source facts;
- publish a requirement;
- produce final submit-ready application writing;
- allow paid relationships to influence output.

## Copy rules

Use:

- "currently looks strong";
- "appears to match the published requirement";
- "may be harder because";
- "could improve your preparation by";
- "worth checking directly";
- "the available information is incomplete";
- "this could play an ambitious or backup role".

Avoid:

- "best";
- "guaranteed";
- "safe";
- "you should";
- "you cannot";
- "likely to get in";
- ability judgements;
- precise claims unsupported by a cited source.

## Test expectations

Tests must cover:

- each eligibility state;
- qualification equivalency and unknown cases;
- missing, stale, conflicting, and demo sources;
- fit changes without eligibility changes;
- evidence coverage and removal;
- readiness changes after a completed action;
- confidence changes with source quality;
- every portfolio role;
- no forced favourable classification;
- feedback isolation from eligibility;
- no route loss or duplication;
- deterministic results for identical inputs;
- AI schema rejection and fallback;
- broad personas across university-only, apprenticeship-only, combined, constrained, and uncertain profiles.

Use exact ordering only when a deliberate product rule requires it.
