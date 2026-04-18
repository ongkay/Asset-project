import { describe, expect, it } from "vitest";

import { cdKeyIssueInputSchema, normalizeCdKeyManualCode } from "@/modules/cdkeys/schemas";

describe("cdkeys/schemas", () => {
  it("normalizes manual code to uppercase alphanumeric", () => {
    expect(normalizeCdKeyManualCode("  ab12-cd34  ")).toBe("AB12CD34");
  });

  it("normalizes blank optional fields to null", () => {
    const parsed = cdKeyIssueInputSchema.parse({
      packageId: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
      manualCode: "   ",
      amountRpOverride: null,
    });

    expect(parsed).toEqual({
      packageId: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
      manualCode: null,
      amountRpOverride: null,
    });
  });

  it("accepts safe non-negative integer overrides", () => {
    const parsed = cdKeyIssueInputSchema.parse({
      packageId: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
      manualCode: null,
      amountRpOverride: 0,
    });

    expect(parsed.amountRpOverride).toBe(0);
  });

  it("normalizes numeric string override into integer", () => {
    const parsed = cdKeyIssueInputSchema.parse({
      packageId: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
      manualCode: null,
      amountRpOverride: " 200000 ",
    });

    expect(parsed.amountRpOverride).toBe(200000);
  });

  it("rejects non-safe amount override", () => {
    const result = cdKeyIssueInputSchema.safeParse({
      packageId: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
      amountRpOverride: Number.MAX_SAFE_INTEGER + 1,
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      const issueMessages = result.error.issues.map((issue: { message: string }) => issue.message);
      expect(issueMessages).toContain("Amount override must be a safe integer.");
    }
  });

  it("rejects non-numeric amount override string", () => {
    const result = cdKeyIssueInputSchema.safeParse({
      packageId: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
      amountRpOverride: "abc",
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      const issueMessages = result.error.issues.map((issue: { message: string }) => issue.message);
      expect(issueMessages).toContain("Amount override must be a valid number.");
    }
  });

  it("rejects manual code shorter than 8 chars after normalization", () => {
    const result = cdKeyIssueInputSchema.safeParse({
      packageId: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
      manualCode: "ab12-c",
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Manual code length must be between 8 and 12 characters.");
    }
  });
});
