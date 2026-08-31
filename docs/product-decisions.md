# Routefinder V2 Product and Commercial Plan (Archived)

Last updated: 27 August 2026

Status: archived V2 product and commercial direction. It is retained to preserve context for the frozen V2 implementation, not as the active Routefinder strategy.

Related documentation: [`product-direction.md`](product-direction.md) is the active V3 product direction; [`v3-reset.md`](v3-reset.md) defines the V2/V3 migration boundary. This archived V2 record remains related to [`README.md`](README.md), [`architecture.md`](architecture.md), [`scoring-model.md`](scoring-model.md), and the [`adr`](adr) directory.

## Superseded by the V3 product reset

This document records the application-readiness, university/apprenticeship comparison, evidence-gap, and commercial-launch decisions made for V2. Those decisions no longer define the active product direction.

Phase 0 does not design or implement V3. Future work begins from the mission, core question, and conceptual model in [`product-direction.md`](product-direction.md), then derives V3 architecture and domain types from user validation. Preserve the safety, provenance, and privacy lessons recorded here when relevant, but do not carry V2 workflow, pricing, catalogue-coverage, scoring, or route-first assumptions into V3 automatically.

## Executive decision

Routefinder will be the application-readiness and decision workspace for late Year 12 and early Year 13 students in England exploring, comparing, or applying to university, higher apprenticeships, degree apprenticeships, or a combination of these.

The first version will focus on technology, engineering, business, and finance. It will include university opportunities in England, Wales, and Scotland and apprenticeship vacancies in England.

Routefinder will not compete primarily as a careers quiz, generic course finder, admissions predictor, application-writing service, or school-wide careers curriculum. Discovery is already crowded and often free. Routefinder helps a student turn scattered research into an explainable route comparison, then turn real opportunity requirements into an evidence-backed, deadline-aware plan and complete that plan.

Students may arrive with no route in mind, a few options to compare, or a specific course or vacancy already chosen. These are three valid starting points in one product; no student is required to begin with a declared destination.

The initial acquisition wedge is narrower than the product boundary: students in the four launch sectors who want to pursue higher or degree apprenticeships while keeping credible university backups active. It is a marketing focus, not an eligibility rule or a promise that apprenticeships are the right route for every student.

The concise promise is:

> Know where you stand, what is missing, and what to do next.

The core transformation is:

> scattered research or uncertainty -> route options worth investigating -> balanced opportunity portfolio -> verified requirements -> mapped evidence and gaps -> completed weekly actions -> stronger, student-owned applications

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
| Distribution | 82 | Existing niche TikTok reach is strong evidence of attention; qualified traffic and conversion remain unproven |
| Data feasibility | 68 | Official apprenticeship data exists; university requirements remain operationally difficult |
| Defensibility | 73 | The structured requirement/evidence graph can become a data and workflow advantage |
| Unit economics | 82 | Software-led cycle pricing with bounded AI and optional high-margin support |
| Trust and compliance | 75 | Strong policy direction; implementation and independent review are still required |
| Execution readiness | 65 | A useful deterministic prototype exists, but commercial infrastructure and real data are not complete |

This is not a prediction that the company will succeed. It is the strongest testable direction available from the current evidence. Payment, retention, accuracy, and acquisition must determine whether it deserves further investment.

## Revenue optimisation decision

Routefinder optimises for first-year contribution and evidence of repeatable demand, while preserving options for a larger three-year business. It does not optimise for the largest possible launch-week revenue number. Revenue remains constrained by student safety, source accuracy, accessibility, privacy, honest pricing, and the rule that commercial relationships never affect recommendations or ordering.

The founder has demonstrated organic short-form distribution in the niche: approximately 500,000 views on relevant content. This is strong evidence of attention, not yet evidence of qualified traffic, activation, or willingness to pay. TikTok therefore becomes the primary year-one acquisition channel, with every video cohort measured through to useful action and contribution.

The commercial audit identified the following weaknesses and decisions:

