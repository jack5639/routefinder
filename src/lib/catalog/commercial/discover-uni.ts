import { createHash } from "node:crypto";
import { strFromU8, unzipSync } from "fflate";
import { z } from "zod";

export interface DiscoverUniSnapshot {
  sourceUrl: string;
  retrievedAt: string;
  bytes: number;
  sha256: string;
  licence: "CC-BY-4.0";
  attribution: "HESA, www.hesa.ac.uk";
}

export interface DiscoverUniCourseDraft {
  sourceId: string;
  title: string;
  providerName: string;
  location: string;
  applicationUrl: string;
  sector: "technology" | "engineering" | "business" | "finance" | "unclassified";
  classificationReason: string;
  rawSnapshot: {
    courseRows: Array<Record<string, string>>;
    courseLocationRows: Array<Record<string, string>>;
    locationRows: Array<Record<string, string>>;
  };
}

export interface DiscoverUniDataset {
  snapshot: DiscoverUniSnapshot;
  courses: DiscoverUniCourseDraft[];
}

function parseCsv(content: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    if (character === '"') {
      if (quoted && content[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && content[index + 1] === "\n") index += 1;
      row.push(cell);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const headerCounts = new Map<string, number>();
  const headers = (rows.shift() ?? []).map((header) => {
    const normalized = header.replace(/^\uFEFF/, "").trim().toUpperCase();
    const count = (headerCounts.get(normalized) ?? 0) + 1;
    headerCounts.set(normalized, count);
    return count === 1 ? normalized : `${normalized}_${count}`;
  });
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, (values[index] ?? "").trim()])));
}

function value(row: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    if (row[key]) return row[key];
  }
  return "";
}

export function classifyDiscoverUniSector(title: string): Pick<DiscoverUniCourseDraft, "sector" | "classificationReason"> {
  const normalised = title.toLowerCase();
  const matches = [
    ["technology", /computer|computing|software|cyber|data science|information technology|artificial intelligence/],
    ["engineering", /engineer|manufactur|mechatronic|aerospace|robotic|electronic/],
    ["finance", /account|finance|banking|economics|actuari/],
    ["business", /business|management|marketing|entrepreneur|human resource/],
  ].filter(([, pattern]) => (pattern as RegExp).test(normalised)) as Array<["technology" | "engineering" | "business" | "finance", RegExp]>;
  if (matches.length !== 1) return { sector: "unclassified", classificationReason: matches.length ? "ambiguous-sector-keywords" : "no-launch-sector-keywords" };
  return { sector: matches[0][0], classificationReason: `keyword:${matches[0][1].source}` };
}

const courseBoundarySchema = z.object({
  sourceId: z.string().min(1).max(240),
  title: z.string().min(1).max(300),
  providerName: z.string().min(1).max(300),
  location: z.string().min(1).max(300),
  applicationUrl: z.string().url(),
  sector: z.enum(["technology", "engineering", "business", "finance", "unclassified"]),
  classificationReason: z.string().min(1).max(300),
  rawSnapshot: z.object({
    courseRows: z.array(z.record(z.string(), z.string())).min(1),
    courseLocationRows: z.array(z.record(z.string(), z.string())),
    locationRows: z.array(z.record(z.string(), z.string())),
  }),
});

function groupedRows(rows: Array<Record<string, string>>, keyFor: (row: Record<string, string>) => string) {
  const grouped = new Map<string, Array<Record<string, string>>>();
  for (const row of rows) {
    const key = keyFor(row);
    if (key) grouped.set(key, [...(grouped.get(key) ?? []), row]);
  }
  return grouped;
}

function courseLocationKey(row: Record<string, string>) {
  const publicationProviderId = value(row, ["PUBUKPRN", "UKPRN", "PROVIDERID"]);
  const submittingProviderId = value(row, ["UKPRN", "PUBUKPRN", "PROVIDERID"]);
  const courseId = value(row, ["KISCOURSEID", "COURSEID", "UCASPROGID"]);
  const mode = value(row, ["KISMODE", "MODE"]);
  return publicationProviderId && submittingProviderId && courseId
    ? `${publicationProviderId}:${submittingProviderId}:${courseId}:${mode}`
    : "";
}

function displayLocation(names: string[], fallback: string) {
  const unique = [...new Set(names.map((name) => name.trim()).filter(Boolean))];
  if (!unique.length) return fallback || "See provider course page";
  const joined = unique.join("; ");
  if (joined.length <= 300) return joined;
  return `${unique.slice(0, 2).join("; ")}; and ${unique.length - 2} other locations`.slice(0, 300);
}

