import { beforeEach, describe, expect, it, vi } from "vitest";

const voucherRepositoryMocks = vi.hoisted(() => ({
  consumeDiscountVoucherUsage: vi.fn(),
  createDiscountVoucherRow: vi.fn(),
  getDiscountVoucherByCode: vi.fn(),
  getDiscountVoucherById: vi.fn(),
  listDiscountVoucherRows: vi.fn(),
  toggleDiscountVoucherActiveRow: vi.fn(),
  updateDiscountVoucherRow: vi.fn(),
}));

const packageRepositoryMocks = vi.hoisted(() => ({
  getPackageById: vi.fn(),
}));

vi.mock("@/modules/vouchers/repositories", () => voucherRepositoryMocks);
vi.mock("@/modules/packages/repositories", () => packageRepositoryMocks);

import * as voucherRepositories from "@/modules/vouchers/repositories";
import {
  consumeVoucherUsage,
  createVoucher,
  listVouchers,
  updateVoucher,
  validateVoucherForPackage,
} from "@/modules/vouchers/services";

const mockedConsumeDiscountVoucherUsage = vi.mocked(voucherRepositories.consumeDiscountVoucherUsage);
const mockedCreateDiscountVoucherRow = vi.mocked(voucherRepositories.createDiscountVoucherRow);
const mockedGetDiscountVoucherByCode = vi.mocked(voucherRepositories.getDiscountVoucherByCode);
const mockedListDiscountVoucherRows = vi.mocked(voucherRepositories.listDiscountVoucherRows);
const mockedUpdateDiscountVoucherRow = vi.mocked(voucherRepositories.updateDiscountVoucherRow);

function createVoucherRow(
  overrides: Partial<Awaited<ReturnType<typeof voucherRepositories.getDiscountVoucherByCode>>> = {},
) {
  return {
    code: "VIP15",
    createdAt: "2026-05-21T00:00:00.000Z",
    createdBy: "11111111-1111-4111-8111-111111111111",
    discountPercent: 15,
    expiresAt: null,
    id: "22222222-2222-4222-8222-222222222222",
    isActive: true,
    maxUses: null,
    packageId: null,
    scopeType: "global" as const,
    updatedAt: "2026-05-21T00:00:00.000Z",
    usedCount: 0,
    ...overrides,
  };
}

