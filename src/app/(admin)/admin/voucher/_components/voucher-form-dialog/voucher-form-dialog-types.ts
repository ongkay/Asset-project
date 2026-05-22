import { z } from "zod";

import { voucherFormSchema } from "@/modules/vouchers/schemas";

import type { VoucherAdminRow } from "@/modules/admin/vouchers/types";

export type VoucherFormDialogValues = z.input<typeof voucherFormSchema>;

function toDateTimeLocalValue(expiresAt: string | null) {
  if (!expiresAt) {
    return "";
  }

  const parsedDate = new Date(expiresAt);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  const localDate = new Date(parsedDate.getTime() - parsedDate.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

export function getDefaultVoucherFormValues(row: VoucherAdminRow | null): VoucherFormDialogValues {
  if (!row) {
    return {
      code: "",
      discountPercent: 10,
      expiresAt: "",
      isActive: true,
      maxUses: null,
      packageId: null,
      scopeType: "global",
    };
  }

  return {
    code: row.code,
    discountPercent: row.discountPercent,
    expiresAt: toDateTimeLocalValue(row.expiresAt),
    isActive: row.isActive,
    maxUses: row.maxUses,
    packageId: row.packageId,
    scopeType: row.scopeType,
  };
}
