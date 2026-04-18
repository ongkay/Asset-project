"use client";

import { AdminTableGroupedFilterMenu } from "@/components/shared/table-filters/filter-menu";

import type { PackageSummary } from "@/modules/packages/types";
import type { SubscriptionStatus } from "@/modules/subscriptions/types";
import type { AdminUsersTableFilters } from "@/modules/admin/users/types";

const ROLE_OPTIONS: { label: string; value: NonNullable<AdminUsersTableFilters["role"]> }[] = [
  { label: "Admin", value: "admin" },
  { label: "Member", value: "member" },
];

const SUBSCRIPTION_STATUS_OPTIONS: { label: string; value: SubscriptionStatus }[] = [
  { label: "Active", value: "active" },
  { label: "Processed", value: "processed" },
  { label: "Expired", value: "expired" },
  { label: "Canceled", value: "canceled" },
];

const PACKAGE_SUMMARY_OPTIONS: { label: string; value: PackageSummary | "none" }[] = [
  { label: "Private", value: "private" },
  { label: "Share", value: "share" },
  { label: "Mixed", value: "mixed" },
  { label: "None", value: "none" },
];

type AdminUsersFilterPopoverProps = {
  packageSummaryValue: PackageSummary | "none" | null;
  roleValue: AdminUsersTableFilters["role"];
  subscriptionStatusValue: SubscriptionStatus | null;
  onPackageSummaryChange: (value: PackageSummary | "none" | null) => void;
  onRoleChange: (value: AdminUsersTableFilters["role"]) => void;
  onSubscriptionStatusChange: (value: SubscriptionStatus | null) => void;
};

function getSingleSelectValue<TValue extends string>(selectedValues: TValue[]) {
  return selectedValues.at(-1) ?? null;
}

export function AdminUsersFilterPopover({
  packageSummaryValue,
  roleValue,
  subscriptionStatusValue,
  onPackageSummaryChange,
  onRoleChange,
  onSubscriptionStatusChange,
}: AdminUsersFilterPopoverProps) {
  return (
    <AdminTableGroupedFilterMenu
      groups={[
        {
          key: "role",
          label: "Role",
          selectedValues: roleValue ? [roleValue] : [],
          options: ROLE_OPTIONS,
          onSelectedValuesChange: (selectedValues) =>
            onRoleChange(getSingleSelectValue(selectedValues as NonNullable<AdminUsersTableFilters["role"]>[])),
        },
        {
          key: "subscription-status",
          label: "Subscription Status",
          selectedValues: subscriptionStatusValue ? [subscriptionStatusValue] : [],
          options: SUBSCRIPTION_STATUS_OPTIONS,
          onSelectedValuesChange: (selectedValues) =>
            onSubscriptionStatusChange(getSingleSelectValue(selectedValues as SubscriptionStatus[])),
        },
        {
          key: "package-summary",
          label: "Package Summary",
          selectedValues: packageSummaryValue ? [packageSummaryValue] : [],
          options: PACKAGE_SUMMARY_OPTIONS,
          onSelectedValuesChange: (selectedValues) =>
            onPackageSummaryChange(getSingleSelectValue(selectedValues as (PackageSummary | "none")[])),
        },
      ]}
      onClearFilters={() => {
        onRoleChange(null);
        onSubscriptionStatusChange(null);
        onPackageSummaryChange(null);
      }}
    />
  );
}
