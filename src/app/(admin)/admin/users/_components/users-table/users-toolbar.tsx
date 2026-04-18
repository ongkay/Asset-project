"use client";

import { PlusIcon } from "lucide-react";

import { AdminDataTableToolbar } from "@/components/shared/data-table/toolbar";
import { AdminDataTableViewOptions } from "@/components/shared/data-table/view-options";
import { AdminTableSearchInput } from "@/components/shared/table-filters/search-input";
import { Button } from "@/components/ui/button";

import { ADMIN_USERS_TABLE_COLUMNS } from "./users-columns";
import { AdminUsersFilterPopover } from "./users-filter-popover";

import type { PackageSummary } from "@/modules/packages/types";
import type { SubscriptionStatus } from "@/modules/subscriptions/types";
import type { AdminUsersTableFilters } from "@/modules/admin/users/types";
import type { AdminUsersColumnVisibility } from "../users-page-types";

type AdminUsersToolbarProps = {
  packageSummaryValue: PackageSummary | "none" | null;
  roleValue: AdminUsersTableFilters["role"];
  searchValue: string;
  subscriptionStatusValue: SubscriptionStatus | null;
  visibleColumns: AdminUsersColumnVisibility;
  onCreateUser: () => void;
  onPackageSummaryChange: (value: PackageSummary | "none" | null) => void;
  onRoleChange: (value: AdminUsersTableFilters["role"]) => void;
  onSearchChange: (value: string) => void;
  onSubscriptionStatusChange: (value: SubscriptionStatus | null) => void;
  onToggleColumn: (columnKey: keyof AdminUsersColumnVisibility, nextVisible: boolean) => void;
};

export function AdminUsersToolbar({
  packageSummaryValue,
  roleValue,
  searchValue,
  subscriptionStatusValue,
  visibleColumns,
  onCreateUser,
  onPackageSummaryChange,
  onRoleChange,
  onSearchChange,
  onSubscriptionStatusChange,
  onToggleColumn,
}: AdminUsersToolbarProps) {
  return (
    <AdminDataTableToolbar
      filters={
        <div className="grid w-full gap-3 sm:grid-cols-[minmax(24rem,1fr)_auto] sm:items-center @3xl/main:max-w-5xl">
          <AdminTableSearchInput
            ariaLabel="Search users"
            className="w-full sm:min-w-[24rem]"
            placeholder="Search users..."
            value={searchValue}
            onChange={onSearchChange}
          />
          <AdminUsersFilterPopover
            packageSummaryValue={packageSummaryValue}
            roleValue={roleValue}
            subscriptionStatusValue={subscriptionStatusValue}
            onPackageSummaryChange={onPackageSummaryChange}
            onRoleChange={onRoleChange}
            onSubscriptionStatusChange={onSubscriptionStatusChange}
          />
        </div>
      }
      viewOptions={
        <AdminDataTableViewOptions
          columns={ADMIN_USERS_TABLE_COLUMNS}
          visibleColumns={visibleColumns}
          onToggleColumn={onToggleColumn}
        />
      }
      primaryAction={
        <Button className="flex-1 @3xl/main:flex-none" onClick={onCreateUser} size="sm" type="button">
          <PlusIcon data-icon="inline-start" />
          Create User
        </Button>
      }
    />
  );
}
