import { beforeEach, describe, expect, it, vi } from "vitest";

const packageRepositoryMocks = vi.hoisted(() => ({
  listPackageRowsByIds: vi.fn(),
  listPackages: vi.fn(),
}));

const voucherServiceMocks = vi.hoisted(() => ({
  getVoucherOperationalStatus: vi.fn(() => "active"),
  listVouchers: vi.fn(),
}));

vi.mock("@/modules/packages/repositories", () => packageRepositoryMocks);
vi.mock("@/modules/vouchers/services", () => voucherServiceMocks);

import { getVoucherTablePage } from "@/modules/admin/vouchers/queries";

describe("admin/vouchers/queries", () => {
  beforeEach(() => {
    packageRepositoryMocks.listPackageRowsByIds.mockReset();
    packageRepositoryMocks.listPackages.mockReset();
    voucherServiceMocks.getVoucherOperationalStatus.mockClear();
    voucherServiceMocks.listVouchers.mockReset();
  });

  it("builds voucher rows with package names, remaining uses, and package options", async () => {
    voucherServiceMocks.listVouchers.mockResolvedValueOnce({
      items: [
        {
          code: "VIP15",
          createdAt: "2026-05-21T00:00:00.000Z",
          createdBy: "11111111-1111-4111-8111-111111111111",
          discountPercent: 15,
          expiresAt: null,
          id: "voucher-1",
          isActive: true,
          maxUses: 10,
          packageId: "pkg-1",
          scopeType: "package",
          updatedAt: "2026-05-21T00:00:00.000Z",
          usedCount: 4,
        },
      ],
      page: 1,
      pageSize: 10,
      totalCount: 1,
    });
    packageRepositoryMocks.listPackages.mockResolvedValueOnce({
      items: [
        {
          accessKeys: ["tradingview:private"],
          amountRp: 100000,
          checkoutGroup: "full-private",
          checkoutUrl: null,
          code: "checkout_full_15",
          createdAt: "2026-05-21T00:00:00.000Z",
          durationDays: 15,
          id: "pkg-1",
          isActive: true,
          isExtended: true,
          listAmountRp: 125000,
          name: "Full Private 15 days",
          sortOrder: 10,
          updatedAt: "2026-05-21T00:00:00.000Z",
        },
      ],
      page: 1,
      pageSize: 100,
      totalCount: 1,
    });
    packageRepositoryMocks.listPackageRowsByIds.mockResolvedValueOnce([
      {
        accessKeys: ["tradingview:private"],
        amountRp: 100000,
        checkoutGroup: "full-private",
        checkoutUrl: null,
        code: "checkout_full_15",
        createdAt: "2026-05-21T00:00:00.000Z",
        durationDays: 15,
        id: "pkg-1",
        isActive: true,
        isExtended: true,
        listAmountRp: 125000,
        name: "Full Private 15 days",
        sortOrder: 10,
        updatedAt: "2026-05-21T00:00:00.000Z",
      },
    ]);

    await expect(
      getVoucherTablePage({ page: 1, pageSize: 10, search: null, scopeType: null, status: "all" }),
    ).resolves.toEqual({
      items: [
        expect.objectContaining({
          packageName: "Full Private 15 days",
          remainingUses: 6,
          status: "active",
        }),
      ],
      packageOptions: [
        {
          checkoutGroup: "full-private",
          isActive: true,
          name: "Full Private 15 days",
          packageId: "pkg-1",
        },
      ],
      page: 1,
      pageSize: 10,
      totalCount: 1,
    });
  });
});
