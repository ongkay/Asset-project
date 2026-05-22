import type { VoucherAdminRow, VoucherTableFilters, VoucherTablePage } from "@/modules/admin/vouchers/types";

export const VOUCHER_TABLE_COLUMN_KEYS = [
  "code",
  "discountPercent",
  "scope",
  "package",
  "usage",
  "expiresAt",
  "status",
  "updatedAt",
  "actions",
] as const;

export type AdminVoucherTableColumnKey = (typeof VOUCHER_TABLE_COLUMN_KEYS)[number];

export type AdminVoucherColumnVisibility = Record<AdminVoucherTableColumnKey, boolean>;

export type VoucherFormDialogState =
  | {
      mode: "create";
      open: true;
    }
  | {
      mode: "edit";
      open: true;
      row: VoucherAdminRow;
    }
  | {
      mode: null;
      open: false;
      row: null;
    };

export type AdminVoucherPageProps = {
  filters: VoucherTableFilters;
  tableError: string | null;
  tablePage: VoucherTablePage;
};
