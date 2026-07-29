import type { ApprenticeshipVacancy } from "@/types";
import { absoluteUrl, htmlToLines, inferTagsFromText, normaliseKey, normaliseText, stableHash } from "@/lib/catalog/text";
import type { RawSourceRecord, SourceFetchResult } from "@/lib/catalog/sources/types";
import { fetchText } from "@/lib/catalog/sources/types";

const source = "findApprenticeshipEngland" as const;
const FIND_APPRENTICESHIP_URL = "https://www.findapprenticeship.service.gov.uk/apprenticeshipsearch";
const SEARCH_URLS = [
  FIND_APPRENTICESHIP_URL,
  `${FIND_APPRENTICESHIP_URL}?searchMode=Keyword&keywords=software`,
  `${FIND_APPRENTICESHIP_URL}?searchMode=Keyword&keywords=business`,
  `${FIND_APPRENTICESHIP_URL}?searchMode=Keyword&keywords=engineering`,
  `${FIND_APPRENTICESHIP_URL}?searchMode=Keyword&keywords=health`,
];

function extractVacancyLinks(html: string, baseUrl: string) {
  const links: Array<{ title: string; href?: string }> = [];
  const linkPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = linkPattern.exec(html))) {
    const title = normaliseText(match[2].replace(/<[^>]+>/g, " "));
    const href = absoluteUrl(match[1], baseUrl);

    if (title.length > 3 && href && /apprenticeship|vacancy|detail/i.test(href) && !/sign in|feedback|cookies|terms/i.test(title)) {
      links.push({ title, href });
    }
  }

  return links;
}

function lineAfter(lines: string[], startIndex: number, patterns: RegExp[]) {
  const foundIndex = lines.findIndex((line, index) => index >= startIndex && patterns.some((pattern) => pattern.test(line)));
  return foundIndex >= 0 ? lines[foundIndex] : undefined;
}

export function parseFindApprenticeshipVacancies(
  html: string,
  fetchedAt: string,
  pageUrl = FIND_APPRENTICESHIP_URL,
): { records: RawSourceRecord[]; vacancies: ApprenticeshipVacancy[] } {
  const lines = htmlToLines(html);
  const links = extractVacancyLinks(html, pageUrl);
  const records: RawSourceRecord[] = [];
  const vacancies: ApprenticeshipVacancy[] = [];
  const listedCountLine = lines.find((line) => /apprenticeships listed/i.test(line));

  if (listedCountLine) {
    records.push({
      id: `source-record-${stableHash(`${source}:aggregate:${pageUrl}`)}`,
      source,
      sourceId: pageUrl,
      kind: "aggregate",
      title: "Find an apprenticeship listing count",
      sourceUrl: pageUrl,
      raw: {
        listedCountLine,
        fetchedAt,
      },
      tags: ["apprenticeship", "aggregate"],
    });
  }

  const seen = new Set<string>();

  links.forEach((link) => {
    const lineIndex = lines.findIndex((line) => normaliseKey(line) === normaliseKey(link.title));
    const employer = lineIndex >= 0 ? lineAfter(lines, lineIndex + 1, [/^employer:/i, /^employer\b/i])?.replace(/^employer:?\s*/i, "") : undefined;
    const location = lineIndex >= 0 ? lineAfter(lines, lineIndex + 1, [/^location:/i, /^where:/i])?.replace(/^(location|where):?\s*/i, "") : undefined;
    const wage = lineIndex >= 0 ? lineAfter(lines, lineIndex + 1, [/£|wage|salary|annual/i]) : undefined;
    const closingDate = lineIndex >= 0 ? lineAfter(lines, lineIndex + 1, [/closing date|apply by/i])?.replace(/^(closing date|apply by):?\s*/i, "") : undefined;
    const level = lineIndex >= 0 ? lineAfter(lines, lineIndex + 1, [/level\s+\d|advanced|higher|degree apprenticeship/i]) : undefined;
    const sourceId = link.href ?? `${pageUrl}:${link.title}`;
    const dedupeKey = normaliseKey(sourceId);

    if (seen.has(dedupeKey)) {
      return;
    }

    seen.add(dedupeKey);

    const tags = inferTagsFromText(link.title, employer, location, level);
    const vacancy: ApprenticeshipVacancy = {
      id: `apprenticeship-${stableHash(sourceId)}`,
      source,
      sourceId,
      title: link.title,
      employerName: employer,
      apprenticeshipLevel: level,
      location,
      wage,
      closingDate,
      vacancyUrl: link.href,
      status: "open",
      tags,
      lastSeenAt: fetchedAt,
    };

    vacancies.push(vacancy);
    records.push({
      id: `source-record-${stableHash(`${source}:vacancy:${sourceId}`)}`,
      source,
      sourceId,
      kind: "apprenticeship-vacancy",
      title: link.title,
      sourceUrl: link.href,
      raw: { ...vacancy },
      tags,
    });
  });

  return { records, vacancies };
}

export async function fetchFindApprenticeshipEnglandSource(): Promise<SourceFetchResult> {
  const fetchedAt = new Date().toISOString();
  const pages = await Promise.all(
    SEARCH_URLS.map(async (url) => ({
      url,
      fetchedAt,
      html: await fetchText(url),
      label: "Find an apprenticeship search",
    })),
  );

  const sourceRecords: RawSourceRecord[] = [];
  const apprenticeshipVacancies: ApprenticeshipVacancy[] = [];
  const seenVacancies = new Set<string>();

  pages.forEach((page) => {
    const parsed = parseFindApprenticeshipVacancies(page.html, fetchedAt, page.url);
    sourceRecords.push(...parsed.records);
    parsed.vacancies.forEach((vacancy) => {
      if (!seenVacancies.has(vacancy.sourceId)) {
        seenVacancies.add(vacancy.sourceId);
        apprenticeshipVacancies.push(vacancy);
      }
    });
  });

  return {
    source,
    fetchedAt,
    pages,
    sourceRecords,
    universityCourses: [],
    apprenticeshipVacancies,
  };
}