describe("vouchers/services", () => {
  beforeEach(() => {
    mockedConsumeDiscountVoucherUsage.mockReset();
    mockedCreateDiscountVoucherRow.mockReset();
    mockedGetDiscountVoucherByCode.mockReset();
    mockedListDiscountVoucherRows.mockReset();
    mockedUpdateDiscountVoucherRow.mockReset();
    packageRepositoryMocks.getPackageById.mockReset();
  });

  it("returns voucher-not-found when the code does not exist", async () => {
    mockedGetDiscountVoucherByCode.mockResolvedValueOnce(null);

    await expect(
      validateVoucherForPackage({
        baseAmountRp: 100000,
        code: "VIP15",
        packageId: "11111111-1111-4111-8111-111111111111",
      }),
    ).resolves.toEqual({
      errorCode: "voucher-not-found",
      message: "Kode voucher tidak ditemukan.",
      ok: false,
    });
  });

  it("returns voucher-package-mismatch for package scoped vouchers on the wrong package", async () => {
    mockedGetDiscountVoucherByCode.mockResolvedValueOnce(
      createVoucherRow({
        packageId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        scopeType: "package",
      }),
    );

    await expect(
      validateVoucherForPackage({
        baseAmountRp: 100000,
        code: "VIP15",
        packageId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      }),
    ).resolves.toEqual({
      errorCode: "voucher-package-mismatch",
      message: "Voucher tidak berlaku untuk package yang dipilih.",
      ok: false,
    });
  });

  it("returns voucher-usage-limit-reached when max uses is exhausted", async () => {
    mockedGetDiscountVoucherByCode.mockResolvedValueOnce(
      createVoucherRow({
        maxUses: 3,
        usedCount: 3,
      }),
    );

    await expect(
      validateVoucherForPackage({
        baseAmountRp: 100000,
        code: "VIP15",
        packageId: "11111111-1111-4111-8111-111111111111",
      }),
    ).resolves.toEqual({
      errorCode: "voucher-usage-limit-reached",
      message: "Kuota penggunaan voucher sudah habis.",
      ok: false,
    });
  });

  it("calculates rounded discount amounts for valid vouchers", async () => {
    mockedGetDiscountVoucherByCode.mockResolvedValueOnce(createVoucherRow({ discountPercent: 15 }));

    await expect(
      validateVoucherForPackage({
        baseAmountRp: 336000,
        code: "VIP15",
        packageId: "11111111-1111-4111-8111-111111111111",
      }),
    ).resolves.toMatchObject({
      discountAmountRp: 50400,
      ok: true,
    });
  });

  it("creates a package-scoped voucher with an uppercase code", async () => {
    packageRepositoryMocks.getPackageById.mockResolvedValueOnce({
      accessKeys: ["tradingview:share"],
      amountRp: 76000,
      checkoutGroup: "semi-private",
      checkoutUrl: null,
      code: "checkout_semi_30",
      createdAt: "2026-05-21T00:00:00.000Z",
      durationDays: 30,
      id: "33333333-3333-4333-8333-333333333333",
      isActive: true,
      isExtended: true,
      listAmountRp: 80000,
      name: "Semi Private 30 days",
      sortOrder: 10,
      updatedAt: "2026-05-21T00:00:00.000Z",
    });
    mockedCreateDiscountVoucherRow.mockResolvedValueOnce(
      createVoucherRow({
        code: "SEMI20",
        packageId: "33333333-3333-4333-8333-333333333333",
        scopeType: "package",
      }),
    );

    await expect(
      createVoucher({
        code: "semi20",
        createdBy: "11111111-1111-4111-8111-111111111111",
        discountPercent: 20,
        expiresAt: null,
        isActive: true,
        maxUses: null,
        packageId: "33333333-3333-4333-8333-333333333333",
        scopeType: "package",
      }),
    ).resolves.toMatchObject({
      code: "SEMI20",
      scopeType: "package",
    });

    expect(mockedCreateDiscountVoucherRow).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "SEMI20",
      }),
    );
  });

  it("rejects voucher creation when the package target is archived", async () => {
    packageRepositoryMocks.getPackageById.mockResolvedValueOnce({
      accessKeys: ["tradingview:share"],
      amountRp: 76000,
      checkoutGroup: "legacy",
      checkoutUrl: null,
      code: "legacy",
      createdAt: "2026-05-21T00:00:00.000Z",
      durationDays: 30,
      id: "33333333-3333-4333-8333-333333333333",
      isActive: false,
      isExtended: true,
      listAmountRp: 80000,
      name: "Legacy Package",
      sortOrder: 0,
      updatedAt: "2026-05-21T00:00:00.000Z",
    });

    await expect(
      createVoucher({
        code: "legacy15",
        createdBy: "11111111-1111-4111-8111-111111111111",
        discountPercent: 15,
        expiresAt: null,
        isActive: true,
        maxUses: null,
        packageId: "33333333-3333-4333-8333-333333333333",
        scopeType: "package",
      }),
    ).rejects.toThrow("Package target voucher tidak valid.");
  });

  it("allows expired vouchers to be updated", async () => {
    packageRepositoryMocks.getPackageById.mockResolvedValueOnce({
      accessKeys: ["tradingview:private"],
      amountRp: 100000,
      checkoutGroup: "full-private",
      checkoutUrl: null,
      code: "checkout_full_15",
      createdAt: "2026-05-21T00:00:00.000Z",
      durationDays: 15,
      id: "44444444-4444-4444-8444-444444444444",
      isActive: true,
      isExtended: true,
      listAmountRp: 125000,
      name: "Full Private 15 days",
      sortOrder: 10,
      updatedAt: "2026-05-21T00:00:00.000Z",
    });
    mockedUpdateDiscountVoucherRow.mockResolvedValueOnce(
      createVoucherRow({
        code: "RENEW15",
        expiresAt: "2026-05-20T00:00:00.000Z",
      }),
    );

    await expect(
      updateVoucher({
        code: "renew15",
        discountPercent: 15,
        expiresAt: "2026-05-20T10:00",
        id: "22222222-2222-4222-8222-222222222222",
        isActive: true,
        maxUses: null,
        packageId: null,
        scopeType: "global",
      }),
    ).resolves.toMatchObject({
      code: "RENEW15",
    });
  });

  it("filters voucher lists by operational status", async () => {
    mockedListDiscountVoucherRows.mockResolvedValueOnce([
      createVoucherRow({ code: "ACTIVE15" }),
      createVoucherRow({ code: "EXP15", expiresAt: "2026-05-20T00:00:00.000Z" }),
      createVoucherRow({ code: "LIMIT15", maxUses: 1, usedCount: 1 }),
    ]);

    await expect(
      listVouchers(
        {
          page: 1,
          pageSize: 10,
          scopeType: null,
          search: null,
          status: "expired",
        },
        new Date("2026-05-21T00:00:00.000Z"),
      ),
    ).resolves.toMatchObject({
      items: [expect.objectContaining({ code: "EXP15" })],
      totalCount: 1,
    });
  });

  it("throws when voucher consumption cannot be finalized", async () => {
    mockedConsumeDiscountVoucherUsage.mockResolvedValueOnce(false);

    await expect(consumeVoucherUsage("22222222-2222-4222-8222-222222222222")).rejects.toThrow(
      "Kuota penggunaan voucher sudah habis.",
    );
  });
});
