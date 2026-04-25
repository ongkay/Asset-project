import { z } from "zod";

export const extPlatformSchema = z.enum(["tradingview", "fxreplay", "fxtester"]);

export const extModeSchema = z.enum(["private", "share"]);

export const extRequestHeadersSchema = z.object({
  extensionId: z
    .string()
    .trim()
    .min(1)
    .refine((value) => !value.includes("://") && !value.includes("/"), "Must be a raw extension ID."),
  extensionVersion: z.string().trim().min(1).optional(),
  origin: z
    .string()
    .trim()
    .min(1)
    .refine(
      (value) => value.startsWith("chrome-extension://") || value.startsWith("https://"),
      "Must be a chrome-extension:// or https:// origin.",
    ),
});

export const extBootstrapQuerySchema = z.object({
  version: z.string().trim().min(1).optional(),
});

export const extAssetQuerySchema = z.object({
  mode: extModeSchema.optional(),
  platform: extPlatformSchema,
});

export const extRedeemBodySchema = z.object({
  code: z.string().trim().min(1),
});

export const extHeartbeatBodySchema = z.object({
  deviceId: z.string().trim().min(1),
  extensionVersion: z.string().trim().min(1),
});
