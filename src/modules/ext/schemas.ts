import { z } from "zod";

export const extPlatformSchema = z.enum(["tradingview", "fxtester"]);

export const extModeSchema = z.enum(["private", "share"]);

const extVersionSchema = z
  .string()
  .trim()
  .min(1)
  .regex(/^\d+(?:\.\d+)*$/, "Must be a dot-separated numeric version.");

export const extRequestHeadersSchema = z.object({
  extensionId: z
    .string()
    .trim()
    .min(1)
    .refine((value) => !value.includes("://") && !value.includes("/"), "Must be a raw extension ID."),
  extensionVersion: extVersionSchema.optional(),
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
  version: extVersionSchema.optional(),
});

export const extAssetQuerySchema = z.object({
  platform: extPlatformSchema,
});

export const extAssetSyncQuerySchema = z.object({
  platform: extPlatformSchema,
  revision: z.string().trim().optional(),
});

export const extRedeemBodySchema = z.object({
  code: z.string().trim().min(1),
});

export const extHeartbeatBodySchema = z.object({
  deviceId: z.string().trim().min(1),
  extensionVersion: z.string().trim().min(1),
});

export const extTradingViewOwnedLayoutSchema = z.object({
  chartId: z.string().trim().min(1),
  title: z.string().trim().min(1),
  updatedAt: z.string().datetime({ offset: true }),
  url: z.url(),
});

export const extTradingViewOwnedLayoutSnapshotSchema = z.object({
  lastOpenedAt: z.string().datetime({ offset: true }).nullable(),
  lastOpenedChartId: z.string().trim().min(1).nullable(),
  layouts: z.array(extTradingViewOwnedLayoutSchema),
});

export const extTradingViewOwnedLayoutSyncBodySchema = z.object({
  isAuthoritativeSnapshot: z.boolean(),
  lastOpenedAt: z.string().datetime({ offset: true }).nullable(),
  lastOpenedChartId: z.string().trim().min(1).nullable(),
  layouts: z.array(extTradingViewOwnedLayoutSchema),
  snapshotCapturedAt: z.string().datetime({ offset: true }),
  trigger: z.enum(["manual_refresh", "popup_open", "tv_page_open"]),
});
