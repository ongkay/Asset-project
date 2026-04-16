import { describe, expect, it } from "vitest";

import { assetTableFilterSchema, parseAssetTableSearchParams } from "@/modules/admin/assets/schemas";

describe("admin/assets/schemas", () => {
  it("accepts a valid table filter payload", () => {
    expect(
      assetTableFilterSchema.parse({
        search: " alpha ",
        assetType: "share",
        status: "available",
        expiresFrom: "2026-06-01",
        expiresTo: "2026-06-30",
        page: 2,
        pageSize: 25,
      }),
    ).toEqual({
      search: "alpha",
      assetType: "share",
      status: "available",
      expiresFrom: "2026-06-01",
      expiresTo: "2026-06-30",
      page: 2,
      pageSize: 25,
    });
  });

  it("rejects reversed expiry ranges", () => {
    const result = assetTableFilterSchema.safeParse({
      search: null,
      assetType: null,
      status: null,
      expiresFrom: "2026-06-30",
      expiresTo: "2026-06-01",
      page: 1,
      pageSize: 10,
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.expiresTo).toContain(
      "Expiry start date cannot be later than expiry end date.",
    );
  });

  it("normalizes search params for invalid pagination and filters", () => {
    expect(
      parseAssetTableSearchParams({
        search: "  alice  ",
        assetType: "invalid-type",
        status: "invalid-status",
        page: "0",
        pageSize: "999",
      }),
    ).toEqual({
      search: "alice",
      assetType: null,
      status: null,
      expiresFrom: null,
      expiresTo: null,
      page: 1,
      pageSize: 10,
    });
  });

  it("drops reversed date range params from URL state", () => {
    expect(
      parseAssetTableSearchParams({
        expiresFrom: "2026-06-30",
        expiresTo: "2026-06-01",
        assetType: "private",
        status: "disabled",
      }),
    ).toEqual({
      search: null,
      assetType: "private",
      status: "disabled",
      expiresFrom: null,
      expiresTo: null,
      page: 1,
      pageSize: 10,
    });
  });
});
