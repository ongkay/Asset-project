import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/users/services", () => ({
  getAuthenticatedAppUser: vi.fn().mockResolvedValue({
    id: "admin-user-id",
    profile: {
      role: "admin",
    },
  }),
}));

vi.mock("@/modules/subscriptions/services", () => ({
  activateSubscriptionManually: vi.fn(),
  cancelSubscription: vi.fn(),
  quickAddSubscriberAsset: vi.fn(),
}));

import * as subscriptionServices from "@/modules/subscriptions/services";
import {
  activateSubscriptionManuallyAction,
  cancelSubscriptionAction,
  quickAddSubscriberAssetAction,
} from "@/modules/subscriptions/actions";

const mockedActivateSubscriptionManually = vi.mocked(subscriptionServices.activateSubscriptionManually);
const mockedCancelSubscription = vi.mocked(subscriptionServices.cancelSubscription);
const mockedQuickAddSubscriberAsset = vi.mocked(subscriptionServices.quickAddSubscriberAsset);

describe("subscriptions/actions", () => {
  beforeEach(() => {
    mockedActivateSubscriptionManually.mockReset();
    mockedCancelSubscription.mockReset();
    mockedQuickAddSubscriberAsset.mockReset();
  });

  it("rejects invalid manual activation input before the service runs", async () => {
    const result = await activateSubscriptionManuallyAction({
      userId: "user-1",
      packageId: "package-1",
      durationDays: 0,
      manualAssignmentsByAccessKey: {},
    });

    expect(result?.validationErrors?.fieldErrors.durationDays).toContain("Duration must be a positive integer.");
    expect(mockedActivateSubscriptionManually).not.toHaveBeenCalled();
  });

  it("returns a stable failure payload when activation throws", async () => {
    mockedActivateSubscriptionManually.mockRejectedValueOnce(new Error("Package is disabled."));

    const result = await activateSubscriptionManuallyAction({
      userId: "user-1",
      packageId: "package-1",
      durationDays: 30,
      manualAssignmentsByAccessKey: {},
    });

    expect(result?.data).toEqual({
      ok: false,
      message: "Package is disabled.",
    });
  });

  it("returns the new asset and access key after quick add succeeds", async () => {
    mockedQuickAddSubscriberAsset.mockResolvedValueOnce({
      assetId: "asset-1",
      accessKey: "tradingview:private",
    });

    const result = await quickAddSubscriberAssetAction({
      userId: "user-1",
      packageId: "package-1",
      subscriptionId: null,
      platform: "tradingview",
      account: "asset@example.com",
      durationDays: 14,
      note: null,
      proxy: null,
      assetJsonText: '{"session":"abc"}',
    });

    expect(result?.data).toEqual({
      ok: true,
      assetId: "asset-1",
      accessKey: "tradingview:private",
    });
  });

  it("returns the canceled subscription id when cancel succeeds", async () => {
    mockedCancelSubscription.mockResolvedValueOnce({
      subscriptionId: "subscription-1",
    });

    const result = await cancelSubscriptionAction({
      subscriptionId: "subscription-1",
    });

    expect(result?.data).toEqual({
      ok: true,
      subscriptionId: "subscription-1",
    });
  });
});
