import { createHash } from "node:crypto";

export function normaliseText(value: string | undefined | null) {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

export function normaliseKey(value: string | undefined | null) {
  return normaliseText(value).toLowerCase();
}

export function slugify(value: string) {
  return normaliseKey(value)
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function stableHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);
}

export function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&ndash;/g, "-")
    .replace(/&mdash;/g, "-")
    .replace(/&middot;/g, "·")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 10)));
}

export function htmlToLines(html: string) {
  const text = decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h\d|section|article|tr|td|dt|dd|a)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  );

  return text
    .split(/\r?\n/)
    .map(normaliseText)
    .filter(Boolean);
}

export function absoluteUrl(value: string | undefined, baseUrl: string) {
  if (!value) {
    return undefined;
  }

  try {
    return new URL(decodeHtml(value), baseUrl).toString();
  } catch {
    return undefined;
  }
}

const tagSynonyms: Record<string, string[]> = {
  technology: ["computer", "computing", "software", "digital", "data", "cyber", "it ", "information technology"],
  engineering: ["engineering", "mechanical", "civil", "electrical", "manufacturing", "technician"],
  business: ["business", "management", "marketing", "finance", "accounting", "operations", "project"],
  health: ["health", "nursing", "care", "paramedic", "medicine", "clinical", "social care"],
  design: ["design", "animation", "media", "creative", "film", "games", "visual"],
  education: ["education", "teaching", "childcare", "early years"],
  law: ["law", "legal", "criminology", "policing"],
  science: ["science", "biology", "chemistry", "physics", "laboratory"],
  construction: ["construction", "building", "surveying", "architecture"],
};

export function inferTagsFromText(...values: Array<string | undefined | null>) {
  const searchable = normaliseKey(values.filter(Boolean).join(" "));
  const tags = new Set<string>();

  Object.entries(tagSynonyms).forEach(([tag, synonyms]) => {
    if (synonyms.some((synonym) => searchable.includes(synonym))) {
      tags.add(tag);
    }
  });

  if (!tags.size && searchable) {
    tags.add(searchable.split(/[^a-z0-9]+/).filter(Boolean)[0]);
  }

  return Array.from(tags);
}