| Weakness | Revenue risk | Decision |
| --- | --- | --- |
| The public launch was scheduled on the 15 October early UCAS deadline | Routefinder would miss the preparation window for early applicants and may attract students too late to help | Capture demand from August with a no-payment waitlist and a free observed beta. Target a capped founding launch from 15 September only if the complete paid gate passes; otherwise say clearly that the first paid cohort targets the January deadline and rolling apprenticeship applications. |
| TikTok reach is not connected to an owned, measurable funnel | Views can disappear without producing users, learning, or revenue | Use one campaign landing page and one call to action per content series. Measure qualified click, readiness start, activation, paywall, checkout, payment, refund, and completed action by series. Capture only consented contact details needed for the waitlist. |
| The student is the user, but a parent or carer may be the payer | A high-intent student can reach checkout without a practical or privacy-safe way to involve the payer | At launch, support a clearly explained parent-paid checkout while the student remains the account owner. Payment grants access only to the student's account and never grants parent access to readiness, evidence, shortlist, or application content. |
| The Free tier contains much of the core workflow while paid value is described mainly as higher limits | Students may value the product without understanding why continuity is worth paying for | Preserve a genuine free result, then present Cycle after the first completed action and at a real continuity need: a second plan refresh, a sixth saved opportunity, or complete mapping across several applications. Eligibility, source facts, deadlines, and safety information are never paywalled. |
| Catalogue readiness is measured mainly by an 80-record minimum | A numerically ready catalogue can still fail a student's subject, location, grade, or route constraints | Keep the 80-record safety minimum and require every promoted acquisition slice/persona to have at least three genuinely relevant, open, source-backed opportunities, or the campaign remains off. Market the catalogue as curated rather than comprehensive. |
| The GBP29 founding offer and GBP59 standard offer have no explicit price-learning design | Discount conversion can be mistaken for standard-price demand, leaving money on the table or causing a weak price jump | Treat the first 50 places as a finite validation cohort, not proof of GBP59 willingness to pay. Record conversion, activation, support, refunds, and contribution separately by offer. Test later prices sequentially and transparently; never personalise price using grades, inferred vulnerability, urgency, or other student characteristics. |
| Acquisition names six channels without a concentration rule | Several hours of daily founder effort can be spread too thinly to establish one repeatable channel | TikTok is the primary channel until it stops producing activated users. Run only one supporting experiment at a time: first creator-to-search repurposing, then parent content, referrals, adviser partnerships, and finally schools. Do not invest meaningful time in broad SEO before TikTok topics have revealed proven search intent. |
| School outreach starts after the main consumer window | Long procurement cycles delay the largest plausible recurring revenue stream | Use the available adviser to refine the product and make introductions where appropriate. Begin buyer discovery and non-binding 2027 pilot reservations in August 2026, without building a school workspace before consumer usefulness is proven. Enter budget conversations in autumn 2026 rather than waiting until January 2027. |
| Gross-revenue scenarios omit payment fees, refunds, support, data, tax, and acquisition | Attractive top-line scenarios can conceal poor economics | Make contribution per order and contribution by channel the financial authority. Gross revenue remains a demand indicator, not the scaling decision. |

These decisions sharpen the route to revenue without widening the launch product, weakening the free outcome, or introducing paid ranking, behavioural advertising, student-data sales, or manipulative scarcity.

## The problem Routefinder solves

The problem is not simply that students cannot find courses or vacancies. Free discovery products already exist.

The higher-value problem is that a student often cannot answer:

- Which opportunities are realistic enough to investigate without treating any outcome as certain?
- If I have no clear route yet, which route families and real examples are worth investigating next, and why?
- Which published requirements appear to be met, unmet, ambiguous, or still unknown?
- What experience or evidence could be used for each requirement?
- Where are the material gaps?
- What should be done this week, before the next deadline?
- Is the overall application portfolio balanced across ambitious, currently plausible, qualification-aligned alternative, and exploratory options?
- How can university and apprenticeship applications be managed together without missing different deadlines and assessment stages?

Routefinder must make these answers visible, explainable, current, and actionable.

## Market and launch scope

### Initial student

- Lives and studies in England.
- Is in late Year 12 or early Year 13.
- Is preparing for the 2027 entry cycle.
- Is interested in technology, engineering, business, or finance.
- May apply to university, higher or degree apprenticeships, or both.
- May be unsure, comparing a few ideas, or already focused on a real opportunity.

The product remains useful to students choosing only one route. Applying to both is a supported workflow, not an onboarding requirement.

### Launch acquisition wedge

