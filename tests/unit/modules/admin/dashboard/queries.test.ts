import { beforeEach, describe, expect, it, vi } from "vitest";

const databaseMocks = vi.hoisted(() => ({
  createInsForgeAdminDatabase: vi.fn(),
  createInsForgeServerDatabase: vi.fn(),
}));

const authRepositoryMocks = vi.hoisted(() => ({
  readProfileByUserId: vi.fn(),
}));

const sessionServiceMocks = vi.hoisted(() => ({
  validateActiveAppSession: vi.fn(),
}));

vi.mock("@/lib/insforge/database", () => ({
  createInsForgeAdminDatabase: databaseMocks.createInsForgeAdminDatabase,
  createInsForgeServerDatabase: databaseMocks.createInsForgeServerDatabase,
}));

vi.mock("@/modules/auth/repositories", () => ({
  readProfileByUserId: authRepositoryMocks.readProfileByUserId,
}));

vi.mock("@/modules/sessions/services", () => ({
  validateActiveAppSession: sessionServiceMocks.validateActiveAppSession,
}));

describe("admin/dashboard/queries", () => {
  beforeEach(() => {
    sessionServiceMocks.validateActiveAppSession.mockReset();
    authRepositoryMocks.readProfileByUserId.mockReset();
    databaseMocks.createInsForgeAdminDatabase.mockReset();
    databaseMocks.createInsForgeServerDatabase.mockReset();

    sessionServiceMocks.validateActiveAppSession.mockResolvedValue({
      sessionId: "session-1",
      userId: "admin-1",
    });
    authRepositoryMocks.readProfileByUserId.mockResolvedValue({ role: "admin" });
  });

  it("builds one dashboard snapshot from rpc, transactions, subscriptions, and recent users", async () => {
    const rpc = vi.fn();

    const from = vi
      .fn()
      .mockImplementationOnce(() => ({
        select: () => ({
          eq: () => ({
            gte: () => ({
              lte: () => ({
                order: () =>
                  Promise.resolve({
                    data: [
                      {
                        created_at: "2026-04-01T10:00:00.000Z",
                        amount_rp: 200000,
                        status: "success",
                        user_id: "member-1",
                      },
                      {
                        created_at: "2026-04-02T11:00:00.000Z",
                        amount_rp: 300000,
                        status: "success",
                        user_id: "member-2",
                      },
                    ],
                    error: null,
                  }),
              }),
            }),
          }),
        }),
      }))
      .mockImplementationOnce(() => ({
        select: () => ({
          eq: () => ({
            order: () =>
              Promise.resolve({
                data: [
                  {
                    user_id: "member-1",
                    username: "alpha",
                    email: "alpha@example.com",
                    avatar_url: null,
                    created_at: "2026-04-01T09:00:00.000Z",
                    role: "member",
                  },
                  {
                    user_id: "member-2",
                    username: "beta",
                    email: "beta@example.com",
                    avatar_url: null,
                    created_at: "2026-04-02T09:00:00.000Z",
                    role: "member",
                  },
                ],
                error: null,
              }),
          }),
        }),
      }))
      .mockImplementationOnce(() => ({
        select: () =>
          Promise.resolve({
            data: [
              {
                user_id: "member-1",
                package_name: "Starter",
                access_keys_json: ["tradingview:private"],
                status: "active",
                start_at: "2026-03-25T00:00:00.000Z",
                end_at: "2026-04-30T00:00:00.000Z",
              },
              {
                user_id: "admin-2",
                package_name: "Ops Internal",
                access_keys_json: ["tradingview:private", "fxreplay:share"],
                status: "active",
                start_at: "2026-03-25T00:00:00.000Z",
                end_at: "2026-04-30T00:00:00.000Z",
              },
              {
                user_id: "member-2",
                package_name: "Pro Trial",
                access_keys_json: ["tradingview:share"],
                status: "expired",
                start_at: "2026-04-01T00:00:00.000Z",
                end_at: "2026-04-10T00:00:00.000Z",
              },
            ],
            error: null,
          }),
      }))
      .mockImplementationOnce(() => ({
        select: () =>
          Promise.resolve({
            data: [{ id: "asset-1" }, { id: "asset-2" }, { id: "asset-3" }],
            error: null,
          }),
      }))
      .mockImplementationOnce(() => ({
        select: () => ({
          order: () =>
            Promise.resolve({
              data: [
                {
                  user_id: "admin-2",
                  username: "ops-admin",
                  email: "ops-admin@example.com",
                  last_seen_at: "2026-04-20T11:30:00.000Z",
                },
                {
                  user_id: "member-1",
                  username: "alpha",
                  email: "alpha@example.com",
                  last_seen_at: "2026-04-20T11:00:00.000Z",
                },
                {
                  user_id: "member-2",
                  username: "beta",
                  email: "beta@example.com",
                  last_seen_at: "-infinity",
                },
              ],
              error: null,
            }),
        }),
      }));

    databaseMocks.createInsForgeAdminDatabase.mockReturnValue({ rpc, from });

    const { getAdminDashboardSnapshot } = await import("@/modules/admin/dashboard/queries");
    const result = await getAdminDashboardSnapshot({ preset: "30d", from: null, to: null });

    expect(databaseMocks.createInsForgeAdminDatabase).toHaveBeenCalledTimes(1);
    expect(rpc).not.toHaveBeenCalled();
    expect(result.summary.totalMembers).toBe(2);
    expect(result.summary.totalSubscribedMembers).toBe(1);
    expect(result.summary.totalAssets).toBe(3);
    expect(result.summary.totalSuccessAmountRp).toBe(500000);
    expect(result.subscriptionComposition).toEqual({ private: 1, share: 0, mixed: 0 });
    expect(result.salesSeries.find((point) => point.bucketKey === "2026-04-01")?.amountRp).toBe(200000);
    expect(result.transactionSeries.find((point) => point.bucketKey === "2026-04-02")?.successCount).toBe(1);
    expect(result.memberGrowthSeries.find((point) => point.bucketKey === "2026-04-02")?.newMembers).toBe(1);
    expect(result.memberGrowthSeries.find((point) => point.bucketKey === "2026-04-05")?.subscribedMembers).toBe(2);
    expect(result.memberGrowthSeries.find((point) => point.bucketKey === "2026-04-20")?.subscribedMembers).toBe(1);
    expect(result.recentUsers).toHaveLength(1);
    expect(result.recentUsers[0]).toMatchObject({ username: "alpha", activePackageName: "Starter" });
  }, 10_000);

  it("builds utc day buckets without leaking the previous local day", async () => {
    const { buildAdminDashboardDailySeries } = await import("@/modules/admin/dashboard/queries");

    expect(buildAdminDashboardDailySeries("2026-04-01T00:00:00.000Z", "2026-04-03T23:59:59.999Z")).toEqual([
      {
        amountRp: 0,
        bucketKey: "2026-04-01",
        bucketLabel: "01 Apr",
        newMembers: 0,
        subscribedMembers: 0,
        successCount: 0,
      },
      {
        amountRp: 0,
        bucketKey: "2026-04-02",
        bucketLabel: "02 Apr",
        newMembers: 0,
        subscribedMembers: 0,
        successCount: 0,
      },
      {
        amountRp: 0,
        bucketKey: "2026-04-03",
        bucketLabel: "03 Apr",
        newMembers: 0,
        subscribedMembers: 0,
        successCount: 0,
      },
    ]);
  });
});
