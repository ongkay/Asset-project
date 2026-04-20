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

  it("returns null when a direct package read sanitizes down to no valid access keys", async () => {
    databaseMocks.createInsForgeAdminDatabase.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: "11111111-1111-4111-8111-111111111111",
                name: "Legacy Package",
                amount_rp: 150000,
                duration_days: 30,
                is_extended: true,
                access_keys_json: ["invalid:key", "legacy:share"],
                is_active: true,
              },
              error: null,
            }),
          }),
        }),
      }),
    });

    const { getPackageById } = await import("@/modules/subscriptions/repositories");

    await expect(getPackageById("11111111-1111-4111-8111-111111111111")).resolves.toBeNull();
  });

  it("filters legacy package rows that have no valid access keys from admin selection", async () => {
    databaseMocks.createInsForgeAdminDatabase.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            order: vi.fn().mockResolvedValue({
              data: [
                {
                  id: "11111111-1111-4111-8111-111111111111",
                  name: "Legacy Package",
                  amount_rp: 150000,
                  duration_days: 30,
                  is_extended: true,
                  access_keys_json: ["invalid:key", "legacy:share"],
                  is_active: true,
                },
              ],
              error: null,
            }),
          }),
        }),
      }),
    });

    const { listPackagesForAdminSelection } = await import("@/modules/subscriptions/repositories");
    const result = await listPackagesForAdminSelection();

    expect(result).toEqual([]);
  });
});
