import { describe, expect, it } from "vitest";

import type { Qualification } from "@/lib/mvp/types";
import { evaluateEligibilityRule, parseEligibilityRule } from "@/lib/scoring/eligibility-rules";

const mathsA: Qualification = {
  id: "maths-a",
  qualificationType: "A level",
  subject: "Mathematics",
  grade: "A",
  status: "achieved",
};

function rule(value: Record<string, unknown>) {
  const parsed = parseEligibilityRule({ eligibilityRule: value });
  if (!parsed) throw new Error("Test rule should parse");
  return parsed;
}

describe("eligibility rules", () => {
  it.each([
    ["above", "A", "B", "met-achieved"],
    ["equal", "B", "B", "met-achieved"],
    ["below", "C", "B", "unmet"],
    ["predicted", "A", "B", "met-predicted"],
  ] as const)("evaluates an individual qualification minimum when %s", (_case, grade, minimumGrade, expected) => {
    const qualification = { ...mathsA, grade, status: expected === "met-predicted" ? "predicted" as const : "achieved" as const };
    expect(evaluateEligibilityRule(rule({ version: 1, type: "qualification-minimum", qualificationType: "a-level", subject: "maths", minimumGrade }), [qualification]).outcome).toBe(expected);
  });

  it.each([
    ["missing structured value", undefined],
    ["empty structured value", {}],
    ["missing qualification type", { subject: "Mathematics", minimumGrade: "B" }],
    ["unsupported qualification", { qualificationType: "BTEC", subject: "Computing", minimumGrade: "D*" }],
    ["unsupported grade", { qualificationType: "A level", subject: "Mathematics", minimumGrade: "Pass" }],
  ])("rejects %s", (_case, value) => {
    expect(parseEligibilityRule(value)).toBeUndefined();
  });

  it("keeps unknown and malformed student grades separate from unmet grades", () => {
    const minimum = rule({ version: 1, type: "qualification-minimum", qualificationType: "a-level", subject: "mathematics", minimumGrade: "B" });
    expect(evaluateEligibilityRule(minimum, [{ ...mathsA, grade: undefined, status: "unknown" }]).outcome).toBe("unknown");
    expect(evaluateEligibilityRule(minimum, [{ ...mathsA, grade: "Pass" }]).outcome).toBe("unsupported-or-invalid");
  });

  it("does not treat a missing qualification as absent while the record is incomplete", () => {
    const minimum = rule({ version: 1, type: "qualification-minimum", qualificationType: "a-level", subject: "mathematics", minimumGrade: "B" });
    expect(evaluateEligibilityRule(minimum, [], false).outcome).toBe("unknown");
    expect(evaluateEligibilityRule(minimum, [], true).outcome).toBe("unmet");
  });

  it("does not treat a missing combination member as absent while the record is incomplete", () => {
    const combination = rule({ version: 1, type: "qualification-combination", qualificationType: "a-level", minimumGrades: ["A", "B"], subjectMinimums: [] });
    expect(evaluateEligibilityRule(combination, [mathsA], false).outcome).toBe("unknown");
    expect(evaluateEligibilityRule(combination, [mathsA], true).outcome).toBe("unmet");
  });

  it("requires distinct qualifications for a multi-grade combination", () => {
    const combination = rule({
      version: 1,
      type: "qualification-combination",
      qualificationType: "a-level",
      minimumGrades: ["A", "B", "B"],
      subjectMinimums: [{ subject: "mathematics", minimumGrade: "B" }],
    });
    expect(evaluateEligibilityRule(combination, [
      mathsA,
      { id: "physics-b", qualificationType: "A level", subject: "Physics", grade: "B", status: "achieved" },
      { id: "chemistry-b", qualificationType: "A level", subject: "Chemistry", grade: "B", status: "achieved" },
    ]).outcome).toBe("met-achieved");
    expect(evaluateEligibilityRule(combination, [mathsA, { id: "physics-b", qualificationType: "A level", subject: "Physics", grade: "B", status: "achieved" }]).outcome).toBe("unmet");
  });

  it("handles explicit alternatives without treating an uncertain branch as met", () => {
    const alternatives = rule({
      version: 1,
      type: "any-of",
      rules: [
        { version: 1, type: "qualification-minimum", qualificationType: "a-level", subject: "mathematics", minimumGrade: "A" },
        { version: 1, type: "qualification-minimum", qualificationType: "gcse", subject: "mathematics", minimumGrade: "9" },
      ],
    });
    expect(evaluateEligibilityRule(alternatives, [mathsA]).outcome).toBe("met-achieved");
    expect(evaluateEligibilityRule(alternatives, [{ ...mathsA, grade: "B" }]).outcome).toBe("unmet");
    expect(evaluateEligibilityRule(alternatives, [{ ...mathsA, grade: undefined, status: "unknown" }]).outcome).toBe("unknown");
  });

  it("does not skip an unsupported qualification alongside supported records", () => {
    const minimum = rule({ version: 1, type: "qualification-minimum", qualificationType: "a-level", subject: "mathematics", minimumGrade: "B" });
    expect(evaluateEligibilityRule(minimum, [
      mathsA,
      { id: "btec", qualificationType: "BTEC", subject: "Computing", grade: "D*D*D*", status: "achieved" },
    ]).outcome).toBe("unsupported-or-invalid");
  });

  it("does not treat a met alternative as sufficient when another alternative is unsupported", () => {
    const alternatives = rule({
      version: 1,
      type: "any-of",
      rules: [
        { version: 1, type: "qualification-minimum", qualificationType: "a-level", subject: "mathematics", minimumGrade: "A" },
        { version: 1, type: "qualification-minimum", qualificationType: "gcse", subject: "english language", minimumGrade: "4" },
      ],
    });
    expect(evaluateEligibilityRule(alternatives, [
      mathsA,
      { id: "btec", qualificationType: "BTEC", subject: "Computing", grade: "D*D*D*", status: "achieved" },
    ]).outcome).toBe("unsupported-or-invalid");
  });

  it("does not skip unsupported grades before checking combination size", () => {
    const combination = rule({
      version: 1,
      type: "qualification-combination",
      qualificationType: "a-level",
      minimumGrades: ["A", "B"],
      subjectMinimums: [],
    });
    expect(evaluateEligibilityRule(combination, [
      { ...mathsA, grade: "Pass" },
    ]).outcome).toBe("unsupported-or-invalid");
  });

  it("propagates unsupported branches through compound rules", () => {
    const allOf = rule({
      version: 1,
      type: "all-of",
      rules: [
        { version: 1, type: "qualification-minimum", qualificationType: "a-level", subject: "mathematics", minimumGrade: "A*" },
        { version: 1, type: "qualification-minimum", qualificationType: "gcse", subject: "english language", minimumGrade: "4" },
      ],
    });
    expect(evaluateEligibilityRule(allOf, [
      mathsA,
      { id: "btec", qualificationType: "BTEC", subject: "Computing", grade: "D*D*D*", status: "achieved" },
    ]).outcome).toBe("unsupported-or-invalid");
  });

  it("keeps legacy rules compatible only when complete", () => {
    expect(parseEligibilityRule({ qualificationType: "A level", subject: "Mathematics", minimumGrade: "B" })).toMatchObject({
      type: "qualification-minimum",
      qualificationType: "a-level",
      minimumGrade: "B",
    });
    expect(parseEligibilityRule({ qualificationType: "A level", subject: "Mathematics" })).toBeUndefined();
  });
});
