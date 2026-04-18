"use server";

import { adminActionClient } from "@/modules/auth/action-client";

import { getAdminUserDetail, getAdminUsersTablePage } from "./queries";
import { adminUserDetailInputSchema, adminUsersTableFilterSchema } from "./schemas";

export const getAdminUsersTablePageAction = adminActionClient
  .metadata({ actionName: "admin.users.get-table-page" })
  .inputSchema(adminUsersTableFilterSchema)
  .action(async ({ parsedInput }) => {
    try {
      const tablePage = await getAdminUsersTablePage(parsedInput);

      return {
        ok: true as const,
        tablePage,
      };
    } catch (error) {
      return {
        ok: false as const,
        message: error instanceof Error ? error.message : "Failed to load users table.",
      };
    }
  });

export const getAdminUserDetailAction = adminActionClient
  .metadata({ actionName: "admin.users.get-detail" })
  .inputSchema(adminUserDetailInputSchema)
  .action(async ({ parsedInput }) => {
    try {
      const detail = await getAdminUserDetail(parsedInput);

      return {
        ok: true as const,
        detail,
      };
    } catch (error) {
      return {
        ok: false as const,
        message: error instanceof Error ? error.message : "Failed to load user detail.",
      };
    }
  });
