# Routefinder Final Product and Commercial Plan

Last updated: 29 July 2026

Status: final strategic direction for validation and the first commercial version. Change the launch direction only when user evidence or commercial results contradict an assumption below.

Related documentation: [`README.md`](README.md), [`architecture.md`](architecture.md), [`scoring-model.md`](scoring-model.md), and the [`adr`](adr) directory.

## Executive decision

Routefinder will be the application-readiness workspace for late Year 12 and early Year 13 students in England applying to university, higher apprenticeships, degree apprenticeships, or a combination of these.

The first version will focus on technology, engineering, business, and finance. It will include university opportunities in England, Wales, and Scotland and apprenticeship vacancies in England.

Routefinder will not compete primarily as a careers quiz, generic course finder, admissions predictor, application-writing service, or school-wide careers curriculum. Discovery is already crowded and often free. Routefinder's paid value is helping a student turn real opportunity requirements into an evidence-backed, deadline-aware plan and then complete that plan.

The concise promise is:

> Know where you stand, what is missing, and what to do next.

The core transformation is:

> uncertain student with scattered information -> balanced opportunity portfolio -> verified requirements -> mapped evidence and gaps -> completed weekly actions -> stronger, student-owned applications

## Strategic score

The earlier plan scored 68/100 because the problem and product concept were strong but the launch wedge, willingness to pay, distribution, data operations, and moat were not sufficiently resolved.

This final direction scores 82/100 as a plan, conditional on the validation gates being met.

| Area | Score | Decision or remaining risk |
| --- | ---: | --- |
| Problem urgency | 85 | Students face consequential choices, fragmented information, and fixed deadlines |
| Launch focus | 88 | One life stage, one geography, four related sectors, and two application systems |
| Differentiation | 80 | Requirements-to-evidence execution rather than discovery or generic advice |
| User value | 84 | Produces specific actions and an organised application portfolio |
| Willingness to pay | 64 | Parent-paid cycle access is plausible but must be pre-sold |
| Distribution | 72 | Search, short-form education, referrals, parents, advisers, then schools |
| Data feasibility | 68 | Official apprenticeship data exists; university requirements remain operationally difficult |
| Defensibility | 73 | The structured requirement/evidence graph can become a data and workflow advantage |
| Unit economics | 82 | Software-led cycle pricing with bounded AI and optional high-margin support |
| Trust and compliance | 75 | Strong policy direction; implementation and independent review are still required |
| Execution readiness | 65 | A useful deterministic prototype exists, but commercial infrastructure and real data are not complete |

This is not a prediction that the company will succeed. It is the strongest testable direction available from the current evidence. Payment, retention, accuracy, and acquisition must determine whether it deserves further investment.

## The problem Routefinder solves

The problem is not simply that students cannot find courses or vacancies. Free discovery products already exist.

The higher-value problem is that a student often cannot answer:

- Which opportunities are realistic enough to investigate without treating any outcome as certain?
- Which published requirements appear to be met, unmet, ambiguous, or still unknown?
- What experience or evidence could be used for each requirement?
- Where are the material gaps?
- What should be done this week, before the next deadline?
- Is the overall application portfolio balanced across ambitious, plausible, lower-risk, and exploratory options?
- How can university and apprenticeship applications be managed together without missing different deadlines and assessment stages?

Routefinder must make these answers visible, explainable, current, and actionable.

## Market and launch scope

### Initial student

- Lives and studies in England.
- Is in late Year 12 or early Year 13.
- Is preparing for the 2027 entry cycle.
- Is interested in technology, engineering, business, or finance.
- May apply to university, higher or degree apprenticeships, or both.
- Has enough intent to save opportunities and complete application-preparation tasks.

The product remains useful to students choosing only one route. Applying to both is a supported workflow, not an onboarding requirement.

### Geographic coverage

- Student residence: England only at launch.
- Universities: England, Wales, and Scotland.
- Apprenticeships: England only.

Do not market the product to Scottish- or Welsh-resident students until their qualification systems, terminology, funding context, application pathways, and safeguarding implications are properly supported.

### Timing

The initial acquisition period is August 2026 to January 2027:

