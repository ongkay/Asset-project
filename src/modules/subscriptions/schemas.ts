import { z } from "zod";

import { ASSET_PLATFORMS } from "@/modules/assets/types";

import type {
  AdminManualActivationFormValues,
  ManualAssignmentsByAccessKey,
  SubscriberCancelInput,
  SubscriberQuickAddAssetValues,
} from "./types";

function normalizeOptionalText(value: string | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

function normalizeManualAssignments(value: Record<string, string | null | undefined>): ManualAssignmentsByAccessKey {
  return Object.fromEntries(
    Object.entries(value).map(([accessKey, assetId]) => [accessKey, normalizeOptionalText(assetId ?? null)]),
  );
}

export const positiveIntegerDurationSchema = z
  .number({ error: "Duration must be a number." })
  .int("Duration must be a positive integer.")
  .min(1, "Duration must be a positive integer.");

export const adminManualActivationFormSchema = z.object({
  userId: z.string({ error: "User ID is required." }).trim().min(1, "User ID is required."),
  packageId: z.string({ error: "Package ID is required." }).trim().min(1, "Package ID is required."),
  durationDays: positiveIntegerDurationSchema,
  manualAssignmentsByAccessKey: z
    .record(z.string(), z.union([z.string(), z.null(), z.undefined()]))
    .transform(normalizeManualAssignments),
}) satisfies z.ZodType<AdminManualActivationFormValues>;

export const subscriberQuickAddAssetSchema = z.object({
  userId: z.string({ error: "User ID is required." }).trim().min(1, "User ID is required."),
  packageId: z.string({ error: "Package ID is required." }).trim().min(1, "Package ID is required."),
  subscriptionId: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => normalizeOptionalText(value ?? null)),
  platform: z.enum(ASSET_PLATFORMS, {
    error: "Platform is invalid.",
  }),
  account: z.string({ error: "Account is required." }).trim().min(1, "Account is required."),
  durationDays: positiveIntegerDurationSchema,
  note: z.union([z.string(), z.null(), z.undefined()]).transform((value) => normalizeOptionalText(value ?? null)),
  proxy: z.union([z.string(), z.null(), z.undefined()]).transform((value) => normalizeOptionalText(value ?? null)),
  assetJsonText: z.string({ error: "Asset JSON is required." }).trim().min(1, "Asset JSON is required."),
}) satisfies z.ZodType<SubscriberQuickAddAssetValues>;

export const subscriberCancelSchema = z.object({
  subscriptionId: z.string({ error: "Subscription ID is required." }).trim().min(1, "Subscription ID is required."),
}) satisfies z.ZodType<SubscriberCancelInput>;
