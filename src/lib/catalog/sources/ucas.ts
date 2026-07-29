import type { UniversityCourse } from "@/types";
import { absoluteUrl, decodeHtml, htmlToLines, inferTagsFromText, normaliseKey, normaliseText, stableHash } from "@/lib/catalog/text";
import type { RawSourceRecord, SourceFetchResult } from "@/lib/catalog/sources/types";
import { fetchText } from "@/lib/catalog/sources/types";

const source = "ucas" as const;
const UCAS_SEARCH_URL = "https://www.ucas.com/explore/search/all";

function stripTags(value: string) {
  return normaliseText(decodeHtml(value.replace(/<[^>]+>/g, " ")));
}

function extractCourseLinks(html: string) {
  const links: Array<{ title: string; href?: string }> = [];
  const linkPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = linkPattern.exec(html))) {
    const href = absoluteUrl(match[1], UCAS_SEARCH_URL);
    const title = stripTags(match[2]);
    const isCourseLike =
      title.length > 2 &&
      !/related courses?|see all|courses\b|search|students|providers|advisers|businesses/i.test(title) &&
      (href?.includes("digital.ucas.com") || href?.includes("/explore/"));

    if (isCourseLike) {
      links.push({ title, href });
    }
  }

  return links;
}

function parseDetails(details: string) {
  const parts = details.split("·").map(normaliseText).filter(Boolean);
  const qualification = parts[0];
  const duration = parts.find((part) => /\byears?\b|\bmonths?\b/i.test(part));
  const studyMode = parts.find((part) => /full-time|part-time|sandwich|distance/i.test(part));
  const startDate = parts.find((part) => /(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}/i.test(part));

  return { qualification, duration, studyMode, startDate };
}

export function parseUcasCourses(html: string, fetchedAt: string): { records: RawSourceRecord[]; courses: UniversityCourse[] } {
  const lines = htmlToLines(html);
  const links = extractCourseLinks(html);
  const linkByTitle = new Map<string, string>();

  links.forEach((link) => {
    if (link.href && !linkByTitle.has(normaliseKey(link.title))) {
      linkByTitle.set(normaliseKey(link.title), link.href);
    }
  });

  const seen = new Set<string>();
  const records: RawSourceRecord[] = [];
  const courses: UniversityCourse[] = [];

  for (let index = 0; index < lines.length - 4; index += 1) {
    const title = lines[index];
    const providerName = lines[index + 1];
    const campus = lines[index + 2];
    const details = lines[index + 3];
    const tariff = lines.slice(index + 4, index + 7).find((line) => line.toLowerCase().startsWith("ucas tariff:"));
    const looksLikeCourse =
      title.length > 2 &&
      providerName.length > 2 &&
      /\b(BA|BSc|BEng|FdA|FdSc|LLB|MEng|HNC|HND|BEd|CertHE|DipHE)\b/i.test(details) &&
      /UCAS Tariff:/i.test(tariff ?? "");

    if (!looksLikeCourse) {
      continue;
    }

    const courseUrl = linkByTitle.get(normaliseKey(title));
    const dedupeKey = normaliseKey(`${title}|${providerName}|${campus}|${details}|${tariff ?? ""}`);

    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);

    const sourceId = courseUrl ?? dedupeKey;
    const id = `ucas-course-${stableHash(sourceId)}`;
    const parsedDetails = parseDetails(details);
    const tags = inferTagsFromText(title, providerName, campus, details);
    const course: UniversityCourse = {
      id,
      source,
      sourceId,
      title,
      providerName,
      campus,
      courseUrl,
      applyUrl: courseUrl,
      tariff: tariff?.replace(/^UCAS Tariff:\s*/i, ""),
      subject: tags[0],
      tags,
      lastSeenAt: fetchedAt,
      ...parsedDetails,
    };

    courses.push(course);
    records.push({
      id: `source-record-${stableHash(`${source}:course:${sourceId}`)}`,
      source,
      sourceId,
      kind: "university-course",
      title,
      sourceUrl: courseUrl,
      raw: { ...course },
      tags,
    });
  }

  return { records, courses };
}

export async function fetchUcasSource(): Promise<SourceFetchResult> {
  const fetchedAt = new Date().toISOString();
  const html = await fetchText(UCAS_SEARCH_URL);
  const parsed = parseUcasCourses(html, fetchedAt);
  const pageRecord: RawSourceRecord = {
    id: `source-record-${stableHash(`${source}:page:${UCAS_SEARCH_URL}`)}`,
    source,
    sourceId: UCAS_SEARCH_URL,
    kind: "source-page",
    title: "UCAS course search",
    sourceUrl: UCAS_SEARCH_URL,
    raw: {
      url: UCAS_SEARCH_URL,
      extractedCourseCount: parsed.courses.length,
    },
    tags: ["university", "course-search"],
  };

  return {
    source,
    fetchedAt,
    pages: [{ url: UCAS_SEARCH_URL, fetchedAt, html, label: "UCAS course search" }],
    sourceRecords: [pageRecord, ...parsed.records],
    universityCourses: parsed.courses,
    apprenticeshipVacancies: [],
  };
}