- 1 September 2026: completed 2027 university applications can be submitted.
- 15 October 2026: early UCAS equal-consideration deadline for Oxford, Cambridge, medicine, dentistry, and veterinary medicine/science.
- 13 January 2027: equal-consideration deadline for most undergraduate courses.
- Apprenticeship openings and assessment stages do not follow one common calendar, which makes continuous alerts and task planning valuable.

### Market expansion order

Expansion is earned through metrics, not assumed at launch:

1. Add further English student subject areas after the first four sectors retain and convert.
2. Add a school/adviser workspace after individual students reliably complete actions.
3. Add younger Year 12 preparation and evidence-building.
4. Support students resident in Wales and Scotland only after the relevant local systems are complete.
5. Consider international applicants or younger year groups only after UK product-market fit.

Do not pursue all of these simultaneously.

## Positioning and competition

### Category

Routefinder is an application-readiness workspace.

### It is not

- a personality test that declares a suitable career;
- a generic list of university courses;
- a vacancy board;
- an acceptance-probability calculator;
- an AI essay writer;
- a substitute for UCAS, an employer application system, a school adviser, or regulated professional advice;
- a general school careers platform at launch.

### Competitive position

| Alternative | Existing strength | Routefinder's distinct job |
| --- | --- | --- |
| UCAS Hub | Free course and apprenticeship discovery, application tools, and deadlines | Cross-route evidence gaps, weekly execution, and a unified university/apprenticeship portfolio |
| Unifrog | Broad school careers provision, exploration, tracking, applications, and adviser visibility | Narrower, deeper application-readiness workflow sold directly before school adoption |
| Morrisby | Established psychometrics, careers matching, course search, and school reporting | Opportunity-specific evidence and task execution rather than psychometric matching |
| Find an apprenticeship | Authoritative English vacancy search, alerts, saves, and application links | Readiness and evidence mapping across multiple vacancies and university backups |
| Generic AI tools | Flexible explanations and draft generation | Verified sources, deterministic eligibility, persistent evidence, deadlines, and safety limits |
| Tutors and consultants | High-trust personal support | Affordable self-service workflow with optional targeted human escalation |

Routefinder should initially complement UCAS, employer systems, and school platforms. It should not ask a school to replace an incumbent before Routefinder has evidence of better student execution.

## Product principles

- Be supportive, cautious, and non-judgemental.
- Recommendations are decision aids, not promises or final advice.
- Never describe a student as smart, dumb, incapable, or ruled out.
- Never present an acceptance probability.
- Never imply that an opportunity is guaranteed or impossible solely from automated analysis.
- Show reasons, risks, sources, missing information, next actions, backup options, and confidence limits.
- Hard requirements remain deterministic and source-backed.
- AI may explain and personalise but may not change verified facts.
- Students retain ownership of their applications and writing.
- The free product must be genuinely useful.
- Revenue must not influence opportunity ordering.

## Core product workflow

### 1. Five-minute readiness check

Collect only information needed to improve the result:

- current year and intended application cycle;
- home location and travel/relocation constraints;
- qualifications, subjects, predicted or achieved grades, and unknown grades;
- sector and subject interests;
- university, apprenticeship, or combined intent;
- work-style and financial preferences;
- existing experience, projects, responsibilities, and activities;
- important constraints and missing information.

The output is a starting strategy, not a declared destination.

### 2. Opportunity shortlist

Students search, import, or save real opportunities. Each result shows:

- provider or employer;
- course, programme, or role;
- location and relevant travel implications;
- published entry requirements;
- application destination;
- deadline or closing state;
- source and last-verified date;
- missing, stale, or conflicting information.

The student builds a manageable active portfolio. Paid users may save unlimited opportunities, but the interface should encourage no more than 15 active applications at once so the plan remains useful.

### 3. Five separate decision views

Do not combine these into one total score:

1. **Eligibility**: published minimums appear met, may be met, appear not met, or need checking.
2. **Fit**: alignment with stated interests, preferences, and constraints.
3. **Application readiness**: strength and coverage of the student's current evidence and preparation.
4. **Information confidence**: source quality, freshness, completeness, and unresolved conflicts.
5. **Portfolio role**: ambitious, currently plausible, lower-risk backup, exploratory, or needs checking.

