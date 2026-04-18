import type { ReactNode } from "react";

import type { AdminTableColumnOption } from "@/components/shared/data-table/types";
import type { AdminUserRow } from "@/modules/admin/users/types";
import type { AdminUsersTableColumnKey } from "../users-page-types";

export type AdminUsersRowAction = "view-details" | "edit-user" | "change-password" | "toggle-ban";

export type AdminUsersRowActionHandlers = {
  onChangePassword: (userId: string) => void;
  onEditUser: (userId: string) => void;
  onOpenDetails: (userId: string) => void;
  onToggleBan: (userId: string) => void;
};

export type AdminUsersColumnDefinition = AdminTableColumnOption<AdminUsersTableColumnKey> & {
  key: AdminUsersTableColumnKey;
  label: string;
  renderCell?: (row: AdminUserRow) => ReactNode;
};
