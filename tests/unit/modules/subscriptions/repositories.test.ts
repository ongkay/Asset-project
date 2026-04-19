import { beforeEach, describe, expect, it, vi } from "vitest";

const databaseMocks = vi.hoisted(() => ({
  createInsForgeAdminDatabase: vi.fn(),
}));

vi.mock("@/lib/insforge/database", () => ({
  createInsForgeAdminDatabase: databaseMocks.createInsForgeAdminDatabase,
}));

vi.mock("@/modules/assets/repositories", () => ({
  listAssetStatusesByIds: vi.fn(),
}));

describe("subscriptions/repositories", () => {
  beforeEach(() => {
    databaseMocks.createInsForgeAdminDatabase.mockReset();
  });

  it("accepts canonical UUID-like asset ids returned by assign_best_asset", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: "20000000-0000-0000-0000-000000000003",
      error: null,
    });

    databaseMocks.createInsForgeAdminDatabase.mockReturnValue({ rpc });

    const { assignBestAssetForSubscription } = await import("@/modules/subscriptions/repositories");

    await expect(
      assignBestAssetForSubscription({
        subscriptionId: "subscription-1",
        accessKey: "tradingview:share",
      }),
    ).resolves.toBe("20000000-0000-0000-0000-000000000003");
  });
});