Eligibility must always state that providers and employers make decisions and that contextual or unrecorded factors may apply.

### 4. Evidence bank

Students add concise evidence they genuinely own:

- projects;
- work experience;
- employment or volunteering;
- subject learning;
- competitions;
- responsibilities;
- achievements;
- examples of teamwork, communication, problem-solving, resilience, and motivation.

Each item records what happened, the student's contribution, the result, what was learned, and any supporting detail. The product maps evidence to verified opportunity requirements without inventing content.

### 5. Gap map

For every saved opportunity, show:

- requirements supported by evidence;
- requirements with weak or incomplete evidence;
- requirements not yet evidenced;
- hard requirements that appear unmet;
- facts that need direct confirmation;
- possible ethical actions to improve preparation;
- an alternative or backup where appropriate.

This requirements-to-evidence graph is the centre of the product and the primary source of differentiation.

### 6. This Week

The default returning-user screen is a short, deadline-aware action list:

- no more than three priority actions;
- why each action matters;
- linked opportunity and requirement;
- estimated effort;
- due date;
- completion and reflection;
- the next action after completion.

The desired habit is one meaningful readiness action each week, not daily screen time.

### 7. Application tracker

Track:

- planned;
- preparing;
- submitted;
- online assessment;
- interview;
- assessment centre;
- decision;
- offer;
- declined or withdrawn;
- student-controlled notes and next action.

Routefinder links out to official submission systems and never submits on the student's behalf.

### 8. Feedback and practice

AI can provide:

- questions that help a student improve their own evidence;
- structured feedback on student-written drafts;
- employer- or course-relevant practice questions based on verified information;
- mock interview and assessment-centre practice;
- explanations of unfamiliar terminology;
- a summary the student may share with a parent or adviser.

It cannot produce a final application for submission or fabricate evidence.

## Freemium and pricing

The commercial model is fixed-price access for an application cycle. A monthly subscription is not the launch model because the need is seasonal and cancellation friction would undermine trust.

### Routefinder Free

Purpose: deliver a complete first success and generate qualified demand.

- readiness check and starting strategy;
- opportunity search and up to five active saved opportunities;
- eligibility, fit, readiness, confidence, and portfolio-role views;
- evidence bank with up to ten examples;
- basic gap map and tracker;
- one refreshed weekly plan each month;
- deadline notices;
- three AI feedback or practice requests each month;
- source links and freshness warnings;
- exportable basic summary.

Free users must be able to make a real decision and complete a real action. The paywall appears when they need breadth, continuity, or repeated preparation.

### Routefinder Cycle

- Founding beta: GBP29 for the first 50 paying users.
- Standard launch price: GBP59 for the relevant application cycle.
- Access ends on 30 September following the intended entry year, with clear notice at purchase.

Includes:

- unlimited saved opportunities and evidence items;
- up to 15 active applications at once;
- complete evidence-to-requirement mapping;
- continuous weekly planning and deadline reminders;
- full application tracker;
- portfolio balance and backup prompts;
- parent/adviser sharing controlled by the student;
- AI feedback, interview practice, and assessment preparation within a clearly stated fair-use allowance;
- data export and priority support.

Do not advertise unlimited AI. Product usage may be broad, but compute-heavy features need transparent fair-use limits and abuse protection.

### Routefinder Coach

Launch only after the self-service workflow converts and a qualified adviser process is available.

- Price: GBP249 per application cycle.
- Includes Routefinder Cycle.
- One 30-minute session with an appropriately qualified adviser.
- Two asynchronous reviews of student-owned work.
- One interview or assessment-centre practice session.

Target direct delivery cost below GBP95 so gross margin remains above 60%. Limit availability rather than reducing quality.

### Schools and colleges

Begin with paid pilots after consumer activation and accuracy targets are met.

- Pilot: GBP995 plus VAT for up to 250 Year 12/13 students for one academic year.
- Post-pilot target: GBP1,995 plus VAT for up to 250 students, then GBP4 per additional student.
- Include onboarding, student workspace access, aggregate progress views, intervention flags, exports, and support.
- Do not include a broad careers curriculum, MIS integration, or Gatsby reporting in the first pilot unless a buyer pays for and validates the need.

Sell improved application execution and adviser visibility, not replacement of an established careers platform.

