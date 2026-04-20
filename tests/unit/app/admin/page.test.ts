import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/admin/dashboard/queries", () => ({
  getAdminDashboardSnapshot: vi.fn(),
}));

vi.mock("@/modules/admin/dashboard/schemas", async () => {
  const actual = await vi.importActual<typeof import("@/modules/admin/dashboard/schemas")>(
    "@/modules/admin/dashboard/schemas",
  );

  return {
    ...actual,
    parseAdminDashboardSearchParams: vi.fn(),
  };
});

vi.mock("@/modules/users/services", () => ({
  requireAdminShellAccess: vi.fn(),
}));

vi.mock("@/app/(admin)/admin/_components/admin-dashboard-page", () => ({
  AdminDashboardPage: vi.fn(() => null),
}));

import * as dashboardQueries from "@/modules/admin/dashboard/queries";
import * as dashboardSchemas from "@/modules/admin/dashboard/schemas";
import * as userServices from "@/modules/users/services";

import AdminRoutePage from "@/app/(admin)/admin/page";

describe("app/admin/page", () => {
  beforeEach(() => {
    vi.mocked(dashboardQueries.getAdminDashboardSnapshot).mockReset();
    vi.mocked(dashboardSchemas.parseAdminDashboardSearchParams).mockReset();
    vi.mocked(userServices.requireAdminShellAccess).mockReset();
    vi.mocked(userServices.requireAdminShellAccess).mockResolvedValue({
      profile: { userId: "admin-1" },
    } as never);
  });

  it("guards access, parses dashboard filters, and loads the initial snapshot", async () => {
    vi.mocked(dashboardSchemas.parseAdminDashboardSearchParams).mockReturnValue({
      preset: "90d",
      from: null,
      to: null,
    });
    vi.mocked(dashboardQueries.getAdminDashboardSnapshot).mockResolvedValueOnce({
      summary: { totalMembers: 8, totalSubscribedMembers: 4, totalAssets: 12, totalSuccessAmountRp: 500000 },
      salesSeries: [],
      memberGrowthSeries: [],
      transactionSeries: [],
      subscriptionComposition: { private: 3, share: 1, mixed: 2 },
      recentUsers: [],
      range: {
        preset: "90d",
        from: "2026-01-21",
        to: "2026-04-20",
        fromIso: "2026-01-21T00:00:00.000Z",
        toIso: "2026-04-20T23:59:59.999Z",
        label: "90 hari",
      },
    });

    const element = await AdminRoutePage({ searchParams: Promise.resolve({ preset: "90d" }) });

    expect(vi.mocked(userServices.requireAdminShellAccess)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(dashboardSchemas.parseAdminDashboardSearchParams)).toHaveBeenCalledWith({ preset: "90d" });
    expect(vi.mocked(dashboardQueries.getAdminDashboardSnapshot)).toHaveBeenCalledWith({
      preset: "90d",
      from: null,
      to: null,
    });
    expect(element.props.initialFilters).toEqual({ preset: "90d", from: null, to: null });
    expect(element.props.initialError).toBeNull();
  });
});
