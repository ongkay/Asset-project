"use server";

import { adminActionClient } from "@/modules/auth/action-client";

import {
  assetDeleteSchema,
  assetEditorInputSchema,
  assetFormSchema,
  assetToggleSchema,
  toAssetFormInput,
} from "./schemas";
import { createAsset, deleteAssetSafely, toggleAssetDisabled, updateAsset } from "./services";

function getActionErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }

  return fallbackMessage;
}

export const createAssetAction = adminActionClient
  .metadata({ actionName: "assets.create" })
  .inputSchema(assetFormSchema)
  .action(async ({ parsedInput }) => {
    try {
      const formInput = toAssetFormInput(parsedInput);
      const createdAsset = await createAsset(formInput);

      return {
        ok: true as const,
        id: createdAsset.id,
      };
    } catch (error) {
      return {
        ok: false as const,
        message: getActionErrorMessage(error, "Failed to create asset."),
      };
    }
  });

export const updateAssetAction = adminActionClient
  .metadata({ actionName: "assets.update" })
  .inputSchema(assetEditorInputSchema)
  .action(async ({ parsedInput }) => {
    try {
      const formInput = toAssetFormInput(parsedInput);
      const updatedAsset = await updateAsset({
        id: parsedInput.id,
        ...formInput,
      });

      return {
        ok: true as const,
        id: updatedAsset.id,
      };
    } catch (error) {
      return {
        ok: false as const,
        message: getActionErrorMessage(error, "Failed to update asset."),
      };
    }
  });

export const toggleAssetDisabledAction = adminActionClient
  .metadata({ actionName: "assets.toggle-disabled" })
  .inputSchema(assetToggleSchema)
  .action(async ({ parsedInput }) => {
    try {
      const updatedAsset = await toggleAssetDisabled(parsedInput);

      return {
        ok: true as const,
        id: updatedAsset.id,
      };
    } catch (error) {
      return {
        ok: false as const,
        message: getActionErrorMessage(error, "Failed to update asset status."),
      };
    }
  });

export const deleteAssetAction = adminActionClient
  .metadata({ actionName: "assets.delete" })
  .inputSchema(assetDeleteSchema)
  .action(async ({ parsedInput }) => {
    try {
      const deletedAsset = await deleteAssetSafely(parsedInput);

      return {
        ok: true as const,
        id: deletedAsset.id,
      };
    } catch (error) {
      return {
        ok: false as const,
        message: getActionErrorMessage(error, "Failed to delete asset."),
      };
    }
  });