### Future adviser licence

Consider only after at least five advisers repeatedly use student sharing:

- multi-student workspace;
- templated review and intervention tools;
- explicit student consent and role-based access;
- per-adviser subscription with paid student seats.

## Profit model and economic rules

### Revenue sequence

1. Founding consumer payments prove willingness to pay.
2. Standard Cycle sales create scalable software revenue.
3. Coach creates higher average order value and informs product development.
4. School licences reduce reliance on seasonal consumer acquisition.
5. Adviser licences and funded-access partnerships become later distribution channels.

### Unit-economic targets

| Metric | Target |
| --- | ---: |
| Cycle gross margin before general overhead | at least 80% |
| Coach gross margin | at least 60% |
| School software/support gross margin | at least 75% |
| Blended AI and data cost per Cycle user | below GBP5 |
| Paid B2C customer acquisition cost | below GBP15 |
| Refund rate | below 5% |
| Support time per self-service paying user | below 20 minutes per cycle |

Do not scale paid advertising while customer acquisition cost exceeds 25% of first-cycle revenue or while activated-to-paid conversion is below 8%.

### Planning scenarios

These are operating scenarios, not forecasts.

| Scenario | Cycle | Coach | Schools | Approximate gross revenue |
| --- | ---: | ---: | ---: | ---: |
| Validation | 50 at GBP29 | 2 at GBP249 | 0 | GBP1,948 |
| Initial traction | 250 at blended GBP50 | 20 at GBP249 | 3 at GBP995 | GBP20,465 |
| Strong first full cycle | 1,000 at GBP59 | 100 at GBP249 | 20 at blended GBP1,500 | GBP113,900 |
| Scale signal | 5,000 at GBP59 | 300 at GBP249 | 75 at GBP1,995 | GBP519,225 |

The initial UK niche can support a meaningful company but not an enormous outcome by itself. A much larger business requires proven expansion into more subjects, more year groups, institutional distribution, and eventually further geographies. Expansion before product-market fit would reduce the probability of reaching that point.

## Acquisition and growth

Distribution is part of the product and receives weekly founder time from the beginning.

### Primary acquisition loop

1. A student discovers a useful deadline, requirement, employer-process, or comparison page through search or short-form content.
2. The page leads to the free readiness check.
3. The student saves three opportunities and receives a first evidence gap and action.
4. The student returns through a useful deadline or weekly-action reminder.
5. A portfolio limit, repeated preparation need, or parent/adviser share creates the paid moment.
6. The completed action or shareable summary creates a referral.

### Channel priority

1. High-intent SEO and answer pages.
2. TikTok, YouTube Shorts, Instagram Reels, and longer YouTube explainers.
3. Student referrals and ambassadors.
4. Parent webinars and parent-focused search content.
5. Careers advisers, tutors, sixth forms, colleges, and access organisations.
6. Carefully tested paid search and retargeting after conversion is proven.

Do not begin with broad paid social acquisition.

### Content strategy

Create source-backed pages and tools around:

- 2027 university and apprenticeship deadlines;
- technology, engineering, finance, and business opportunity requirements;
- degree apprenticeship application stages;
- how to compare university and apprenticeship trade-offs;
- qualification and UCAS Tariff explanations;
- evidence examples without providing submit-ready answers;
- interview, online assessment, and assessment-centre preparation;
- location and travel constraints;
- portfolio balance and backup planning.

Every page must have an update owner, source, last-reviewed date, and clear route into the product. Do not mass-publish low-quality AI pages.

### Referral design

- Let students share a privacy-safe readiness summary.
- Ask for a referral after a completed action or useful result, not during onboarding.
- Test a GBP10 parent referral credit or equivalent product credit only after organic sharing is measured.
- Do not expose student activity publicly or pressure students to invite contacts.

### School sales motion

- Use evidence from consumer users to identify recurring adviser problems.
- Recruit three design-partner schools, but charge for pilots.
- Show completed actions, missing evidence, deadline risk, and adviser time saved.
- Start 2027/28 budget conversations from January 2027.
- Keep onboarding under two hours and avoid custom development for one school.

## Validation gates

### Gate 0: repository and safety readiness

Before taking payments:

