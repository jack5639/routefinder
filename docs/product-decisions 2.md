# Routefinder Product Decisions

Last updated: 29 July 2026

## Product definition

Routefinder is an application-readiness platform for late Year 12 and early Year 13 students who are considering university, degree apprenticeships, or both. It helps them build an honest, balanced application portfolio, understand published requirements, connect their real evidence to those requirements, and take useful next actions before deadlines.

It is a decision and preparation aid, not a careers adviser, admissions predictor, or application-writing service.

## Launch market

- Initial student geography: England.
- University search: England, Wales, and Scotland from launch.
- Apprenticeships: England only at launch.
- Student stage: late Year 12 and early Year 13, primarily for the 2027 entry cycle.
- Initial sectors: technology, engineering, business, and finance.
- Initial routes: undergraduate university courses, higher apprenticeships, and degree apprenticeships.

The launch can include students choosing only university or only apprenticeships. Supporting both pathways is a capability, not an entry requirement.

Routefinder can expand to students based in Scotland and Wales once it supports the relevant qualifications, funding context, terminology, and non-English apprenticeship systems properly. A course being in Scotland or Wales does not require that expansion.

## Customer and buyer

- Primary user: a student managing an uncertain and time-sensitive post-18 application plan.
- Primary payer: a parent or carer buying a fixed application-cycle plan.
- Later buyer: careers leaders, sixth forms, colleges, tutors, and school trusts.

## Paid outcome

The paid outcome is an application-readiness plan, comprising:

- a balanced portfolio of real opportunities;
- source-backed entry and logistics checks;
- evidence mapped to opportunity requirements;
- visible gaps and missing information;
- a deadline-aware weekly action plan; and
- a tracker for university and apprenticeship applications.

## Freemium model

The free product must be genuinely useful and never hide basic planning behind an artificial paywall.

### Free

- strategy check and route comparison;
- up to five active opportunities;
- basic eligibility, fit, readiness, and data-confidence views;
- evidence bank with up to 15 examples;
- basic application tracker;
- one refreshed weekly plan each month;
- three AI feedback or planning requests each month; and
- source links and freshness notices.

### Routefinder Cycle

Launch at a founding price of GBP29. Test a public price of GBP49, then GBP59, for access through the end of the relevant application cycle.

- unlimited opportunities, evidence examples, and applications;
- continuous weekly planning and deadline reminders;
- full evidence-to-requirement mapping;
- portfolio-balance analysis;
- AI draft, interview, and assessment preparation within clear fair-use limits;
- parent/adviser sharing controlled by the student; and
- priority support.

### Routefinder Coach

Introduce only after the core plan is converting and the review process is reliable. Indicative price: GBP199.

- Routefinder Cycle access;
- one 30-minute qualified adviser session;
- two asynchronous reviews; and
- one interview or assessment-centre practice session.

### School pilots

Start after individual users are activating and paying. Indicative pilot price: GBP995 plus VAT for up to 250 Year 12/13 students for one academic year.

## Recommendation policy

Routefinder will not present a single total score or an acceptance probability.

Every opportunity is assessed separately across:

1. Eligibility: whether published minimum requirements appear to match the student profile.
2. Fit: how closely the opportunity aligns with current interests, preferences, constraints, and target ideas.
3. Application readiness: the available evidence and preparation relative to the opportunity.
4. Information confidence: source quality, freshness, completeness, and unresolved conflicts.
5. Portfolio role: ambitious, currently plausible, lower-risk backup, exploratory, or needs checking.

Hard requirements are deterministic and always show their source. Preference fit is explainable and adjustable. AI does not determine eligibility or alter source facts.

## Data policy

- Use the official Find an Apprenticeship Display Vacancy Advert API for English vacancies.
- Use Discover Uni/HESA data for university course information where it is suitable.
- License UCAS course data if comprehensive UCAS data becomes necessary; do not rely on HTML scraping as a commercial data source.
- Preserve source URLs, retrieval date, last verified date, freshness state, and conflicts for every material fact.
- Make missing or stale information visible rather than silently filling gaps.
- Link students to the employer, provider, UCAS, or official application destination to take action.

## AI and agent policy

AI can:

- turn verified requirements and student-owned evidence into suggested actions;
- ask follow-up questions to improve an evidence example;
- give structured feedback on a draft written by the student;
- create practice interview and assessment questions from verified job specifications; and
- summarise a saved portfolio for a student-controlled parent/adviser share.

