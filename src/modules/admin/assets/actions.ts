"use server";

import { z } from "zod";

import { adminActionClient } from "@/modules/auth/action-client";

import { getAssetEditorData, getAssetTablePage } from "./queries";
import { assetTableFilterSchema } from "./schemas";

const assetEditorDataInputSchema = z.object({
  id: z.string({ error: "Asset ID is required." }).trim().min(1, "Asset ID is required."),
});

export const getAssetTablePageAction = adminActionClient
  .metadata({ actionName: "admin.assets.get-table-page" })
  .inputSchema(assetTableFilterSchema)
  .action(async ({ parsedInput }) => {
    try {
      const tablePage = await getAssetTablePage(parsedInput);

      return {
        ok: true as const,
        tablePage,
      };
    } catch (error) {
      return {
        ok: false as const,
        message: error instanceof Error ? error.message : "Failed to load asset table.",
      };
    }
  });

export const getAssetEditorDataAction = adminActionClient
  .metadata({ actionName: "admin.assets.get-editor-data" })
  .inputSchema(assetEditorDataInputSchema)
  .action(async ({ parsedInput }) => {
    try {
      const prefill = await getAssetEditorData(parsedInput.id);

      if (!prefill) {
        return {
          ok: false as const,
          message: "Asset not found.",
        };
      }

      return {
        ok: true as const,
        prefill,
      };
    } catch (error) {
      return {
        ok: false as const,
        message: error instanceof Error ? error.message : "Failed to load asset detail.",
      };
    }
  });
