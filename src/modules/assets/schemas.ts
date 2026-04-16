import { z } from "zod";

import { ASSET_PLATFORMS, ASSET_TYPES, type AssetFormInput, type AssetJsonArray, type AssetJsonObject } from "./types";

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

function hasTimezone(value: string) {
  return /(Z|[+-]\d{2}:\d{2})$/i.test(value);
}

export function parseAssetJsonText(assetJsonText: string): AssetJsonObject | AssetJsonArray {
  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(assetJsonText);
  } catch {
    throw new Error("Asset JSON must be a valid JSON string.");
  }

  if (Array.isArray(parsedJson)) {
    return parsedJson;
  }

  if (parsedJson && typeof parsedJson === "object") {
    return parsedJson as AssetJsonObject;
  }

  throw new Error("Asset JSON top-level value must be an object or an array.");
}

export function parseAssetExpiresAtToUtcIso(expiresAt: string) {
  if (!hasTimezone(expiresAt)) {
    throw new Error("Expiry must include timezone information.");
  }

  const parsedDate = new Date(expiresAt);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error("Expiry must be a valid ISO-8601 datetime.");
  }

  return parsedDate.toISOString();
}

const assetJsonTextSchema = z
  .string({ error: "Asset JSON is required." })
  .trim()
  .min(1, "Asset JSON is required.")
  .refine(
    (value) => {
      try {
        parseAssetJsonText(value);
        return true;
      } catch {
        return false;
      }
    },
    {
      error: "Asset JSON must be valid JSON with top-level object or array.",
    },
  );

const assetExpiresAtSchema = z
  .string({ error: "Expiry date is required." })
  .trim()
  .min(1, "Expiry date is required.")
  .refine(hasTimezone, {
    error: "Expiry must include timezone information.",
  })
  .refine(
    (value) => {
      const parsedDate = new Date(value);
      return !Number.isNaN(parsedDate.getTime());
    },
    {
      error: "Expiry must be a valid ISO-8601 datetime.",
    },
  );

export const assetFormSchema = z.object({
  platform: z.enum(ASSET_PLATFORMS, {
    error: "Platform is invalid.",
  }),
  assetType: z.enum(ASSET_TYPES, {
    error: "Asset type is invalid.",
  }),
  account: z.string({ error: "Account is required." }).trim().min(1, "Account is required."),
  note: z.union([z.string(), z.null(), z.undefined()]).transform(normalizeOptionalText),
  proxy: z.union([z.string(), z.null(), z.undefined()]).transform(normalizeOptionalText),
  assetJsonText: assetJsonTextSchema,
  expiresAt: assetExpiresAtSchema,
});

export const assetEditorInputSchema = z
  .object({
    id: z.string({ error: "Asset ID is required." }).trim().min(1, "Asset ID is required."),
  })
  .and(assetFormSchema);

export const assetToggleSchema = z.object({
  id: z.string({ error: "Asset ID is required." }).trim().min(1, "Asset ID is required."),
  disabled: z.boolean({ error: "Disabled flag is required." }),
});

export const assetDeleteSchema = z.object({
  id: z.string({ error: "Asset ID is required." }).trim().min(1, "Asset ID is required."),
});

export function toAssetFormInput(values: z.input<typeof assetFormSchema>): AssetFormInput {
  const parsedValues = assetFormSchema.parse(values);

  return {
    platform: parsedValues.platform,
    assetType: parsedValues.assetType,
    account: parsedValues.account,
    note: parsedValues.note,
    proxy: parsedValues.proxy,
    assetJson: parseAssetJsonText(parsedValues.assetJsonText),
    expiresAt: parseAssetExpiresAtToUtcIso(parsedValues.expiresAt),
  };
}
