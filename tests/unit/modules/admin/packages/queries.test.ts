import { beforeEach, describe, expect, it, vi } from "vitest";

const repositoryMocks = vi.hoisted(() => ({
  listCurrentSubscriptionsByPackageIds: vi.fn(),
  listPackages: vi.fn(),
}));

vi.mock("@/modules/packages/repositories", () => ({
  getPackageEditorData: vi.fn(),
  listCurrentSubscriptionsByPackageIds: repositoryMocks.listCurrentSubscriptionsByPackageIds,
  listPackages: repositoryMocks.listPackages,
}));

import { getPackageTablePage } from "@/modules/admin/packages/queries";

describe("admin/packages/queries", () => {
  beforeEach(() => {
    repositoryMocks.listCurrentSubscriptionsByPackageIds.mockReset();
    repositoryMocks.listPackages.mockReset();
  });

  it("skips legacy package rows whose access keys can no longer derive a summary", async () => {
    repositoryMocks.listPackages.mockResolvedValue({
      items: [
        {
          accessKeys: [],
          amountRp: 150000,
          checkoutGroup: "legacy",
          checkoutUrl: null,
          code: "PKG-INVALID",
          createdAt: "2026-04-01T00:00:00.000Z",
          durationDays: 30,
          id: "pkg-invalid",
          isActive: true,
          isExtended: true,
          listAmountRp: 150000,
          name: "Legacy Invalid",
          sortOrder: 0,
          updatedAt: "2026-04-01T00:00:00.000Z",
        },
      ],
      page: 1,
      pageSize: 10,
      totalCount: 1,
    });
    repositoryMocks.listCurrentSubscriptionsByPackageIds.mockResolvedValue([]);

    await expect(getPackageTablePage({ page: 1, pageSize: 10 })).resolves.toEqual({
      items: [],
      page: 1,
      pageSize: 10,
      totalCount: 0,
    });
  });

  it("maps checkout pricing and lifecycle fields for current packages", async () => {
    repositoryMocks.listPackages.mockResolvedValue({
      items: [
        {
          accessKeys: ["tradingview:private"],
          amountRp: 100000,
          checkoutGroup: "full-private",
          checkoutUrl: null,
          code: "checkout_full_15",
          createdAt: "2026-04-01T00:00:00.000Z",
          durationDays: 15,
          id: "pkg-current",
          isActive: true,
          isExtended: true,
          listAmountRp: 125000,
          name: "Full Private 15 days",
          sortOrder: 10,
          updatedAt: "2026-04-01T00:00:00.000Z",
        },
      ],
      page: 1,
      pageSize: 10,
      totalCount: 1,
    });
    repositoryMocks.listCurrentSubscriptionsByPackageIds.mockResolvedValue([{ package_id: "pkg-current" }]);

    await expect(getPackageTablePage({ page: 1, pageSize: 10 })).resolves.toEqual({
      items: [
        expect.objectContaining({
          checkoutGroup: "full-private",
          lifecycle: "current",
          listAmountRp: 125000,
          packageDiscountAmountRp: 25000,
          packageDiscountPercent: 20,
          sortOrder: 10,
          totalUsed: 1,
        }),
      ],
      page: 1,
      pageSize: 10,
      totalCount: 1,
    });
  });
});