- no unresolved merge-conflict markers;
- tests, lint, and production build pass;
- demo records remain clearly labelled;
- authentication and server-side persistence design is approved;
- analytics events are defined;
- baseline privacy, terms, safeguarding, AI-use, accessibility, refund, and complaints policies exist;
- a Data Protection Impact Assessment is completed;
- data licences and attribution requirements are recorded.

### Gate 1: problem and payment

By 31 August 2026:

- interview 15 students, 10 parents/carers, and 5 careers advisers;
- observe at least 10 students attempting the workflow rather than asking only hypothetical questions;
- pre-sell 25 founding Cycle places at GBP29;
- at least 10 buyers must be outside friends, family, and close personal contacts;
- manually deliver or founder-review every founding plan.

If fewer than 10 independent customers pay, do not build more AI or expand the catalogue. Rework the paid promise and repeat the test.

### Gate 2: product usefulness

Across the first 100 qualified users:

- at least 50% activate;
- at least 40% of activated users complete a meaningful action within seven days;
- at least 30% return in week four where their application stage makes this relevant;
- at least 70% say they would be disappointed to lose the gap map or weekly plan;
- fewer than 1% of material source facts are confirmed materially incorrect.

If students use discovery but do not complete actions, the core workflow has failed even if sign-up numbers look healthy.

### Gate 3: monetisation

- at least 8% of activated users buy Cycle;
- at least 15% of users who view the paywall begin checkout;
- refunds remain below 5%;
- paid acquisition stays paused until organic or partner-acquired cohorts meet these thresholds.

### Gate 4: repeatable growth

- at least 20% of new users arrive through referrals or shares;
- one organic content cluster produces activated users for four consecutive weeks;
- three paid school pilots are signed without bespoke product promises;
- blended contribution margin remains positive after AI, data, payment, support, and adviser costs.

## Success metrics

### Activation

A student activates after:

1. completing the readiness check;
2. saving at least three real opportunities;
3. adding at least one genuine evidence example; and
4. scheduling or completing one useful action.

### North-star metric

Percentage of active students who complete a meaningful readiness action before their next relevant deadline.

This is more useful than daily active users because the product should improve preparation, not maximise screen time.

### Supporting metrics

- readiness-check completion;
- time to first useful result;
- opportunities saved;
- evidence items added and improved;
- gaps identified and resolved;
- tasks scheduled and completed;
- week-one and week-four retention;
- free-to-paid conversion;
- checkout conversion and refunds;
- source issues and time to correction;
- parent/adviser shares;
- application-stage progression;
- acquisition source and activation by channel;
- contribution margin by product;
- account export and deletion requests.

## Data strategy

### Approved starting sources

- Use the official Find an Apprenticeship Display Vacancy Advert API for English vacancies.
- Use the Discover Uni/HESA dataset for university information it legitimately covers, with required attribution.
- Use provider and employer primary sources for requirements that are not present in structured official data.
- License UCAS course data if comprehensive UCAS data is commercially necessary.
- Do not use HTML scraping as the foundation of a commercial catalogue where terms, reliability, or permission are unclear.

### Record requirements

Every material fact must include:

- source URL or source record identifier;
- source type and authority;
- retrieved date;
- last human-verified date where applicable;
- freshness state;
- structured value and original supporting text;
- unresolved conflicts;
- publication status;
- audit history.

### Publication workflow

1. Fetch from an approved source.
2. Normalise deterministic fields.
3. Extract unstructured requirements into a draft.
4. validate types and qualification rules.
5. compare against existing values and flag conflicts.
6. require human review for new, ambiguous, conflicting, or high-impact requirements.
7. publish with provenance.
8. monitor closure and freshness.

Start with a deliberately narrow, real, verified catalogue for the four launch sectors. Do not expand mock records as a substitute for source-backed integration.

## Recommendation policy

Hard requirements are deterministic. Preference fit is explainable and adjustable. AI does not determine eligibility or alter source facts.

Every recommendation must show:

- why it appears relevant;
- which facts support that view;
- material risks or constraints;
- missing or stale information;
- useful next actions;
- backup or adjacent options;
- confidence limits;
- the official place to verify or apply.

