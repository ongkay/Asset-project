import type { AdminTableDateRangeValue } from "@/components/shared/table-filters/date-range-filter";
import type {
  SubscriberAdminRow,
  SubscriberTableFilters,
  SubscriberTableResult,
} from "@/modules/admin/subscriptions/types";
import type { AssetType } from "@/modules/assets/types";
import type { SubscriptionStatus } from "@/modules/subscriptions/types";

export const SUBSCRIBER_TABLE_COLUMN_KEYS = [
  "user",
  "subscriptionStatus",
  "startAt",
  "expiresAt",
  "totalSpentRp",
  "packageName",
  "actions",
] as const;

export type AdminSubscriberTableColumnKey = (typeof SUBSCRIBER_TABLE_COLUMN_KEYS)[number];

export type AdminSubscriberColumnVisibility = Record<AdminSubscriberTableColumnKey, boolean>;

export type SubscriberDialogState =
  | { mode: "create"; open: true }
  | { mode: "edit"; open: true; row: SubscriberAdminRow }
  | { mode: null; open: false };

export type SubscriberCancelDialogState = { open: true; row: SubscriberAdminRow } | { open: false; row: null };

export type AdminSubscriberPageProps = {
  filters: SubscriberTableFilters;
  tablePage: SubscriberTableResult;
  tableError: string | null;
};

export type AdminSubscriberFilterState = {
  search: string;
  assetType: AssetType | null;
  status: SubscriptionStatus | null;
  expiresRange: AdminTableDateRangeValue;
};