export function parseDiscoverUniArchive(bytes: Uint8Array, sourceUrl: string, retrievedAt = new Date().toISOString()): DiscoverUniDataset {
  if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error("discover-uni-invalid-archive");
  const files = unzipSync(bytes);
  const entry = Object.entries(files).find(([name]) => /(?:^|\/)kiscourse\.csv$/i.test(name));
  if (!entry) throw new Error("discover-uni-course-file-missing");
  const institutionEntry = Object.entries(files).find(([name]) => /(?:^|\/)(?:institution|provider)\.csv$/i.test(name));
  const institutions = institutionEntry ? parseCsv(strFromU8(institutionEntry[1])) : [];
  const institutionById = new Map<string, string>();
  const publicationCountryById = new Map<string, string>();
  for (const row of institutions) {
    const providerName = value(row, ["FIRST_TRADING_NAME", "TRADINGNAME", "LEGAL_NAME", "LEGALNAME", "NAME", "PROVIDERNAME"]);
    const publicationId = value(row, ["PUBUKPRN", "UKPRN", "PROVIDERID"]);
    const submittingId = value(row, ["UKPRN", "PUBUKPRN", "PROVIDERID"]);
    if (publicationId && providerName) institutionById.set(publicationId, providerName);
    if (submittingId && providerName && !institutionById.has(submittingId)) institutionById.set(submittingId, providerName);
    if (publicationId) publicationCountryById.set(publicationId, value(row, ["PUBUKPRNCOUNTRY", "COUNTRY"]));
  }
  const courseLocationEntry = Object.entries(files).find(([name]) => /(?:^|\/)courselocation\.csv$/i.test(name));
  const courseLocationRows = courseLocationEntry ? parseCsv(strFromU8(courseLocationEntry[1])) : [];
  const courseLocationsByCourse = groupedRows(courseLocationRows, courseLocationKey);
  const locationEntry = Object.entries(files).find(([name]) => /(?:^|\/)location\.csv$/i.test(name));
  const locationRows = locationEntry ? parseCsv(strFromU8(locationEntry[1])) : [];
  const locationById = new Map(locationRows.map((row) => [
    `${value(row, ["UKPRN", "PROVIDERID"])}:${value(row, ["LOCID", "LOCATIONID"])}`,
    row,
  ]));
  const courseRows = parseCsv(strFromU8(entry[1]));
  const candidates = courseRows.flatMap((row) => {
    const title = value(row, ["KISCOURSETITLE", "COURSETITLE", "TITLE", "TITLEW"]);
    const classification = classifyDiscoverUniSector(title);
    const courseId = value(row, ["KISCOURSEID", "COURSEID", "UCASPROGID"]);
    const providerId = value(row, ["PUBUKPRN", "UKPRN", "PROVIDERID"]);
    const sourceProviderId = value(row, ["UKPRN", "PUBUKPRN", "PROVIDERID"]);
    const providerName = institutionById.get(providerId) || value(row, ["PROVIDERNAME", "INSTITUTIONNAME"]);
    const applicationUrl = value(row, ["CRSEURL", "COURSEURL", "URL"]);
    if (!title || !courseId || !providerName || !applicationUrl || classification.classificationReason === "no-launch-sector-keywords") return [];
    // Routefinder's launch scope excludes Northern Ireland courses. HESA code XG means Northern Ireland.
    if (publicationCountryById.get(providerId) === "XG") return [];
    try {
      new URL(applicationUrl);
    } catch {
      return [];
    }
    const linkedCourseLocations = courseLocationsByCourse.get(courseLocationKey(row)) ?? [];
    const linkedLocations = linkedCourseLocations.flatMap((link) => {
      const location = locationById.get(`${value(link, ["UKPRN", "PROVIDERID"])}:${value(link, ["LOCID", "LOCATIONID"])}`);
      return location ? [location] : [];
    });
    const candidate = {
      // KISCOURSEID is scoped to the submitting institution (UKPRN), while the
      // user-facing provider is the publication institution (PUBUKPRN).
      sourceId: `${sourceProviderId}:${courseId}`,
      title,
      providerName,
      location: displayLocation(
        linkedLocations.map((location) => value(location, ["LOCNAME", "LOCATION", "TOWN", "REGION"])),
        value(row, ["LOCNAME", "LOCATION", "TOWN", "REGION"]),
      ),
      applicationUrl,
      ...classification,
      rawSnapshot: { courseRows: [row], courseLocationRows: linkedCourseLocations, locationRows: linkedLocations },
    };
    const parsed = courseBoundarySchema.safeParse(candidate);
    return parsed.success ? [parsed.data] : [];
  });
  const coursesBySourceId = new Map<string, DiscoverUniCourseDraft>();
  for (const candidate of candidates) {
    const existing = coursesBySourceId.get(candidate.sourceId);
    if (!existing) {
      coursesBySourceId.set(candidate.sourceId, candidate);
      continue;
    }
    if (
      existing.title !== candidate.title
      || existing.providerName !== candidate.providerName
      || existing.applicationUrl !== candidate.applicationUrl
      || existing.sector !== candidate.sector
    ) throw new Error("discover-uni-conflicting-course-identity");
    existing.location = displayLocation([existing.location, candidate.location], "See provider course page");
    existing.rawSnapshot.courseRows.push(...candidate.rawSnapshot.courseRows);
    existing.rawSnapshot.courseLocationRows.push(...candidate.rawSnapshot.courseLocationRows);
    existing.rawSnapshot.locationRows.push(...candidate.rawSnapshot.locationRows);
  }
  return {
    snapshot: {
      sourceUrl,
      retrievedAt,
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      licence: "CC-BY-4.0",
      attribution: "HESA, www.hesa.ac.uk",
    },
    courses: [...coursesBySourceId.values()],
  };
}

export async function fetchDiscoverUniDataset(sourceUrl: string): Promise<DiscoverUniDataset> {
  const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`discover-uni-${response.status}`);
  return parseDiscoverUniArchive(new Uint8Array(await response.arrayBuffer()), sourceUrl);
}
