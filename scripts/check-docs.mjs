import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const root = process.cwd();
const ignoredDirectories = new Set([".git", ".next", ".pnpm-store", "coverage", "dist", "node_modules", "out"]);
const requiredDocuments = [
  "AGENTS.md",
  "README.md",
  "docs/README.md",
  "docs/product-direction.md",
  "docs/v3-reset.md",
  "docs/architecture.md",
  "docs/product-decisions.md",
  "docs/scoring-model.md",
  "docs/adr/001-local-storage-boundary.md",
  "docs/adr/002-verified-data-and-bounded-ai.md",
];
const retiredDocuments = [
  "docs/mvp-spec.md",
  "docs/phase-plan.md",
  "docs/product-plan.md",
  "docs/user-workflow.md",
];

function collectFiles(directory, predicate) {
  const files = [];

  for (const name of readdirSync(directory)) {
    if (ignoredDirectories.has(name)) {
      continue;
    }

    const path = join(directory, name);
    const stats = statSync(path);

    if (stats.isDirectory()) {
      files.push(...collectFiles(path, predicate));
    } else if (predicate(path)) {
      files.push(path);
    }
  }

  return files;
}

function projectPath(path) {
  return relative(root, path).replaceAll("\\", "/");
}

const errors = [];

for (const document of requiredDocuments) {
  if (!existsSync(resolve(root, document))) {
    errors.push(`Required document is missing: ${document}`);
  }
}

for (const document of retiredDocuments) {
  if (existsSync(resolve(root, document))) {
    errors.push(`Retired duplicate document has returned: ${document}`);
  }
}

const markdownFiles = collectFiles(root, (path) => path.endsWith(".md"));
const conflictMarker = /^(<<<<<<<|=======|>>>>>>>)/m;
const markdownLink = /\[[^\]]*]\(([^)]+)\)/g;

for (const file of markdownFiles) {
  const content = readFileSync(file, "utf8");

  if (conflictMarker.test(content)) {
    errors.push(`Conflict marker found in ${projectPath(file)}`);
  }

  for (const match of content.matchAll(markdownLink)) {
    const rawTarget = match[1].trim();
    const target = rawTarget.split("#", 1)[0];

    if (!target || /^(https?:|mailto:)/i.test(target)) {
      continue;
    }

    const resolvedTarget = resolve(dirname(file), decodeURIComponent(target));

    if (!existsSync(resolvedTarget)) {
      errors.push(`Broken Markdown link in ${projectPath(file)}: ${rawTarget}`);
    }
  }
}

const documentationIndex = readFileSync(resolve(root, "docs/README.md"), "utf8");

for (const file of markdownFiles) {
  const path = projectPath(file);

  if (!path.startsWith("docs/") || path === "docs/README.md") {
    continue;
  }

  const relativeToDocs = relative(resolve(root, "docs"), file).replaceAll("\\", "/");

  if (!documentationIndex.includes(`(${relativeToDocs})`)) {
    errors.push(`Document is not linked from docs/README.md: ${path}`);
  }
}

const sourceFiles = collectFiles(root, (path) => /\.(?:cjs|js|mjs|ts|tsx)$/.test(path));
const referencedEnvironmentVariables = new Set();
const environmentReference = /process\.env\.([A-Z][A-Z0-9_]*)/g;

for (const file of sourceFiles) {
  const content = readFileSync(file, "utf8");

  for (const match of content.matchAll(environmentReference)) {
    referencedEnvironmentVariables.add(match[1]);
  }
}

const environmentExamplePath = resolve(root, ".env.example");

if (!existsSync(environmentExamplePath)) {
  errors.push(".env.example is missing");
} else {
  const environmentExample = readFileSync(environmentExamplePath, "utf8");
  const documentedVariables = new Set(
    [...environmentExample.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((match) => match[1]),
  );

  for (const variable of referencedEnvironmentVariables) {
    if (!documentedVariables.has(variable)) {
      errors.push(`Environment variable is missing from .env.example: ${variable}`);
    }
  }
}

if (errors.length > 0) {
  console.error(`Documentation check failed with ${errors.length} issue(s):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(
    `Documentation check passed: ${markdownFiles.length} Markdown files, ${referencedEnvironmentVariables.size} environment variables.`,
  );
}