AI cannot:

- invent experience, qualifications, deadlines, vacancies, costs, offers, or outcomes;
- write a final application for the student to submit as their own work;
- calculate acceptance likelihood;
- change verified data or eligibility decisions;
- rank a paying provider above other opportunities; or
- train on student data without an explicit, lawful basis and clear consent where required.

### Agent responsibilities

| Agent | Responsibility | Publication rule |
| --- | --- | --- |
| Catalogue agent | Fetch approved source data on a schedule | Never publishes unvalidated records |
| Requirements agent | Extract structured requirements and supporting citations | Flags ambiguity for review |
| Freshness agent | Detects stale, closed, conflicting, or incomplete records | Updates status; does not silently overwrite facts |
| Readiness agent | Builds student-specific evidence-gap tasks from verified data | Output is marked as suggested action |
| Application feedback agent | Gives feedback on student-owned drafts and practice answers | Never produces a final submit-ready application |
| Support triage agent | Classifies support requests and drafts replies | Escalates safeguarding, data, legal, and urgent cases to a human |

### Human responsibilities

- data licensing and source approval;
- legal, privacy, safeguarding, and complaints decisions;
- final policy and pricing decisions;
- review of uncertain, conflicting, or high-impact catalogue records;
- quality assurance of agent behaviour;
- human coaching and escalation support;
- school and partner relationships; and
- incident response and production deployment approval.

## Privacy and data-sale policy

Routefinder will never sell individual student data, student profiles, application activity, contact details, or evidence to employers, universities, advertisers, data brokers, or any other third party.

Routefinder will not use behavioural advertising, sell leads, or allow sponsorship to influence recommendations.

Future employer or university partnerships may fund free access, workshops, or clearly labelled educational content. They must be separated from recommendations and cannot receive identifiable student data unless a student has made a clear, informed, optional choice to share it.

Only properly de-identified, aggregated product insights may be considered in the future, subject to a completed data protection assessment, minimum cohort thresholds, and no reasonable route to re-identification. This is not a launch revenue stream.

## Account and data model

- The browser-only prototype becomes account-based before payments launch.
- Students control whether a parent or adviser sees a shareable summary.
- Privacy defaults are high.
- Store only data needed to deliver the feature.
- Support export and deletion.
- Do not request document uploads in the first commercial version unless they are necessary and protected by an approved storage and retention policy.

## Analytics and success metrics

Activation occurs when a student has:

1. completed the strategy check;
2. saved at least three real opportunities;
3. added at least one evidence example; and
4. scheduled or completed one useful action.

The north-star metric is the percentage of active students who complete a meaningful readiness action before their next application deadline.

Initial targets:

- 50% of completed strategy checks reach activation;
- 30% of activated users return after four weeks;
- 8% of activated users purchase a paid plan;
- fewer than 5% of paying users request a refund;
- fewer than 1% of material source facts are reported incorrect; and
- 20% of new users arrive via referral by the end of the first cycle.

Track at minimum: strategy check completion, opportunity saved, evidence added, task scheduled, task completed, paid-plan viewed, checkout started, purchase completed, parent/adviser share, application stage update, source issue reported, and account deletion request.

## Pre-build gates

Before the commercial build begins:

1. Resolve all merge-conflict markers and restore test, lint, and build health.
2. Interview 15 students, 10 parents/carers, and 5 careers advisers.
3. Pre-sell 25 founding Cycle places at GBP29. Do not treat free sign-ups as validation.
4. Deliver the first readiness plans manually or with close founder review.
5. Complete a Data Protection Impact Assessment and baseline privacy, safeguarding, accessibility, and AI policies before a public launch.
6. Confirm approved data sources and their licence terms.

## First commercial build

Build, in order:

1. account and secure persistence;
2. exact student profile;
3. opportunity saving/import and source-backed data;
4. eligibility, fit, readiness, confidence, and portfolio-role views;
5. evidence bank and requirement mapping;
6. deadline-aware tasks and application tracker;
7. payments and entitlement limits;
8. validated AI feedback and planning;
9. analytics, reporting, export, and deletion; and
10. parent/adviser sharing.

Do not build a native app, a broad social community, a full school dashboard, an employer marketplace, or expanded route categories before this workflow has paying, retained users.
