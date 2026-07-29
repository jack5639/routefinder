# Scoring Model

## Purpose

The scoring model ranks routes so users can compare options. It should be explainable, deterministic, and easy to test. Scores are planning aids, not predictions.

## Current Inputs

Quiz answers include:

- current stage
- subjects
- predicted grade band
- interests
- target career
- target course
- location
- maximum travel minutes
- debt preference
- desire to earn soon
- work styles
- constraints

Route records include:

- route type
- related interests, careers, and courses
- preferred grade bands
- typical travel expectations
- debt level
- earning-soon profile
- work styles
- supported constraints
- reasons, risks, next steps, and backup options

## Score Areas

- Fit: interests, work style, and target career/course alignment.
- Feasibility: grade band, subjects, and travel practicality.
- Constraint: debt preference, earning-soon preference, supported constraints, and travel.
- Confidence: completeness and usefulness of the available information.
- Total score: weighted combination of fit, feasibility, and constraint.

## Decision Board Categories

- Strong fit
- Realistic
- Stretch
- Safer backup
- Worth exploring

These categories should be treated as conversation aids. A stretch route can still be worth exploring; a strong fit still needs real entry, cost, and availability checks.

## Recommendation Feedback

Feedback should be local, deterministic, and reversible. It should:

- store route reactions in browser storage
- nudge route ordering and category placement
- preserve the underlying score breakdown
- show cautious copy explaining that feedback only adjusts this device's comparison order
- avoid machine learning claims

Feedback controls should support route-specific reactions and broad preference signals such as lower debt, practical learning, safer backups, earning soon, cost, distance, and competitiveness.

## Real-Data Integration Notes

Do not tune the scoring model too tightly to the current demo catalogue. Real data may add many provider-specific records with inconsistent fields. The scoring layer should handle missing data through lower confidence and visible missing-information prompts.

Future source-backed scoring should consider:

- qualification level and route type
- provider location and travel time
- entry requirements
- course or vacancy deadlines
- cost, pay, finance, and bursaries
- labour-market and progression evidence
- local availability
- freshness and source quality

## Test Expectations

- Scores stay within 0 to 100.
- Ranking changes when meaningful answers change.
- Decision-board grouping does not drop or duplicate routes.
- Feedback can promote, demote, and preference-shift routes.
- Persona checks use route-type and constraint expectations rather than exact route ids wherever possible.
