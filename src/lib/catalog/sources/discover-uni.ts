import { htmlToLines, stableHash } from "@/lib/catalog/text";
import type { RawSourceRecord, SourceFetchResult } from "@/lib/catalog/sources/types";
import { fetchText } from "@/lib/catalog/sources/types";

const source = "discoverUni" as const;
const DISCOVER_UNI_DATA_URL = "https://discoveruni.gov.uk/about-our-data/";
const DISCOVER_UNI_HOME_URL = "https://discoveruni.gov.uk/";

export function parseDiscoverUniRecords(html: string, fetchedAt: string): RawSourceRecord[] {
  const lines = htmlToLines(html);
  const titleLine = lines.find((line) => /about our data/i.test(line)) ?? "Discover Uni data";
  const mentions = {
    nationalStudentSurvey: lines.some((line) => /National Student Survey/i.test(line)),
    graduateOutcomes: lines.some((line) => /Graduate Outcomes/i.test(line)),
    longitudinalEducationOutcomes: lines.some((line) => /Longitudinal Education Outcomes/i.test(line)),
    entryInformation: lines.some((line) => /Entry information/i.test(line)),
  };

  return [
    {
      id: `source-record-${stableHash(`${source}:about-data`)}`,
      source,
      sourceId: DISCOVER_UNI_DATA_URL,
      kind: "source-page",
      title: titleLine,
      sourceUrl: DISCOVER_UNI_DATA_URL,
      raw: {
        fetchedAt,
        mentions,
        note:
          "Discover Uni publishes official course statistics and source explanations; detailed downloadable/API access should be added when an approved endpoint is available.",
      },
      tags: ["university", "official-statistics", "outcomes"],
    },
  ];
}

export async function fetchDiscoverUniSource(): Promise<SourceFetchResult> {
  const fetchedAt = new Date().toISOString();
  const [homeHtml, dataHtml] = await Promise.all([fetchText(DISCOVER_UNI_HOME_URL), fetchText(DISCOVER_UNI_DATA_URL)]);
  const sourceRecords = parseDiscoverUniRecords(dataHtml, fetchedAt);

  sourceRecords.push({
    id: `source-record-${stableHash(`${source}:home`)}`,
    source,
    sourceId: DISCOVER_UNI_HOME_URL,
    kind: "source-page",
    title: "Discover Uni course search",
    sourceUrl: DISCOVER_UNI_HOME_URL,
    raw: {
      fetchedAt,
      extractedTextLines: htmlToLines(homeHtml).slice(0, 30),
    },
    tags: ["university", "course-search"],
  });

  return {
    source,
    fetchedAt,
    pages: [
      { url: DISCOVER_UNI_HOME_URL, fetchedAt, html: homeHtml, label: "Discover Uni home" },
      { url: DISCOVER_UNI_DATA_URL, fetchedAt, html: dataHtml, label: "Discover Uni about data" },
    ],
    sourceRecords,
    universityCourses: [],
    apprenticeshipVacancies: [],
  };
}
