import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const jiti = require("jiti")(fileURLToPath(import.meta.url), {
  alias: {
    "@": fileURLToPath(new URL("../../src", import.meta.url)),
  },
  interopDefault: true,
  esmResolve: true,
});

const { initCatalogue, syncCatalogue, getCatalogueStatusReport, runCatalogueAgent } = jiti("../../src/lib/catalog/cli.ts");

const command = process.argv[2] ?? "status";
const args = process.argv.slice(3);

function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

try {
  if (command === "init") {
    const dbPath = initCatalogue();
    console.log(`Catalogue database ready at ${dbPath}`);
  } else if (command === "sync") {
    const sources = args.filter((arg) => !arg.startsWith("--"));
    const results = await syncCatalogue({ sources });
    printJson(results);
    process.exitCode = results.some((result) => result.status === "failed") ? 1 : 0;
  } else if (command === "status") {
    printJson(getCatalogueStatusReport());
  } else if (command === "agent") {
    await runCatalogueAgent({ once: args.includes("--once") });
  } else {
    console.error(`Unknown catalogue command: ${command}`);
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
