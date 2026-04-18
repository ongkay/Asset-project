"use server";

import { adminActionClient } from "@/modules/auth/action-client";

import { getCdKeyDetailSnapshot, getCdKeyTablePage, listIssuablePackages } from "./queries";
import { cdKeyDetailInputSchema, cdKeyIssueDialogBootstrapInputSchema, cdKeyTableFilterSchema } from "./schemas";

const CD_KEY_TABLE_LOAD_FAILED_MESSAGE = "Failed to load CD key table.";
const CD_KEY_DETAIL_LOAD_FAILED_MESSAGE = "Failed to load CD key detail.";
const ISSUABLE_PACKAGES_LOAD_FAILED_MESSAGE = "Failed to load issuable packages.";

function logAdminCdKeyActionError(actionName: string, error: unknown) {
  if (error instanceof Error) {
    const structuredError = error as Error & {
      code?: string;
      details?: string;
      hint?: string;
    };

    console.error(`[${actionName}] failed`, {
      message: structuredError.message,
      code: structuredError.code,
      details: structuredError.details,
      hint: structuredError.hint,
    });

    return;
  }

  console.error(`[${actionName}] failed`, {
    message: "Non-Error thrown",
    rawError: error,
  });
}

export const getCdKeyTablePageAction = adminActionClient
  .metadata({ actionName: "admin.cdkeys.get-table-page" })
  .inputSchema(cdKeyTableFilterSchema)
  .action(async ({ parsedInput }) => {
    try {
      const tablePage = await getCdKeyTablePage(parsedInput);

      return {
        ok: true as const,
        tablePage,
      };
    } catch (error) {
      logAdminCdKeyActionError("admin.cdkeys.get-table-page", error);

      return {
        ok: false as const,
        message: CD_KEY_TABLE_LOAD_FAILED_MESSAGE,
      };
    }
  });

export const getCdKeyDetailSnapshotAction = adminActionClient
  .metadata({ actionName: "admin.cdkeys.get-detail" })
  .inputSchema(cdKeyDetailInputSchema)
  .action(async ({ parsedInput }) => {
    try {
      const detail = await getCdKeyDetailSnapshot(parsedInput);

      if (!detail) {
        return {
          ok: false as const,
          message: "CD key not found.",
        };
      }

      return {
        ok: true as const,
        detail,
      };
    } catch (error) {
      logAdminCdKeyActionError("admin.cdkeys.get-detail", error);

      return {
        ok: false as const,
        message: CD_KEY_DETAIL_LOAD_FAILED_MESSAGE,
      };
    }
  });

export const listIssuablePackagesAction = adminActionClient
  .metadata({ actionName: "admin.cdkeys.list-issuable-packages" })
  .inputSchema(cdKeyIssueDialogBootstrapInputSchema)
  .action(async () => {
    try {
      const packages = await listIssuablePackages();

      return {
        ok: true as const,
        packages,
      };
    } catch (error) {
      logAdminCdKeyActionError("admin.cdkeys.list-issuable-packages", error);

      return {
        ok: false as const,
        message: ISSUABLE_PACKAGES_LOAD_FAILED_MESSAGE,
      };
    }
  });
