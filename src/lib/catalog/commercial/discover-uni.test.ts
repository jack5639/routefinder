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

  it("supports the current HESA header names", () => {
    const archive = zipSync({
      "INSTITUTION.csv": strToU8("PUBUKPRN,LEGAL_NAME\n1001,Current Example University\n"),
      "KISCOURSE.csv": strToU8("PUBUKPRN,KISCOURSEID,TITLE,CRSEURL\n1001,C1,Data Science,https://example.ac.uk/data\n"),
    });

    expect(parseDiscoverUniArchive(archive, "https://www.hesa.ac.uk/discover-uni.zip").courses).toEqual([
      expect.objectContaining({ title: "Data Science", providerName: "Current Example University", sector: "technology" }),
    ]);
  });

  it("deduplicates repeated rows for one official course identifier", () => {
    const archive = zipSync({
      "INSTITUTION.csv": strToU8("PUBUKPRN,LEGAL_NAME\n1001,Example University\n"),
      "KISCOURSE.csv": strToU8("PUBUKPRN,KISCOURSEID,TITLE,CRSEURL\n1001,C1,Computer Science,https://example.ac.uk/c1\n1001,C1,Computer Science,https://example.ac.uk/c1\n"),
    });
    const courses = parseDiscoverUniArchive(archive, "https://www.hesa.ac.uk/discover-uni.zip").courses;
    expect(courses).toHaveLength(1);
    expect(courses[0].rawSnapshot.courseRows).toHaveLength(2);
  });

  it("uses the publication provider and resolves official course locations", () => {
    const archive = zipSync({
      "INSTITUTION.csv": strToU8("PUBUKPRN,UKPRN,FIRST_TRADING_NAME,PUBUKPRNCOUNTRY\n1001,1001,Publishing College,XF\n2002,2002,Submitting University,XF\n"),
      "KISCOURSE.csv": strToU8("PUBUKPRN,UKPRN,KISCOURSEID,KISMODE,TITLE,CRSEURL\n1001,2002,C1,01,Computer Science,https://example.ac.uk/c1\n"),
      "COURSELOCATION.csv": strToU8("PUBUKPRN,UKPRN,KISCOURSEID,KISMODE,LOCID\n1001,2002,C1,01,A\n"),
      "LOCATION.csv": strToU8("UKPRN,LOCID,LOCNAME\n2002,A,City campus\n"),
    });

    expect(parseDiscoverUniArchive(archive, "https://www.hesa.ac.uk/discover-uni.zip").courses[0]).toMatchObject({
      sourceId: "2002:C1",
      providerName: "Publishing College",
      location: "City campus",
    });
  });

  it("excludes Northern Ireland publication providers from the launch boundary", () => {
    const archive = zipSync({
      "INSTITUTION.csv": strToU8("PUBUKPRN,FIRST_TRADING_NAME,PUBUKPRNCOUNTRY\n1001,Northern Example University,XG\n"),
      "KISCOURSE.csv": strToU8("PUBUKPRN,KISCOURSEID,TITLE,CRSEURL\n1001,C1,Computer Science,https://example.ac.uk/c1\n"),
    });

    expect(parseDiscoverUniArchive(archive, "https://www.hesa.ac.uk/discover-uni.zip").courses).toEqual([]);
  });

  it("preserves repeated CSV fields in the raw source snapshot", () => {
    const archive = zipSync({
      "INSTITUTION.csv": strToU8("PUBUKPRN,LEGAL_NAME\n1001,Example University\n"),
      "KISCOURSE.csv": strToU8("PUBUKPRN,KISCOURSEID,TITLE,CRSEURL,HECOS,HECOS\n1001,C1,Computer Science,https://example.ac.uk/c1,alpha,beta\n"),
    });

    expect(parseDiscoverUniArchive(archive, "https://www.hesa.ac.uk/discover-uni.zip").courses[0].rawSnapshot.courseRows[0]).toMatchObject({
      HECOS: "alpha",
      HECOS_2: "beta",
    });
  });
});
