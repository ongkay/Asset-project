import { describe, expect, it } from "vitest";

import {
  adminManualActivationFormSchema,
  subscriberCancelSchema,
  subscriberQuickAddAssetSchema,
} from "@/modules/subscriptions/schemas";

describe("subscriptions/schemas", () => {
  it("normalizes blank manual assignment values to null", () => {
    const parsed = adminManualActivationFormSchema.parse({
      userId: "user-1",
      packageId: "package-1",
      durationDays: 30,
      manualAssignmentsByAccessKey: {
        "tradingview:private": " asset-1 ",
        "fxreplay:share": "   ",
      },
    });

    expect(parsed).toEqual({
      userId: "user-1",
      packageId: "package-1",
      durationDays: 30,
      manualAssignmentsByAccessKey: {
        "tradingview:private": "asset-1",
        "fxreplay:share": null,
      },
    });
  });

  it("rejects a non-positive activation duration", () => {
    const result = adminManualActivationFormSchema.safeParse({
      userId: "user-1",
      packageId: "package-1",
      durationDays: 0,
      manualAssignmentsByAccessKey: {},
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.durationDays).toContain("Duration must be a positive integer.");
  });

  it("normalizes optional quick-add fields", () => {
    const parsed = subscriberQuickAddAssetSchema.parse({
      userId: "user-1",
      packageId: "package-1",
      subscriptionId: "subscription-1",
      platform: "tradingview",
      account: " trader@example.com ",
      durationDays: 14,
      note: "  private inventory  ",
      proxy: "   ",
      assetJsonText: '{"session":"abc"}',
    });

    expect(parsed).toEqual({
      userId: "user-1",
      packageId: "package-1",
      subscriptionId: "subscription-1",
      platform: "tradingview",
      account: "trader@example.com",
      durationDays: 14,
      note: "private inventory",
      proxy: null,
      assetJsonText: '{"session":"abc"}',
    });
  });

  it("requires a subscription id to cancel", () => {
    const result = subscriberCancelSchema.safeParse({
      subscriptionId: "   ",
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.subscriptionId).toContain("Subscription ID is required.");
  });
});
