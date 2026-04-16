import { describe, expect, it } from "vitest";

import { parseSubscriberTableSearchParams, subscriberTableFilterSchema } from "@/modules/admin/subscriptions/schemas";

describe("admin/subscriptions/schemas", () => {
  it("normalizes malformed route params without crashing the page", () => {
    expect(
      parseSubscriberTableSearchParams({
        search: [" alice "],
        assetType: "invalid",
        status: "active",
        expiresFrom: "2026-04-20",
        expiresTo: "2026-04-10",
        page: "0",
        pageSize: "999",
      }),
    ).toEqual({
      search: "alice",
      assetType: null,
      status: "active",
      expiresFrom: null,
      expiresTo: null,
      page: 1,
      pageSize: 10,
    });
  });

  it("rejects reversed expiry ranges in the canonical filter contract", () => {
    const result = subscriberTableFilterSchema.safeParse({
      search: null,
      assetType: null,
      status: null,
      expiresFrom: "2026-04-20",
      expiresTo: "2026-04-10",
      page: 1,
      pageSize: 10,
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.expiresTo).toContain(
      "Expiry start date cannot be later than expiry end date.",
    );
  });
});
