import { z } from "zod";

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
  extensionId: extensionIdSchema,
  extensionVersion: z.string().trim().min(1, "Extension version is required."),
  os: z.string().trim().min(1).nullable().default(null),
});

export const extensionRequestNonceSchema = z.string().trim().min(1, "Request nonce is required.");

export type ExtensionRequestHeadersInput = z.infer<typeof extensionRequestHeadersSchema>;
export type ExtensionTrackHeartbeatInputSchema = z.infer<typeof extensionTrackHeartbeatInputSchema>;
