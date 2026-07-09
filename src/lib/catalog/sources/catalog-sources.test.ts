import { describe, expect, it } from "vitest";

import { parseDiscoverUniRecords } from "@/lib/catalog/sources/discover-uni";
import { parseFindApprenticeshipVacancies } from "@/lib/catalog/sources/find-apprenticeship-england";
import { parseUcasCourses } from "@/lib/catalog/sources/ucas";

describe("catalogue source normalizers", () => {
  it("normalises UCAS course cards into university course records", () => {
    const html = `
      <a href="https://digital.ucas.com/coursedisplay/courses/abc">Computer Science</a>
      <p>Example University</p>
      <p>Main campus</p>
      <p>BSc (Hons) · 3 years · Full-time · September 2027</p>
      <p>UCAS Tariff: 112 points</p>
    `;

    const parsed = parseUcasCourses(html, "2026-07-09T10:00:00.000Z");

    expect(parsed.courses).toHaveLength(1);
    expect(parsed.courses[0]).toMatchObject({
      title: "Computer Science",
      providerName: "Example University",
      qualification: "BSc (Hons)",
      duration: "3 years",
      studyMode: "Full-time",
      tariff: "112 points",
    });
    expect(parsed.records[0].sourceUrl).toBe("https://digital.ucas.com/coursedisplay/courses/abc");
  });

  it("keeps Discover Uni official source-page data as auditable source records", () => {
    const records = parseDiscoverUniRecords(
      `
        <h1>About our data</h1>
        <p>National Student Survey</p>
        <p>Graduate Outcomes</p>
        <p>Longitudinal Education Outcomes</p>
      `,
      "2026-07-09T10:00:00.000Z",
    );

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      source: "discoverUni",
      kind: "source-page",
      sourceUrl: "https://discoveruni.gov.uk/about-our-data/",
    });
    expect(records[0].raw).toMatchObject({
      mentions: {
        nationalStudentSurvey: true,
        graduateOutcomes: true,
        longitudinalEducationOutcomes: true,
      },
    });
  });

  it("normalises Find an apprenticeship vacancy links and aggregate counts", () => {
    const html = `
      <p>6,005 apprenticeships listed</p>
      <a href="/apprenticeship/123">Software developer apprenticeship</a>
      <p>Employer: Example Tech Ltd</p>
      <p>Location: London</p>
      <p>Annual wage £21,000</p>
      <p>Closing date: 31 August 2026</p>
      <p>Level 6 Degree apprenticeship</p>
    `;

    const parsed = parseFindApprenticeshipVacancies(
      html,
      "2026-07-09T10:00:00.000Z",
      "https://www.findapprenticeship.service.gov.uk/apprenticeshipsearch",
    );

    expect(parsed.records.some((record) => record.kind === "aggregate")).toBe(true);
    expect(parsed.vacancies).toHaveLength(1);
    expect(parsed.vacancies[0]).toMatchObject({
      title: "Software developer apprenticeship",
      employerName: "Example Tech Ltd",
      location: "London",
      closingDate: "31 August 2026",
      status: "open",
    });
  });
});
