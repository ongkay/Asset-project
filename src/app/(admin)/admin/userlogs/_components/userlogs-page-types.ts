import type { AdminColumnVisibility } from "@/components/shared/data-table/types";
import type {
  AdminExtensionTrackPage,
  AdminLoginHistoryPage,
  AdminTransactionsPage,
  AdminUserLogsRouteState,
} from "@/modules/admin/userlogs/types";

export const ADMIN_USERLOGS_LOGIN_COLUMN_KEYS = ["user", "ipAddress", "browser", "os", "loginTime", "status"] as const;

export const ADMIN_USERLOGS_EXTENSION_COLUMN_KEYS = [
  "user",
  "ipAddress",
  "city",
  "country",
  "browser",
  "os",
  "extensionVersion",
  "deviceId",
  "extensionId",
  "firstSeenAt",
  "lastSeenAt",
] as const;

export const ADMIN_USERLOGS_TRANSACTIONS_COLUMN_KEYS = [
  "user",
  "packageName",
  "source",
  "amountRp",
  "status",
  "createdAt",
  "updatedAt",
  "actions",
] as const;

export type AdminUserLogsLoginColumnKey = (typeof ADMIN_USERLOGS_LOGIN_COLUMN_KEYS)[number];
export type AdminUserLogsExtensionColumnKey = (typeof ADMIN_USERLOGS_EXTENSION_COLUMN_KEYS)[number];
export type AdminUserLogsTransactionsColumnKey = (typeof ADMIN_USERLOGS_TRANSACTIONS_COLUMN_KEYS)[number];

export type AdminUserLogsLoginColumnVisibility = AdminColumnVisibility<AdminUserLogsLoginColumnKey>;
export type AdminUserLogsExtensionColumnVisibility = AdminColumnVisibility<AdminUserLogsExtensionColumnKey>;
export type AdminUserLogsTransactionsColumnVisibility = AdminColumnVisibility<AdminUserLogsTransactionsColumnKey>;

export type AdminUserLogsPageProps = {
  initialActiveTabError: string | null;
  initialExtensionTrackPage: AdminExtensionTrackPage | null;
  initialLoginHistoryPage: AdminLoginHistoryPage | null;
  initialTransactionsPage: AdminTransactionsPage | null;
  routeState: AdminUserLogsRouteState;
};
