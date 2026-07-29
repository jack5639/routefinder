import { z } from "zod";

const vacancySchema = z.object({
  vacancyReference: z.string().or(z.number()).transform(String),
  title: z.string(),
  employerName: z.string().default("Employer not supplied"),
  description: z.string().default("Open apprenticeship vacancy."),
  closingDate: z.string().optional(),
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
  route: z.string().optional(),
  course: z.object({ title: z.string().optional() }).optional(),
}).passthrough();

const responseSchema = z.object({
  vacancies: z.array(vacancySchema).optional(),
  items: z.array(vacancySchema).optional(),
  results: z.array(vacancySchema).optional(),
}).passthrough();

function sectorFor(text: string) {
  const value = text.toLowerCase();
  if (/engineer|manufactur|mechanic|aerospace|electrical/.test(value)) return "engineering";
  if (/account|bank|finance|audit|tax|insurance/.test(value)) return "finance";
  if (/business|management|sales|marketing|project/.test(value)) return "business";
  return "technology";
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
  sector: "technology" | "engineering" | "business" | "finance";
  rawSnapshot: unknown;
}

export async function fetchApprenticeshipDrafts(apiKey: string, page = 1): Promise<ApprenticeshipDraft[]> {
  const sourceUrl = new URL("https://api.apprenticeships.education.gov.uk/vacancies");
  sourceUrl.searchParams.set("PageNumber", String(page));
  sourceUrl.searchParams.set("PageSize", "100");
  const response = await fetch(sourceUrl, {
    headers: { "Ocp-Apim-Subscription-Key": apiKey, "X-Version": "2" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`display-api-${response.status}`);
  const parsed = responseSchema.parse(await response.json());
  const vacancies = parsed.vacancies ?? parsed.items ?? parsed.results ?? [];
  const retrievedAt = new Date().toISOString();
  return vacancies.map((vacancy) => {
    const address = vacancy.addresses?.[0] ?? vacancy.address;
    const official = vacancy.vacancyUrl ?? vacancy.applicationUrl ?? `https://www.findapprenticeship.service.gov.uk/apprenticeship/VAC${vacancy.vacancyReference}`;
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
      sector: sectorFor(`${vacancy.title} ${vacancy.route ?? ""} ${vacancy.course?.title ?? ""}`),
      rawSnapshot: vacancy,
    };
  });
}
