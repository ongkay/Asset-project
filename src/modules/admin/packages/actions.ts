"use server";

import { z } from "zod";

import { adminActionClient } from "@/modules/auth/action-client";
import { packageTableFilterSchema } from "@/modules/packages/schemas";

import { getPackageEditorData, getPackageTablePage } from "./queries";

const packageEditorDataInputSchema = z.object({
  id: z.uuid("Package ID must be a valid UUID."),
});

function getActionErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Failed to load package editor data.";
}

export const getPackageEditorDataAction = adminActionClient
  .metadata({ actionName: "admin.packages.get-editor-data" })
  .inputSchema(packageEditorDataInputSchema)
  .action(async ({ parsedInput }) => {
    try {
      const prefill = await getPackageEditorData(parsedInput.id);

      if (!prefill) {
        return {
          message: "Package not found.",
          ok: false as const,
        };
      }

      return {
        ok: true as const,
        prefill,
      };
    } catch (error) {
      return {
        message: getActionErrorMessage(error),
        ok: false as const,
      };
    }
  });

export const getPackageTablePageAction = adminActionClient
  .metadata({ actionName: "admin.packages.get-table-page" })
  .inputSchema(packageTableFilterSchema)
  .action(async ({ parsedInput }) => {
    try {
      const tablePage = await getPackageTablePage(parsedInput);

      return {
        ok: true as const,
        tablePage,
      };
    } catch (error) {
      return {
        message: error instanceof Error ? error.message : "Failed to load package table.",
        ok: false as const,
      };
    }
  });
