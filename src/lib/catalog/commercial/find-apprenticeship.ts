import { z } from "zod";

const vacancySchema = z.object({
  vacancyReference: z.string().min(1).max(100).or(z.number()).transform(String),
  title: z.string().trim().min(1).max(300),
  employerName: z.string().trim().min(1).max(300).default("Employer not supplied"),
  description: z.string().trim().max(10_000).default("Open apprenticeship vacancy."),
  closingDate: z.string().max(100).optional(),
  vacancyUrl: z.string().url().optional(),
  applicationUrl: z.string().url().optional(),
  postedDate: z.string().optional(),
  addresses: z.array(z.object({
    addressLine1: z.string().optional(),
    town: z.string().optional(),
    county: z.string().optional(),
    postcode: z.string().optional(),
  })).optional(),
  address: z.object({ addressLine1: z.string().optional(), town: z.string().optional(), county: z.string().optional() }).optional(),
  route: z.string().max(300).optional(),
  course: z.object({ title: z.string().max(300).optional() }).optional(),
}).passthrough();

const responseSchema = z.object({
  vacancies: z.array(vacancySchema).optional(),
  items: z.array(vacancySchema).optional(),
  results: z.array(vacancySchema).optional(),
  totalPages: z.number().int().nonnegative().optional(),
  pageCount: z.number().int().nonnegative().optional(),
  totalResults: z.number().int().nonnegative().optional(),
  hasNextPage: z.boolean().optional(),
}).passthrough();

export function classifyApprenticeshipSector(text: string): { sector: "technology" | "engineering" | "business" | "finance" | "unclassified"; reason: string } {
  const value = text.toLowerCase();
  const matches = [
    ["engineering", /engineer|manufactur|mechanic|aerospace|electrical|civil engineering/],
    ["finance", /account|bank|finance|audit|tax|insurance|actuar/],
    ["technology", /software|cyber|digital|data |computer|it support|information technology/],
    ["business", /business|management|sales|marketing|project management|human resources/],
  ].filter(([, pattern]) => (pattern as RegExp).test(value)) as Array<["technology" | "engineering" | "business" | "finance", RegExp]>;
  if (matches.length !== 1) return { sector: "unclassified", reason: matches.length ? "ambiguous-sector-keywords" : "no-launch-sector-keywords" };
  return { sector: matches[0][0], reason: `keyword:${matches[0][1].source}` };
}

export interface ApprenticeshipDraft {
  sourceId: string;
  title: string;
  providerName: string;
  location: string;
  summary: string;
  deadline?: string;
  applicationUrl: string;
  sourceUrl: string;
  retrievedAt: string;
  sector: "technology" | "engineering" | "business" | "finance" | "unclassified";
  classificationReason: string;
  rawSnapshot: unknown;
}

export async function fetchApprenticeshipDrafts(apiKey: string, options: { maxPages?: number; fetcher?: typeof fetch } = {}): Promise<{ drafts: ApprenticeshipDraft[]; complete: boolean }> {
  const fetcher = options.fetcher ?? fetch;
  const maxPages = options.maxPages ?? 100;
  const all: ApprenticeshipDraft[] = [];
  let page = 1;
  let complete = false;
  while (page <= maxPages) {
  const sourceUrl = new URL("https://api.apprenticeships.education.gov.uk/vacancies");
  sourceUrl.searchParams.set("PageNumber", String(page));
  sourceUrl.searchParams.set("PageSize", "100");
  let response: Response | undefined;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const candidate = await fetcher(sourceUrl, { headers: { "Ocp-Apim-Subscription-Key": apiKey, "X-Version": "2" }, signal: AbortSignal.timeout(20_000) });
      if (candidate.ok || ![429, 500, 502, 503, 504].includes(candidate.status) || attempt === 2) { response = candidate; break; }
    } catch { if (attempt === 2) throw new Error("display-api-fetch-failed"); }
    await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
  }
  if (!response) throw new Error("display-api-no-response");
  if (!response.ok) throw new Error(`display-api-${response.status}`);
  const parsed = responseSchema.parse(await response.json());
  const vacancies = parsed.vacancies ?? parsed.items ?? parsed.results ?? [];
  const retrievedAt = new Date().toISOString();
  all.push(...vacancies.map((vacancy) => {
    const address = vacancy.addresses?.[0] ?? vacancy.address;
    const official = vacancy.vacancyUrl ?? vacancy.applicationUrl ?? `https://www.findapprenticeship.service.gov.uk/apprenticeship/VAC${vacancy.vacancyReference}`;
    const classification = classifyApprenticeshipSector(`${vacancy.title} ${vacancy.route ?? ""} ${vacancy.course?.title ?? ""}`);
    return {
      sourceId: vacancy.vacancyReference,
      title: vacancy.title,
      providerName: vacancy.employerName,
      location: [address?.town, address?.county].filter(Boolean).join(", ") || "Location on official listing",
      summary: vacancy.description.slice(0, 1200),
      deadline: vacancy.closingDate,
      applicationUrl: official,
      sourceUrl: official,
      retrievedAt,
      sector: classification.sector,
      classificationReason: classification.reason,
      rawSnapshot: vacancy,
    };
  }));
  const totalPages = parsed.totalPages ?? parsed.pageCount;
  if (
    parsed.hasNextPage === false
    || (totalPages !== undefined && page >= totalPages)
    || (parsed.totalResults !== undefined && all.length >= parsed.totalResults)
    || (parsed.hasNextPage === undefined && totalPages === undefined && parsed.totalResults === undefined && vacancies.length < 100)
  ) { complete = true; break; }
  page += 1;
  }
  if (!complete) throw new Error("display-api-incomplete-pagination");
  const bySourceId = new Map<string, ApprenticeshipDraft>();
  for (const draft of all) {
    const prior = bySourceId.get(draft.sourceId);
    if (prior && JSON.stringify(prior.rawSnapshot) !== JSON.stringify(draft.rawSnapshot)) throw new Error("display-api-duplicate-source-id");
    bySourceId.set(draft.sourceId, draft);
  }
  return { drafts: [...bySourceId.values()], complete };
}
