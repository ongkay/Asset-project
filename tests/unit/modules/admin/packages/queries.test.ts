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
          checkoutUrl: null,
          code: "PKG-INVALID",
          createdAt: "2026-04-01T00:00:00.000Z",
          durationDays: 30,
          id: "pkg-invalid",
          isActive: true,
          isExtended: true,
          name: "Legacy Invalid",
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
});
