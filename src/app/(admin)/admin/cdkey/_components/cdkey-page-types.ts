import type {
  CdKeyAdminRow,
  CdKeyDetailSnapshot,
  CdKeyTableFilters,
  CdKeyTableResult,
} from "@/modules/admin/cdkeys/types";

export const CDKEY_TABLE_COLUMN_KEYS = [
  "code",
  "package",
  "status",
  "usedBy",
  "createdBy",
  "createdAt",
  "updatedAt",
  "actions",
] as const;

export type AdminCdKeyTableColumnKey = (typeof CDKEY_TABLE_COLUMN_KEYS)[number];

export type AdminCdKeyColumnVisibility = Record<AdminCdKeyTableColumnKey, boolean>;

export type AdminCdKeyPageProps = {
  filters: CdKeyTableFilters;
  tableError: string | null;
  tablePage: CdKeyTableResult;
};

export type CdKeyFormDialogState =
  | {
      open: true;
    }
  | {
      open: false;
    };

export type CdKeyDetailDialogState =
  | {
      open: true;
      row: CdKeyAdminRow;
    }
  | {
      open: false;
      row: null;
    };

export type CdKeyDetailDialogPayload = {
  row: CdKeyAdminRow;
  detail: CdKeyDetailSnapshot | null;
};

export type AdminCdKeyDetailDialogPayload = CdKeyDetailDialogPayload;
