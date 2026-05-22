import "server-only";

import {
  checkoutVoucherValidationSchema,
  createVoucherSchema,
  updateVoucherSchema,
  voucherListFilterSchema,
  voucherToggleSchema,
  voucherUsageConsumeSchema,
} from "./schemas";
import {
  consumeDiscountVoucherUsage,
  createDiscountVoucherRow,
  getDiscountVoucherByCode,
  getDiscountVoucherById,
  listDiscountVoucherRows,
  toggleDiscountVoucherActiveRow,
  updateDiscountVoucherRow,
} from "./repositories";
import { getPackageById } from "@/modules/packages/repositories";
import { isArchivedPackage } from "@/modules/packages/types";

import type {
  CreateVoucherInput,
  DiscountVoucherRow,
  UpdateVoucherInput,
  VoucherListFilters,
  VoucherListResult,
  VoucherOperationalStatus,
  VoucherToggleInput,
  VoucherValidationErrorCode,
  VoucherValidationResult,
} from "./types";

const voucherValidationMessageByCode: Record<VoucherValidationErrorCode, string> = {
  "voucher-expired": "Voucher sudah kedaluwarsa.",
  "voucher-inactive": "Voucher sedang tidak aktif.",
  "voucher-not-found": "Kode voucher tidak ditemukan.",
  "voucher-package-mismatch": "Voucher tidak berlaku untuk package yang dipilih.",
  "voucher-usage-limit-reached": "Kuota penggunaan voucher sudah habis.",
};

function buildVoucherError(errorCode: VoucherValidationErrorCode): VoucherValidationResult {
  return {
    errorCode,
    message: voucherValidationMessageByCode[errorCode],
    ok: false,
  };
}

function isVoucherExpired(voucher: DiscountVoucherRow, now: Date) {
  if (!voucher.expiresAt) {
    return false;
  }

  return new Date(voucher.expiresAt).getTime() <= now.getTime();
}

function hasVoucherUsageCapacity(voucher: DiscountVoucherRow) {
  return voucher.maxUses === null || voucher.usedCount < voucher.maxUses;
}

export function getVoucherOperationalStatus(
  voucher: DiscountVoucherRow,
  now: Date = new Date(),
): VoucherOperationalStatus {
  if (!voucher.isActive) {
    return "inactive";
  }

  if (isVoucherExpired(voucher, now)) {
    return "expired";
  }

  if (!hasVoucherUsageCapacity(voucher)) {
    return "exhausted";
  }

  return "active";
}

export async function getVoucherById(voucherId: string) {
  return getDiscountVoucherById(voucherId);
}

async function assertVoucherPackageTarget(packageId: string | null) {
  if (!packageId) {
    return;
  }

  const packageRow = await getPackageById(packageId);

  if (!packageRow || isArchivedPackage(packageRow.checkoutGroup)) {
    throw new Error("Package target voucher tidak valid.");
  }
}

function mapVoucherMutationError(error: unknown) {
  if (error && typeof error === "object" && "code" in error && error.code === "23505") {
    return "Kode voucher sudah dipakai. Gunakan kode lain.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Operasi voucher gagal diproses.";
}

export async function listVouchers(
  input: VoucherListFilters,
  now: Date = new Date(),
): Promise<VoucherListResult<DiscountVoucherRow>> {
  const parsedInput = voucherListFilterSchema.parse(input);
  const startIndex = (parsedInput.page - 1) * parsedInput.pageSize;
  const voucherRows = await listDiscountVoucherRows({
    scopeType: parsedInput.scopeType,
    search: parsedInput.search,
  });
  const filteredRows = voucherRows.filter((voucherRow) => {
    if (parsedInput.status === "all") {
      return true;
    }

    return getVoucherOperationalStatus(voucherRow, now) === parsedInput.status;
  });

  return {
    items: filteredRows.slice(startIndex, startIndex + parsedInput.pageSize),
    page: parsedInput.page,
    pageSize: parsedInput.pageSize,
    totalCount: filteredRows.length,
  };
}

export async function createVoucher(input: CreateVoucherInput): Promise<DiscountVoucherRow> {
  const parsedInput = createVoucherSchema.parse(input);
  await assertVoucherPackageTarget(parsedInput.scopeType === "package" ? parsedInput.packageId : null);

  try {
    return await createDiscountVoucherRow({
      ...parsedInput,
      packageId: parsedInput.scopeType === "package" ? parsedInput.packageId : null,
    });
  } catch (error) {
    throw new Error(mapVoucherMutationError(error));
  }
}

export async function updateVoucher(input: UpdateVoucherInput): Promise<DiscountVoucherRow> {
  const parsedInput = updateVoucherSchema.parse(input);
  await assertVoucherPackageTarget(parsedInput.scopeType === "package" ? parsedInput.packageId : null);

  try {
    return await updateDiscountVoucherRow({
      ...parsedInput,
      packageId: parsedInput.scopeType === "package" ? parsedInput.packageId : null,
    });
  } catch (error) {
    throw new Error(mapVoucherMutationError(error));
  }
}

export async function toggleVoucherActive(input: VoucherToggleInput): Promise<DiscountVoucherRow> {
  const parsedInput = voucherToggleSchema.parse(input);
  return toggleDiscountVoucherActiveRow(parsedInput);
}

function calculateVoucherDiscountAmount(baseAmountRp: number, discountPercent: number) {
  return Math.round((baseAmountRp * discountPercent) / 100);
}

export async function validateVoucherForPackage(
  input: { baseAmountRp: number; code: string; packageId: string },
  now: Date = new Date(),
): Promise<VoucherValidationResult> {
  const parsedInput = checkoutVoucherValidationSchema.parse(input);
  const voucher = await getDiscountVoucherByCode(parsedInput.code);

  if (!voucher) {
    return buildVoucherError("voucher-not-found");
  }

  if (!voucher.isActive) {
    return buildVoucherError("voucher-inactive");
  }

  if (isVoucherExpired(voucher, now)) {
    return buildVoucherError("voucher-expired");
  }

  if (voucher.scopeType === "package" && voucher.packageId !== parsedInput.packageId) {
    return buildVoucherError("voucher-package-mismatch");
  }

  if (!hasVoucherUsageCapacity(voucher)) {
    return buildVoucherError("voucher-usage-limit-reached");
  }

  return {
    discountAmountRp: calculateVoucherDiscountAmount(parsedInput.baseAmountRp, voucher.discountPercent),
    ok: true,
    voucher,
  };
}

export async function consumeVoucherUsage(voucherId: string): Promise<void> {
  const parsedInput = voucherUsageConsumeSchema.parse({ voucherId });
  const isConsumed = await consumeDiscountVoucherUsage(parsedInput.voucherId);

  if (!isConsumed) {
    throw new Error(voucherValidationMessageByCode["voucher-usage-limit-reached"]);
  }
}
