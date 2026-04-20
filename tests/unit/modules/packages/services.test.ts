import { beforeEach, describe, expect, it, vi } from "vitest";

import { getMemberPurchasablePackageById, listMemberPurchasablePackages } from "@/modules/packages/services";

const repositoryMocks = vi.hoisted(() => ({
  getActivePackageRowByIdForMember: vi.fn(),
  listActivePackageRowsForMember: vi.fn(),
}));

vi.mock("@/modules/packages/repositories", async () => {
  const actual = await vi.importActual<typeof import("@/modules/packages/repositories")>(
    "@/modules/packages/repositories",
  );

  return {
    ...actual,
    getActivePackageRowByIdForMember: repositoryMocks.getActivePackageRowByIdForMember,
    listActivePackageRowsForMember: repositoryMocks.listActivePackageRowsForMember,
  };
});

describe("member purchasable package helpers", () => {
  beforeEach(() => {
    repositoryMocks.getActivePackageRowByIdForMember.mockReset();
    repositoryMocks.listActivePackageRowsForMember.mockReset();
  });

  it("filters disabled packages and keeps a non-null summary", async () => {
    repositoryMocks.listActivePackageRowsForMember.mockResolvedValue([
      {
        accessKeys: ["tradingview:private"],
        amountRp: 150000,
        checkoutUrl: null,
        code: "PKG-1",
        createdAt: "2026-04-01T00:00:00.000Z",
        durationDays: 30,
        id: "pkg-1",
        isActive: true,
        isExtended: true,
        name: "Paket 1",
        updatedAt: "2026-04-01T00:00:00.000Z",
      },
      {
        accessKeys: ["tradingview:share"],
        amountRp: 250000,
        checkoutUrl: null,
        code: "PKG-2",
        createdAt: "2026-04-01T00:00:00.000Z",
        durationDays: 60,
        id: "pkg-2",
        isActive: false,
        isExtended: false,
        name: "Paket 2",
        updatedAt: "2026-04-01T00:00:00.000Z",
      },
    ]);

    await expect(listMemberPurchasablePackages()).resolves.toEqual([
      {
        accessKeys: ["tradingview:private"],
        amountRp: 150000,
        durationDays: 30,
        id: "pkg-1",
        isExtended: true,
        name: "Paket 1",
        packageId: "pkg-1",
        summary: "private",
      },
    ]);
  });

  it("returns null when the selected package is missing or disabled", async () => {
    repositoryMocks.getActivePackageRowByIdForMember.mockResolvedValueOnce(null);

    await expect(getMemberPurchasablePackageById("missing-pkg")).resolves.toBeNull();
  });

  it("skips member packages whose legacy access keys no longer derive a summary", async () => {
    repositoryMocks.listActivePackageRowsForMember.mockResolvedValueOnce([
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
    ]);

    await expect(listMemberPurchasablePackages()).resolves.toEqual([]);
  });

  it("returns null for a selected member package when legacy access keys are invalid", async () => {
    repositoryMocks.getActivePackageRowByIdForMember.mockResolvedValueOnce({
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
    });

    await expect(getMemberPurchasablePackageById("pkg-invalid")).resolves.toBeNull();
  });
});
