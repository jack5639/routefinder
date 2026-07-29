import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { beforeEach, describe, expect, it } from "vitest";

import { GET } from "@/app/api/catalogue/status/route";

describe("catalogue status API", () => {
  beforeEach(() => {
    process.env.CATALOG_DB_PATH = join(mkdtempSync(join(tmpdir(), "routefinder-status-")), "catalog.sqlite");
  });

  it("returns a fallback status payload before the local database exists", async () => {
    const response = await GET();
    const body = await response.json();

    expect(body).toMatchObject({
      usedFallback: true,
    });
    expect(body.freshness).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "ucas",
          freshnessStatus: "demo",
        }),
      ]),
    );
  });
});