The first paid-acquisition and content campaigns target students in technology, engineering, business, and finance who are considering higher or degree apprenticeships alongside university backups. This wedge concentrates catalogue review, content, and user research where deadlines, rolling vacancies, and cross-route planning create acute need. It does not narrow the product's three starting points or prevent a university-only or apprenticeship-only student from using Routefinder.

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

Routefinder is an application-readiness and decision workspace.

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

### 1. Start at the student's current point

The first screen asks which statement is closest to the student's situation:

1. **I have a real opportunity in mind.** Start with a reviewed course, vacancy, or official link. Show one source-backed requirement, a clearly limited initial check, and one useful next action.
2. **I have a few ideas to compare.** Start with a small comparison set. Make the trade-offs, missing information, backup options, and next research action visible without declaring one route "best".
3. **I am not sure yet.** Start with interests, constraints, values, preferred work styles, and what matters to the student, including financial and progression considerations. Return route families and real examples worth investigating, with reasons, uncertainty, and small exploration actions rather than a career diagnosis.

Each path must produce a useful first result before demanding a complete profile. The target commercial experience permits a student to see this first result before account creation; an account is required to save progress, evidence, a portfolio, or a plan.

Collect readiness information progressively and only when it improves the next result:

- current year and intended application cycle;
- home location and travel/relocation constraints;
- qualifications, subjects, predicted or achieved grades, and unknown grades;
- sector and subject interests;
- university, apprenticeship, or combined intent;
- work-style and financial preferences;
- existing experience, projects, responsibilities, and activities;
- important constraints and missing information.

The output is a starting strategy, not a declared destination or prediction.

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
5. **Portfolio role**: ambitious, currently plausible, qualification-aligned alternative, exploratory, or needs checking. A qualification-aligned alternative does not claim an outcome.

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
- source links and freshness warnings;
- exportable basic summary.

Free users must be able to make a real decision and complete a real action. The paywall appears when they need breadth, continuity, or repeated preparation.

### Routefinder Cycle

- Founding launch: GBP29 for the first 50 paying users.
- Standard launch price: GBP59 for the relevant application cycle.
- Access ends on 30 September following the intended entry year, with clear notice at purchase.

Includes:

- more saved opportunities and unlimited evidence items;
- up to 15 active applications at once;
- expanded evidence-to-requirement views;
- continuous weekly planning and deadline reminders;
- full application tracker;
- portfolio balance and backup prompts;
- data export and priority support.

AI feedback and student-controlled parent/adviser sharing are post-MVP capabilities. Do not advertise them as part of the launch offer until their safety, privacy, and fair-use boundaries are implemented and tested.

The founding allocation is a research cohort. Show it truthfully, do not use a resetting countdown, and do not claim that conversion at GBP29 proves demand at GBP59. The standard offer remains the control until at least one cohort has reached the product-usefulness gate.

The launch checkout may be paid with a parent or carer's card while the student remains signed in and owns the account. Checkout and receipts must make the product, access end date, refund route, and lack of parent account access clear. A separate delegated purchase link is a conversion experiment, not a launch dependency, and requires object-authorisation and privacy review before implementation.

### Routefinder Coach

Launch only after the self-service workflow converts and a qualified adviser process is available.

- Price: GBP249 per application cycle.
- Includes Routefinder Cycle.
- One 30-minute session with an appropriately qualified adviser.
- Two asynchronous reviews of student-owned work.
- One interview or assessment-centre practice session.

Target direct delivery cost below GBP95 so gross margin remains above 60%. Limit availability rather than reducing quality.

The available adviser makes Coach a viable second revenue line, but not a launch dependency. Open a no-payment interest list alongside Cycle. After the self-service workflow has at least 20 paying users, Gate 2 is directionally on track, and the adviser scope, safeguarding, quality, capacity, complaints, and insurance position are documented, run a maximum five-place Coach pilot. Measure adviser minutes, student usefulness, conversion from Cycle, and contribution before increasing capacity or price.

### Schools and colleges

Begin with paid pilots after consumer activation and accuracy targets are met.

- Pilot: GBP995 plus VAT for one defined cohort of up to 75 Year 12/13 students for one academic year.
- Post-pilot target: GBP1,995 plus VAT for up to 250 students, then GBP4 per additional student.
- Include onboarding, student workspace access, aggregate progress views, intervention flags, exports, and support.
- Do not include a broad careers curriculum, MIS integration, or Gatsby reporting in the first pilot unless a buyer pays for and validates the need.

