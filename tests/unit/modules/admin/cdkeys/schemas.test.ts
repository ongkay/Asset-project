import { describe, expect, it } from "vitest";

import {
  cdKeyDetailInputSchema,
  cdKeyIssueDialogBootstrapInputSchema,
  cdKeyTableFilterSchema,
  parseCdKeyTableSearchParams,
} from "@/modules/admin/cdkeys/schemas";

describe("admin/cdkeys/schemas", () => {
  it("normalizes malformed route params safely and ignores unknown params", () => {
    expect(
      parseCdKeyTableSearchParams({
        search: ["  Alice  "],
        status: "invalid",
        packageId: "not-a-uuid",
        packageSummary: "invalid",
        page: "0",
        pageSize: "999",
        anotherParam: "ignored",
      }),
    ).toEqual({
      search: "Alice",
      status: null,
      packageId: null,
      packageSummary: null,
      page: 1,
      pageSize: 10,
    });
  });

  it("accepts strict packageSummary values only", () => {
    expect(
      cdKeyTableFilterSchema.parse({
        search: null,
        status: null,
        packageId: null,
        packageSummary: "private",
        page: 1,
        pageSize: 10,
      }),
    ).toMatchObject({ packageSummary: "private" });

    const result = cdKeyTableFilterSchema.safeParse({
      search: null,
      status: null,
      packageId: null,
      packageSummary: "vip",
      page: 1,
      pageSize: 10,
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.packageSummary).toBeTruthy();
  });

  it("validates detail input id", () => {
    const result = cdKeyDetailInputSchema.safeParse({ id: " " });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.id).toContain("CD key ID is required.");
  });

  it("rejects non-uuid detail input id", () => {
    const result = cdKeyDetailInputSchema.safeParse({ id: "cd-1" });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.id).toContain("CD key ID is invalid.");
  });

  it("accepts and normalizes issue dialog bootstrap payload", () => {
    expect(cdKeyIssueDialogBootstrapInputSchema.parse({ anything: "ok" })).toEqual({});
  });
});