Avoid language such as "best route", "you should do this", "you cannot do this", or claims that a student is likely to be accepted. Prefer "currently looks strong", "may be harder because", "could improve your preparation by", and "worth checking directly".

## AI and agent operating model

Routefinder will not launch an autonomous multi-agent system. It will use a small number of bounded, auditable jobs. Deterministic code and verified records remain authoritative.

| Capability | Launch owner | Rule |
| --- | --- | --- |
| Catalogue fetch and normalisation | Deterministic scheduled job | Approved sources only |
| Requirement extraction | AI-assisted internal job | Draft only; citations required |
| Freshness and conflict detection | Deterministic checks with AI assistance for text comparison | Never silently overwrites a verified fact |
| Readiness actions | Deterministic rules plus constrained AI personalisation | Verified requirements and student-owned evidence only |
| Application feedback | AI with structured output | Feedback and questions, never final submit-ready writing |
| Support triage | AI-assisted draft | Human escalation for safeguarding, privacy, legal, complaints, and urgent cases |
| Content research and briefs | AI-assisted internal job | Primary sources required; human publication |
| Product QA evaluation | Automated tests and fixed personas | Human review before material policy changes |

AI may:

- explain verified information;
- suggest student-specific actions;
- ask questions that strengthen a genuine evidence example;
- critique student-owned drafts;
- generate practice questions from verified specifications;
- summarise a student-controlled portfolio.

AI may not:

- invent experiences, qualifications, requirements, deadlines, vacancies, costs, offers, or outcomes;
- calculate acceptance likelihood;
- make or alter deterministic eligibility decisions;
- submit an application;
- rank paying partners more favourably;
- publish unverified catalogue facts;
- make safeguarding, legal, privacy, refund, pricing, or production decisions;
- train on student data without an explicit lawful basis and required transparency or consent.

All material AI jobs need input limits, schema validation, logging, cost budgets, test cases, failure handling, and a non-AI fallback.

## Privacy, safety, and trust

Routefinder will never sell:

- identifiable or pseudonymous student profiles;
- application activity;
- contact information;
- evidence or uploaded work;
- inferred interests or vulnerabilities;
- leads to employers, universities, advertisers, or data brokers.

Routefinder will not use behavioural advertising, pay-to-rank, undisclosed sponsorship, or partner payments that influence recommendations.

Future employers, universities, charities, or access programmes may fund free student access, workshops, or clearly labelled educational material. Funding must remain separate from recommendation ordering. Identifiable information may be shared only through a clear, informed, optional student action and an appropriate lawful process.

Only properly de-identified aggregate insights may be considered later, with a completed assessment, minimum cohort sizes, disclosure controls, and no reasonable path to re-identification. This is not a launch revenue stream.

Before public launch:

- complete a Data Protection Impact Assessment;
- document lawful bases, retention periods, subprocessors, and international transfers;
- use age-appropriate privacy information;
- minimise sensitive data;
- encrypt data in transit and at rest;
- implement role-based access, audit logs, export, and deletion;
- define safeguarding, breach, complaint, and incident procedures;
- conduct accessibility testing against WCAG 2.2 AA;
- obtain specialist legal and data-protection review.

Student-controlled parent/adviser sharing must be off by default, revocable, scoped, and clearly visible.

## First commercial build

Build in this order:

1. Restore and preserve test, lint, and build health.
2. Add secure authentication, server-side persistence, consent records, deletion, and export.
3. Replace the generic quiz outcome with the focused readiness-check result.
4. Integrate a narrow set of real, source-backed opportunities.
5. Implement saved opportunities and the five decision views.
6. Build the evidence bank.
7. Build the requirements-to-evidence graph and gap map.
8. Make `This Week` the returning-user home.
9. Add the unified application tracker and reminders.
10. Add analytics and source-issue reporting.
11. Add payments, entitlements, fair-use enforcement, and refunds.
12. Add constrained AI feedback and practice.
13. Add student-controlled parent/adviser sharing.
14. Build only the minimum aggregate view needed for paid school pilots.

The current deterministic scoring, storage separation, catalogue boundary, route pages, roadmap work, and test personas are useful foundations. They should be adapted rather than discarded where they support this workflow.

## Explicitly deferred

Do not build before the validation gates support it:

