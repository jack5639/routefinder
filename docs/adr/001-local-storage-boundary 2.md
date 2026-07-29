# ADR 001: Local storage remains prototype-only persistence

## Status

Accepted for the MVP. This is a reversible product boundary, not a decision to make browser storage part of a paid product.

## Current behaviour

The browser stores quiz answers, one saved roadmap (including an optional generated roadmap), and recommendation-feedback preferences. The data is scoped to one browser and device. It is not an account, is not synchronised, and can be cleared by browser settings or the user through the app.

## Limitations and privacy

Browser storage is convenient for a short planning session, but it is not reliable for long-term access, cross-device continuity, recovery, consent records, or support. It must not be described as secure account storage. The product should continue to avoid collecting unnecessary sensitive information; users should not enter detailed personal circumstances, medical information, or identifiable application data merely to use the planner.

## Product boundary

For the prototype, local storage is demo-only and supports a lightweight, no-account experience. A future paid product could still keep low-risk UI preferences and an explicitly temporary draft locally. Saved plans, quiz profiles, parent summaries, shared links, and any feature a user expects to recover across devices require authenticated server-side persistence, deletion controls, retention rules, and a clear privacy notice.

## Migration path

Keep browser helpers in `src/lib/*-storage.ts` behind small load/save/clear functions. When accounts are introduced, add a server-backed persistence adapter behind the same domain-facing interfaces, migrate only with explicit consent, and keep route-data records independent from user data. Do not couple billing or account decisions to the catalogue or scoring layers.

