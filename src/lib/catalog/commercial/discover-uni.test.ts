import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { classifyDiscoverUniSector, parseDiscoverUniArchive } from "@/lib/catalog/commercial/discover-uni";

describe("Discover Uni commercial dataset boundary", () => {
  it("normalises launch-sector courses and preserves attribution metadata", () => {
    const archive = zipSync({
      "INSTITUTION.csv": strToU8("UKPRN,LEGALNAME\n1001,Example University\n"),
      "KISCOURSE.csv": strToU8(
        'UKPRN,KISCOURSEID,KISCOURSETITLE,CRSEURL,LOCNAME\n1001,C1,"Computer Science, BSc",https://example.ac.uk/c1,London\n1001,C2,History,https://example.ac.uk/c2,London\n',
      ),
    });
    const result = parseDiscoverUniArchive(archive, "https://www.hesa.ac.uk/discover-uni.zip", "2026-07-29T00:00:00.000Z");
    expect(result.courses).toEqual([
      expect.objectContaining({ sourceId: "1001:C1", providerName: "Example University", sector: "technology" }),
    ]);
    expect(result.snapshot).toMatchObject({ licence: "CC-BY-4.0", attribution: "HESA, www.hesa.ac.uk" });
  });
  it("rejects data that is not a ZIP archive", () => {
    expect(() => parseDiscoverUniArchive(strToU8("not a zip"), "https://example.test/data")).toThrow("invalid-archive");
  });
  it("retains ambiguous launch-sector courses as unclassified", () => {
    expect(classifyDiscoverUniSector("Software engineering and business management")).toEqual({
      sector: "unclassified",
      classificationReason: "ambiguous-sector-keywords",
    });
  });
});