- a native mobile app;
- a social feed or student community;
- direct application submission;
- an employer marketplace;
- paid employer lead generation;
- an acceptance predictor;
- a general-purpose AI chat screen;
- large-scale generated content;
- a broad school careers curriculum;
- deep MIS integrations;
- full coverage of every subject and post-18 route;
- Scottish- or Welsh-resident student support;
- international applications;
- document uploads without an approved need, retention policy, and secure implementation.

## Founder responsibilities

The founder must personally own:

- customer interviews and observed usability sessions;
- sales and pricing experiments;
- final positioning and roadmap decisions;
- data licences and commercial partnerships;
- legal, privacy, safeguarding, and complaints processes with qualified advice;
- review of the first catalogue records and readiness plans;
- quality and safety evaluation;
- school relationships;
- support for early paying users;
- financial tracking and unit economics;
- production release approval.

Agents and automation may research, extract, classify, draft, test, and monitor. They do not replace founder accountability.

## Execution calendar

### 29 July to 9 August 2026

- stabilise the repository and run the full quality suite;
- create the paid-proposition landing page;
- prepare interview scripts and a clickable workflow;
- confirm initial data licences and source access;
- draft privacy, safety, AI, refund, and safeguarding baselines.

### 10 to 31 August 2026

- complete 30 stakeholder interviews;
- observe at least 10 student workflows;
- pre-sell 25 founding places;
- deliver concierge readiness plans;
- choose the narrow verified launch catalogue from actual user demand;
- measure which result causes payment.

### 1 September to 15 October 2026

- launch the paid beta;
- focus early-deadline applicants and opening apprenticeship campaigns;
- ship evidence mapping, weekly actions, tracking, reminders, and payments;
- publish the first high-intent content cluster;
- review every source issue and early paid-user outcome.

### 16 October 2026 to 13 January 2027

- target the main university application window;
- expand only within the four launch sectors;
- add structured interview and assessment preparation;
- develop the referral and parent webinar loops;
- begin conversations for three paid school pilots.

### February to July 2027

- support apprenticeship assessments, interviews, decisions, and university responses;
- measure full-cycle retention, referrals, outcomes, and refunds;
- run paid school pilots;
- decide whether to expand subjects, institutional features, or geography using the gates above.

## Research anchors

- [UCAS Hub is a free discovery and application-support alternative](https://www.ucas.com/hub)
- [Unifrog serves more than 3,100 UK schools and colleges](https://www.unifrog.org/uk-schools)
- [Morrisby Complete is advertised at GBP995 per school per year](https://www.morrisby.com/morrisby-complete)
- [UCAS reported 328,390 UK 18-year-old applicants in 2025](https://www.ucas.com/corporate/news-and-key-documents/news/uk-universities-and-colleges-see-record-numbers-of-uk-18-year-old-applicants)
- [DfE research on Year 12 and Year 13 plans](https://www.gov.uk/government/publications/parent-pupil-and-learner-voice-omnibus-surveys-for-2024-to-2025/parent-pupil-and-learner-voice-march-2025)
- [UCAS research on apprenticeship demand and barriers](https://www.ucas.com/business/employers/what-influences-choices-would-be-apprentices)
- [Official Find an Apprenticeship Display Vacancy Advert API](https://www.api.gov.uk/tas/display-vacancy-advert-api/)
- [Discover Uni/HESA open dataset and licence](https://www.hesa.ac.uk/support/tools-and-downloads/unistats)
- [UCAS 2027 application dates](https://www.ucas.com/advisers/help-and-training/key-dates-timeline)
- [DfE careers guidance and provider-access duties](https://www.gov.uk/government/publications/careers-guidance-provision-for-young-people-in-schools/careers-guidance-and-access-for-education-and-training-providers)
- [DfE guidance on generative AI and school data protection](https://www.gov.uk/guidance/data-protection-in-schools/generative-artificial-intelligence-ai-and-data-protection-in-schools)

## Final decision rule

The next feature is the one that most improves one of these:

1. verified opportunity accuracy;
2. activation;
3. meaningful action completion;
4. paid conversion;
5. referral;
6. contribution margin.

If a proposed feature does not clearly improve one of these and is not required for safety, privacy, accessibility, or reliability, it does not belong in the first commercial version.