Sell improved application execution and adviser visibility, not replacement of an established careers platform.

The pilot price buys a bounded evaluation, not unlimited consultancy or a discounted whole-school licence. It requires a named buyer, success measures, an implementation owner, agreed support limits, and permission to use de-identified aggregate results. Case-study or reference participation may be requested but must not be a hidden condition of student access.

Do not raise the post-pilot price merely to increase headline revenue. Test willingness to pay against completed actions, adviser time saved, and intervention usefulness. Morrisby advertises a broader school licence at GBP995, while Unifrog already has substantial school penetration. Routefinder must earn a premium through distinct execution evidence rather than feature-count claims.

### Future adviser licence

Consider only after at least five advisers repeatedly use student sharing:

- multi-student workspace;
- templated review and intervention tools;
- explicit student consent and role-based access;
- per-adviser subscription with paid student seats.

## Profit model and economic rules

### Revenue sequence

1. Founding consumer payments prove willingness to pay GBP29 and reveal support needs; they do not validate GBP59.
2. Standard Cycle sales create scalable software revenue.
3. Coach creates higher average order value and informs product development.
4. School licences reduce reliance on seasonal consumer acquisition.
5. Adviser licences and funded-access partnerships become later distribution channels.

### Unit-economic targets

| Metric | Target |
| --- | ---: |
| Standard Cycle gross margin before general overhead | at least 75% in validation and at least 80% before scale |
| Founding Cycle contribution before founder time | positive; treated separately from standard pricing |
| Coach gross margin | at least 60% |
| School software/support gross margin | at least 75% |
| Blended AI and data cost per Cycle user | below GBP3 at launch; any later AI allowance has its own budget |
| Paid B2C customer acquisition cost | below GBP15 |
| Refund rate | below 5% |
| Median human support time per standard self-service paying user | below 10 minutes per cycle |

Do not scale paid advertising while customer acquisition cost exceeds 25% of first-cycle revenue or while activated-to-paid conversion is below 8%.

For each paid cohort calculate:

> contribution per order = customer price - VAT or other applicable tax - payment fees - expected refunds and disputes - variable data and AI - fulfilment and support - attributable acquisition cost

Use fully loaded support cost even when the founder performs the work. Stripe currently advertises 1.5% plus 20p for standard UK cards, so a GBP59 order loses about GBP1.09 to card processing before refunds, support, data, tax, or acquisition. The founding offer cannot meet the scalable margin target if it requires normal paid acquisition or high-touch support; its purpose is validation.

### Planning scenarios

These are operating scenarios, not forecasts.

| Scenario | Cycle | Coach | Schools | Approximate gross revenue |
| --- | ---: | ---: | ---: | ---: |
| Validation | 50 at GBP29 | 2 at GBP249 | 0 | GBP1,948 |
| Initial traction | 250 at blended GBP50 | 20 at GBP249 | 3 at GBP995 | GBP20,465 |
| Strong first full cycle | 1,000 at GBP59 | 100 at GBP249 | 20 at blended GBP1,500 | GBP113,900 |
| Scale signal | 5,000 at GBP59 | 300 at GBP249 | 75 at GBP1,995 | GBP519,325 |

The initial UK niche can support a meaningful company but not an enormous outcome by itself. A much larger business requires proven expansion into more subjects, more year groups, institutional distribution, and eventually further geographies. Expansion before product-market fit would reduce the probability of reaching that point.

The first-year operating objective is the `Initial traction` scenario, with the `Strong first full cycle` scenario as a stretch unlocked only by positive standard-price contribution and sustained product usefulness. TikTok reach does not justify adopting the stretch case until its downstream funnel is measured.

For organic short-form planning, use:

> expected Cycle orders = qualified views x landing-page visit rate x activation rate x activated-to-paid rate

At the existing monetisation gates, 1,000 Cycle orders require 12,500 activated students. At 50% visitor-to-activation, that requires 25,000 qualified landing-page visitors. The view volume required depends entirely on the currently unknown view-to-qualified-visit rate: 2.5 million views at 1%, or 10 million views at 0.25%. These are sensitivity examples, not conversion benchmarks or forecasts.

