import { z } from "zod";

const isoDateTimeSchema = z.iso.datetime({ offset: true });

export const extensionIdSchema = z
  .string()
  .trim()
  .min(1, "Extension ID is required.")
  .refine((value) => !value.includes("://") && !value.includes("/"), "Extension ID must be raw.");

export const extensionOriginSchema = z
  .string()
  .trim()
  .min(1, "Extension origin is required.")
  .refine(
    (value) => value.startsWith("chrome-extension://") || value.startsWith("https://"),
    "Extension origin must be trusted.",
  );

export const extensionRequestHeadersSchema = z.object({
  extensionId: extensionIdSchema,
  origin: extensionOriginSchema,
});

export const extensionTrackHeartbeatInputSchema = z.object({
  browser: z.string().trim().min(1).nullable().default(null),
  deviceId: z.string().trim().min(1, "Device ID is required."),
  extensionVersion: z.string().trim().min(1, "Extension version is required."),
  os: z.string().trim().min(1).nullable().default(null),
});

export const extensionRequestNonceSchema = z.string().trim().min(1, "Request nonce is required.");

export const extensionConsoleSnapshotRpcSchema = z.object({
  subscription: z
    .object({
      days_left: z.number().int().nonnegative(),
      end_at: isoDateTimeSchema,
      id: z.string().min(1),
      package_id: z.string().min(1),
      package_name: z.string().min(1),
      start_at: isoDateTimeSchema,
      status: z.enum(["active", "processed"]),
    })
    .nullable(),
  assets: z.array(
    z.object({
      access_key: z.string().min(1),
      asset_type: z.enum(["private", "share"]),
      assignment_id: z.string().min(1),
      expires_at: isoDateTimeSchema,
      id: z.string().min(1),
      note: z.string().nullable(),
      platform: z.enum(["tradingview", "fxreplay", "fxtester"]),
      proxy: z.string().nullable(),
      subscription_id: z.string().min(1),
    }),
  ),
  transactions: z.array(z.unknown()),
});

export const extensionAssetDetailRpcSchema = z.object({
  access_key: z.string().min(1),
  account: z.string().min(1),
  asset_json: z.unknown(),
  asset_type: z.enum(["private", "share"]),
  expires_at: isoDateTimeSchema,
  id: z.string().min(1),
  note: z.string().nullable(),
  platform: z.enum(["tradingview", "fxreplay", "fxtester"]),
  proxy: z.string().nullable(),
  subscription_id: z.string().min(1),
});

export type ExtensionRequestHeadersInput = z.infer<typeof extensionRequestHeadersSchema>;
export type ExtensionTrackHeartbeatInputSchema = z.infer<typeof extensionTrackHeartbeatInputSchema>;
