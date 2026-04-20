import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/users/services", () => ({
  getAuthenticatedAppUser: vi.fn().mockResolvedValue({
    id: "admin-1",
    profile: { isBanned: false, role: "admin", userId: "admin-1" },
    session: { id: "session-1", userId: "admin-1" },
  }),
}));

vi.mock("@/modules/admin/dashboard/queries", () => ({
  getAdminDashboardSnapshot: vi.fn(),
}));

import * as dashboardQueries from "@/modules/admin/dashboard/queries";
import { getAdminDashboardSnapshotAction } from "@/modules/admin/dashboard/actions";

const mockedGetAdminDashboardSnapshot = vi.mocked(dashboardQueries.getAdminDashboardSnapshot);

describe("admin/dashboard/actions", () => {
  beforeEach(() => {
    mockedGetAdminDashboardSnapshot.mockReset();
  });

  it("returns a stable success envelope for valid filters", async () => {
    mockedGetAdminDashboardSnapshot.mockResolvedValueOnce({
      summary: { totalMembers: 1, totalSubscribedMembers: 1, totalAssets: 1, totalSuccessAmountRp: 100000 },
      salesSeries: [],
      memberGrowthSeries: [],
      transactionSeries: [],
      subscriptionComposition: { private: 1, share: 0, mixed: 0 },
      recentUsers: [],
      range: {
        preset: "30d",
        from: "2026-03-22",
        to: "2026-04-20",
        fromIso: "2026-03-22T00:00:00.000Z",
        toIso: "2026-04-20T23:59:59.999Z",
        label: "30 hari",
      },
    });

    const result = await getAdminDashboardSnapshotAction({ preset: "30d", from: null, to: null });

    expect(result?.data?.ok).toBe(true);
    expect(result?.data?.snapshot?.summary.totalMembers).toBe(1);
  });
});