Every scenario must also show net payment revenue, expected refunds, direct support and fulfilment cost, attributable acquisition spend, and contribution. Do not use gross revenue alone to approve hiring, paid acquisition, or a new product line.

## Acquisition and growth

Distribution is part of the product and receives weekly founder time from the beginning.

### Primary acquisition loop

1. A student discovers a useful deadline, requirement, employer-process, or comparison page through search or short-form content.
2. The page leads to `/start`, where the student chooses focused, comparing, or unsure and receives one account-free result before sign-in.
3. The student saves three opportunities and receives a first evidence gap and action.
4. The student returns through a useful deadline or weekly-action reminder.
5. A portfolio limit, repeated preparation need, or parent/adviser share creates the paid moment.
6. The completed action or shareable summary creates a referral.

The returning-user step is currently the weakest part of this loop. On-site deadline and weekly-action notices are launch capabilities; email or messaging reminders are not assumed until a named processor, lawful basis or consent, unsubscribe behaviour, retention, deliverability, and operational ownership are documented. Do not describe an on-site notice as an email alert.

### Channel priority

1. The founder's existing TikTok account and native short-form series.
2. High-intent landing pages and answer pages derived from TikTok topics that produce qualified clicks.
3. Student referrals and ambassadors.
4. Parent webinars and parent-focused search content.
5. The existing adviser relationship, then careers advisers, tutors, sixth forms, colleges, and access organisations.
6. Carefully tested paid search and retargeting after conversion is proven.

Do not begin with broad paid social acquisition.

### TikTok operating system

Views are an input, not the success metric. Each series uses one problem, one audience, one tracked landing page, and one call to action. The founder publishes useful material even when the viewer never buys; urgency and scarcity claims must be factual.

Use a weekly cycle:

1. publish three to five variations on one proven application-readiness problem;
2. send interested viewers to a matching landing page, not a generic homepage;
3. measure qualified clicks, readiness starts, activations, paywall views, payments, refunds, and useful actions by series;
4. interview at least two activated users from the strongest series;
5. keep, revise, or stop the series using downstream behaviour rather than views alone;
6. repurpose only winning topics into search pages, email or webinar material, and longer video.

Do not attempt daily production across TikTok, YouTube, Instagram, SEO, webinars, and school outreach simultaneously. Cross-posting a proven asset is acceptable, but TikTok receives the original creative effort until another channel demonstrates better contribution per founder hour.

The first content-to-product tests are:

- compare a degree apprenticeship with a related university route;
- help a student with no clear route identify two route families worth investigating next;
- turn one published opportunity into a requirements-to-evidence example;
- identify one commonly missed application task before a real deadline;
- show how to build a balanced university and apprenticeship portfolio;
- explain to parents how to support without taking over student-owned work.

Only promote a sector or route slice after its fixed-persona catalogue coverage gate passes. Demand may determine which slice is promoted, but it never changes result ordering for an individual student.

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
- Use the existing adviser for buyer-language review, warm introductions where appropriate, and quality assurance; do not make one adviser the sole delivery dependency.
- Start buyer discovery and non-binding pilot reservations in August 2026, and 2027/28 budget conversations in autumn 2026.
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

### Gate 1: customer-ready MVP

Before opening payments, targeted from 15 September 2026 and no later than 15 October 2026 for the planned main cohort:

- the production activation flow works from account creation through a completed weekly action;
- authentication, object-level authorisation, export, deletion, backups, and payments pass;
- every published opportunity is reviewed and source-backed;
- every promoted acquisition slice passes the fixed-persona catalogue coverage gate, with at least three genuinely relevant, open, source-backed opportunities for every promoted persona;
- no demo record or total score appears in the commercial workflow;
- privacy, safeguarding, accessibility, refund, complaints, and support baselines have specialist review;
- mobile, keyboard, and WCAG 2.2 AA checks pass.
- the coarse `/api/readiness` gate passes and `PAYMENTS_ENABLED` remains `false` until the founder deliberately performs the final post-approval toggle;

