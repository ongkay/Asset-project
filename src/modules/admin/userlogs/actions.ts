"use server";

import { adminActionClient } from "@/modules/auth/action-client";

import {
  getAdminExtensionTrackPage,
  getAdminLoginHistoryPage,
  getAdminTransactionDetail,
  getAdminTransactionsPage,
} from "./queries";
import {
  adminExtensionTrackFilterSchema,
  adminLoginHistoryFilterSchema,
  adminTransactionDetailInputSchema,
  adminTransactionsFilterSchema,
} from "./schemas";

export const getAdminLoginHistoryPageAction = adminActionClient
  .metadata({ actionName: "admin.userlogs.get-login-history-page" })
  .inputSchema(adminLoginHistoryFilterSchema)
  .action(async ({ parsedInput }) => {
    try {
      const page = await getAdminLoginHistoryPage(parsedInput);

      return {
        ok: true as const,
        page,
      };
    } catch (error) {
      return {
        ok: false as const,
        message: error instanceof Error ? error.message : "Failed to load login history.",
      };
    }
  });

export const getAdminExtensionTrackPageAction = adminActionClient
  .metadata({ actionName: "admin.userlogs.get-extension-track-page" })
  .inputSchema(adminExtensionTrackFilterSchema)
  .action(async ({ parsedInput }) => {
    try {
      const page = await getAdminExtensionTrackPage(parsedInput);

      return {
        ok: true as const,
        page,
      };
    } catch (error) {
      return {
        ok: false as const,
        message: error instanceof Error ? error.message : "Failed to load extension track.",
      };
    }
  });

export const getAdminTransactionsPageAction = adminActionClient
  .metadata({ actionName: "admin.userlogs.get-transactions-page" })
  .inputSchema(adminTransactionsFilterSchema)
  .action(async ({ parsedInput }) => {
    try {
      const page = await getAdminTransactionsPage(parsedInput);

      return {
        ok: true as const,
        page,
      };
    } catch (error) {
      return {
        ok: false as const,
        message: error instanceof Error ? error.message : "Failed to load transactions.",
      };
    }
  });

export const getAdminTransactionDetailAction = adminActionClient
  .metadata({ actionName: "admin.userlogs.get-transaction-detail" })
  .inputSchema(adminTransactionDetailInputSchema)
  .action(async ({ parsedInput }) => {
    try {
      const detail = await getAdminTransactionDetail(parsedInput);

      return {
        ok: true as const,
        detail,
      };
    } catch (error) {
      return {
        ok: false as const,
        message: error instanceof Error ? error.message : "Failed to load transaction detail.",
      };
    }
  });
