"use server";

import { memberActionClient } from "@/modules/auth/action-client";

import { getConsoleAssetDetail } from "./queries";
import { consoleAssetDetailActionInputSchema } from "./schemas";

export const getConsoleAssetDetailAction = memberActionClient
  .metadata({ actionName: "console.get-asset-detail" })
  .inputSchema(consoleAssetDetailActionInputSchema)
  .action(async ({ parsedInput }) => {
    const detail = await getConsoleAssetDetail({ assetId: parsedInput.assetId });

    if (!detail) {
      return {
        detail: null,
        uiMessage: "Asset sudah tidak tersedia.",
      };
    }

    return {
      detail,
      uiMessage: null,
    };
  });