Do not take customer payment before this gate passes.

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
- the GBP59 cohort is measured separately from the GBP29 founding cohort;
- standard Cycle produces positive contribution after payment fees, refunds, variable data, support, and attributable acquisition;
- refunds remain below 5%;
- paid acquisition stays paused until organic or partner-acquired cohorts meet these thresholds.

### Gate 4: repeatable growth

- at least 20% of new users arrive through referrals or shares;
- one organic content cluster produces activated users for four consecutive weeks;
- three paid school pilots are signed without bespoke product promises;
- blended contribution margin remains positive after AI, data, payment, support, and adviser costs.

## Success metrics

### Activation

A **first useful result** occurs when a student receives a relevant, explainable route or opportunity result and one useful next action from their selected starting point.

A student activates after:

1. completing the readiness details relevant to their selected starting point;
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

### Commercial funnel

Keep these denominators separate by offer, acquisition series, sector, route intent, and application cycle:

1. qualified landing-page visitor;
2. readiness-check starter;
3. readiness-check completer;
4. activated student;
5. paywall viewer;
6. checkout starter;
7. completed payer;
8. refunded or disputed payer;
9. retained payer with positive contribution.

Report visitor-to-paid, activated-to-paid, paywall-to-checkout, checkout-to-paid, revenue per qualified visitor, contribution per activated user, contribution per founder hour, and time to pay. Do not optimise checkout conversion in isolation: an earlier paywall can raise checkout rate while reducing activation, trust, and total contribution.

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

The implemented commercial workflow performs source observation in bounded database batches, keeps one superseding pending revision chain per opportunity, and preserves published reviewed values until a human accepts a source change. Publication and requirement review are service-owned database transactions with reviewer identity, mandatory notes, and retained prior facts. Source automation cannot call a browser-accessible publication operation.

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
12. Complete release hardening and open the founding launch.

After the MVP is operating safely, add constrained AI feedback, student-controlled sharing, and any institutional view as separately validated capabilities.

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
- AI feedback or practice before the post-MVP safety and fair-use boundary passes;
- parent/adviser sharing before the post-MVP consent and access-control boundary passes;
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

### 29 July to 16 August 2026

- stabilise the repository and release pipeline;
- establish Vercel, Supabase, authentication, secure persistence, consent, export, and deletion;
- confirm initial data licences and source access;
- draft privacy, safety, refund, safeguarding, complaints, and accessibility baselines;
- open a no-payment TikTok waitlist and run observed tests with students and parents or carers;
- begin school buyer discovery without promising an institutional product.

### 17 August to 13 September 2026

- replace readiness-first entry with the three approved starting points: unsure, comparing, or focused on a real opportunity;
- build the reviewed catalogue and opportunity shortlist;
- implement the five separate decision views;
- preserve the prototype under a clearly labelled demo boundary;
- run a free, observed beta against fixed activation and catalogue-coverage personas;
- decide by 15 September whether the complete paid gate supports early-deadline applicants; if it does not, exclude that promise from paid acquisition.

### 14 September to 14 October 2026

- ship evidence mapping, gap analysis, weekly actions, tracking, entitlements, and payments;
- publish the first high-intent content cluster;
- complete the DPIA, specialist policy review, accessibility review, threat model, restore test, and production smoke tests;
- open the capped founding cohort from 15 September only if Gate 1 passes completely;
- otherwise build the qualified January-deadline and rolling-apprenticeship waitlist while payments remain closed.

### 15 October 2026 latest planned paid opening

- open the customer-ready MVP and founding-launch price if Gate 1 has passed; the date never overrides a failed gate;
- monitor activation, source issues, payments, refunds, support, and completed weekly actions;
- operate it as the complete, supported MVP described in this document.

### 16 October 2026 to 13 January 2027

- target the main university application window;
- expand only within the four launch sectors;
- add AI feedback, sharing, or structured practice only after their post-MVP gates pass;
- develop the referral and parent webinar loops;
- convert earlier school discovery into three bounded paid-pilot proposals.

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
- [Stripe UK standard payment pricing](https://stripe.com/gb/pricing)

## Final decision rule

The next feature is the one that most improves one of these:

1. verified opportunity accuracy;
2. activation;
3. meaningful action completion;
4. paid conversion;
5. referral;
6. contribution margin.

If a proposed feature does not clearly improve one of these and is not required for safety, privacy, accessibility, or reliability, it does not belong in the first commercial version.
