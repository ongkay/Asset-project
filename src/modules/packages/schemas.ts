import { z } from "zod";

import {
  EDITABLE_PACKAGE_CHECKOUT_GROUPS,
  PACKAGE_ACCESS_KEYS,
  sortPackageAccessKeysCanonical,
  type PackageFormInput,
  type PackageToggleInput,
} from "./types";

const packageAccessKeySchema = z.enum(PACKAGE_ACCESS_KEYS, {
  error: "Access key is invalid.",
});

const editablePackageCheckoutGroupSchema = z.enum(EDITABLE_PACKAGE_CHECKOUT_GROUPS);

function normalizeCheckoutUrl(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmedCheckoutUrl = value.trim();

  if (trimmedCheckoutUrl.length === 0) {
    return null;
  }

  return trimmedCheckoutUrl;
}

export const packageFormSchema = z
  .object({
    accessKeys: z
      .array(packageAccessKeySchema)
      .min(1, "At least one access key is required.")
      .superRefine((accessKeys, context) => {
        const uniqueAccessKeys = new Set(accessKeys);

        if (uniqueAccessKeys.size !== accessKeys.length) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Access keys must be unique.",
          });
        }
      })
      .transform((accessKeys) => sortPackageAccessKeysCanonical(accessKeys)),
    amountRp: z
      .number({ error: "Amount is required." })
      .int("Amount must be an integer.")
      .safe("Amount must be a safe integer.")
      .min(0, "Amount must be greater than or equal to 0."),
    checkoutGroup: z
      .string({ error: "Checkout group is required." })
      .trim()
      .min(1, "Checkout group is required.")
      .pipe(editablePackageCheckoutGroupSchema),
    checkoutUrl: z
      .union([z.string(), z.null(), z.undefined()])
      .transform(normalizeCheckoutUrl)
      .pipe(
        z
          .url({
            error: "Checkout URL must be a valid URL.",
            protocol: /^https?$/,
          })
          .nullable(),
      ),
    durationDays: z
      .number({ error: "Duration days is required." })
      .int("Duration days must be an integer.")
      .safe("Duration days must be a safe integer.")
      .min(1, "Duration days must be greater than 0."),
    isExtended: z.boolean({ error: "Extended flag is required." }),
    listAmountRp: z
      .number({ error: "Original amount is required." })
      .int("Original amount must be an integer.")
      .safe("Original amount must be a safe integer.")
      .min(0, "Original amount must be greater than or equal to 0."),
    name: z.string().trim().min(1, "Package name is required."),
    sortOrder: z
      .number({ error: "Sort order is required." })
      .int("Sort order must be an integer.")
      .safe("Sort order must be a safe integer.")
      .min(0, "Sort order must be greater than or equal to 0."),
  })
  .superRefine((parsedInput, context) => {
    if (parsedInput.listAmountRp < parsedInput.amountRp) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Original amount must be greater than or equal to selling amount.",
        path: ["listAmountRp"],
      });
    }
  })
  .transform((parsedInput) => ({
    ...parsedInput,
    accessKeys: sortPackageAccessKeysCanonical(parsedInput.accessKeys),
  })) satisfies z.ZodType<PackageFormInput>;

export const packageToggleSchema = z.object({
  id: z.uuid("Package ID must be a valid UUID."),
  isActive: z.boolean({ error: "Package active flag is required." }),
}) satisfies z.ZodType<PackageToggleInput>;
