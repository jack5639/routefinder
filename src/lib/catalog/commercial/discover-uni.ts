import { createHash } from "node:crypto";
import { strFromU8, unzipSync } from "fflate";

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
  sector: "technology" | "engineering" | "business" | "finance";
  rawSnapshot: Record<string, string>;
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
  const headers = (rows.shift() ?? []).map((header) => header.replace(/^\uFEFF/, "").trim().toUpperCase());
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, (values[index] ?? "").trim()])));
}

function value(row: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    if (row[key]) return row[key];
  }
  return "";
}

function launchSector(title: string): DiscoverUniCourseDraft["sector"] | null {
  const normalised = title.toLowerCase();
  if (/computer|computing|software|cyber|data science|information technology|artificial intelligence/.test(normalised)) return "technology";
  if (/engineer|manufactur|mechatronic|aerospace|robotic|electronic/.test(normalised)) return "engineering";
  if (/account|finance|banking|economics|actuari/.test(normalised)) return "finance";
  if (/business|management|marketing|entrepreneur|human resource/.test(normalised)) return "business";
  return null;
}

export function parseDiscoverUniArchive(bytes: Uint8Array, sourceUrl: string, retrievedAt = new Date().toISOString()): DiscoverUniDataset {
  if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error("discover-uni-invalid-archive");
  const files = unzipSync(bytes);
  const entry = Object.entries(files).find(([name]) => /(?:^|\/)kiscourse\.csv$/i.test(name));
  if (!entry) throw new Error("discover-uni-course-file-missing");
  const institutionEntry = Object.entries(files).find(([name]) => /(?:^|\/)(?:institution|provider)\.csv$/i.test(name));
  const institutions = institutionEntry ? parseCsv(strFromU8(institutionEntry[1])) : [];
  const institutionById = new Map(
    institutions.map((row) => [
      value(row, ["UKPRN", "PUBUKPRN", "PROVIDERID"]),
      value(row, ["LEGALNAME", "NAME", "PROVIDERNAME", "TRADINGNAME"]),
    ]),
  );
  const courseRows = parseCsv(strFromU8(entry[1]));
  const courses = courseRows.flatMap((row) => {
    const title = value(row, ["KISCOURSETITLE", "COURSETITLE", "TITLE"]);
    const sector = launchSector(title);
    const sourceId = value(row, ["KISCOURSEID", "COURSEID", "UCASPROGID"]);
    const providerId = value(row, ["UKPRN", "PUBUKPRN", "PROVIDERID"]);
    const providerName = institutionById.get(providerId) || value(row, ["PROVIDERNAME", "INSTITUTIONNAME"]);
    const applicationUrl = value(row, ["CRSEURL", "COURSEURL", "URL"]);
    if (!title || !sector || !sourceId || !providerName || !applicationUrl) return [];
    try {
      new URL(applicationUrl);
    } catch {
      return [];
    }
    return [{
      sourceId: `${providerId}:${sourceId}`,
      title,
      providerName,
      location: value(row, ["LOCNAME", "LOCATION", "TOWN", "REGION"]) || "See provider course page",
      applicationUrl,
      sector,
      rawSnapshot: row,
    }];
  });
  return {
    snapshot: {
      sourceUrl,
      retrievedAt,
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      licence: "CC-BY-4.0",
      attribution: "HESA, www.hesa.ac.uk",
    },
    courses,
  };
}

export async function fetchDiscoverUniDataset(sourceUrl: string): Promise<DiscoverUniDataset> {
  const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`discover-uni-${response.status}`);
  return parseDiscoverUniArchive(new Uint8Array(await response.arrayBuffer()), sourceUrl);
}
