const fallbackPostLoginPath = "/app";

const postLoginPaths = [
  "/app",
  "/readiness",
  "/opportunities",
  "/portfolio",
  "/evidence",
  "/tracker",
  "/account",
  "/strategy",
  "/admin/catalogue",
] as const;

const postLoginPathSet = new Set<string>(postLoginPaths);
const controlCharacter = /[\u0000-\u001F\u007F]/;

export type PostLoginPath = (typeof postLoginPaths)[number];

export function normalisePostLoginPath(value: unknown): PostLoginPath {
  if (typeof value !== "string" || controlCharacter.test(value) || value.includes("\\") || !value.startsWith("/") || value.startsWith("//")) {
    return fallbackPostLoginPath;
  }

  let decoded = value;
  try {
    for (let index = 0; index < 4; index += 1) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
  } catch {
    return fallbackPostLoginPath;
  }

  if (controlCharacter.test(decoded) || decoded.includes("\\") || !decoded.startsWith("/") || decoded.startsWith("//")) {
    return fallbackPostLoginPath;
  }

  return postLoginPathSet.has(value) ? (value as PostLoginPath) : fallbackPostLoginPath;
}
