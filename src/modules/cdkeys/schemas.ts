import { z } from "zod";

import type { CdKeyIssueFormInput, CdKeyIssueInput } from "./types";

function normalizeBlankToNull(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length === 0 ? null : trimmedValue;
}

export function normalizeCdKeyManualCode(value: string | null | undefined): string | null {
  const trimmedValue = normalizeBlankToNull(value);

  if (!trimmedValue) {
    return null;
  }

  return trimmedValue.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

const amountRpOverrideSchema = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((value, context) => {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === "string") {
      const trimmedValue = value.trim();

      if (trimmedValue.length === 0) {
        return null;
      }

      const parsedNumber = Number(trimmedValue);

      if (Number.isNaN(parsedNumber)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Amount override must be a valid number.",
        });
        return z.NEVER;
      }

      return parsedNumber;
    }

    return value;
  })
  .pipe(
    z
      .number({ error: "Amount override is required." })
      .int("Amount override must be an integer.")
      .safe("Amount override must be a safe integer.")
      .min(0, "Amount override must be greater than or equal to 0.")
      .nullable(),
  );

const manualCodeSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform(normalizeCdKeyManualCode)
  .superRefine((value, context) => {
    if (value === null) {
      return;
    }

    if (value.length < 8 || value.length > 12) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Manual code length must be between 8 and 12 characters.",
      });
    }
  });

export const cdKeyIssueInputSchema = z.object({
  packageId: z.uuid("Package ID must be a valid UUID."),
  manualCode: manualCodeSchema,
  amountRpOverride: amountRpOverrideSchema,
}) satisfies z.ZodType<CdKeyIssueInput>;

export const cdKeyIssueFormSchema = cdKeyIssueInputSchema satisfies z.ZodType<CdKeyIssueFormInput>;
