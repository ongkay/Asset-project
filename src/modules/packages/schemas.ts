import { z } from "zod";

import {
  PACKAGE_ACCESS_KEYS,
  sortPackageAccessKeysCanonical,
  type PackageFormInput,
  type PackageSummary,
  type PackageTableSortKey,
  type PackageTableSortOrder,
  type PackageToggleInput,
} from "./types";

const packageAccessKeySchema = z.enum(PACKAGE_ACCESS_KEYS, {
  error: "Access key is invalid.",
});

const packageSummarySchema = z.enum(["private", "share", "mixed"]);
const packageTableSortKeySchema = z.enum(["status", "updatedAt"]);
const packageTableSortOrderSchema = z.enum(["asc", "desc"]);

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
    name: z.string().trim().min(1, "Package name is required."),
  })
  .transform((parsedInput) => ({
    ...parsedInput,
    accessKeys: sortPackageAccessKeysCanonical(parsedInput.accessKeys),
  })) satisfies z.ZodType<PackageFormInput>;

export const packageTableFilterSchema = z.object({
  page: z.number({ error: "Page must be a number." }).int().min(1).default(1),
  pageSize: z.number({ error: "Page size must be a number." }).int().min(1).max(100).default(10),
  search: z
    .string()
    .trim()
    .transform((searchValue) => (searchValue.length > 0 ? searchValue : null))
    .nullable()
    .optional()
    .default(null),
  summary: packageSummarySchema.nullable().optional().default(null),
  sort: packageTableSortKeySchema.nullable().optional().default(null),
  order: packageTableSortOrderSchema.nullable().optional().default(null),
});

export const packageToggleSchema = z.object({
  id: z.uuid("Package ID must be a valid UUID."),
  isActive: z.boolean({ error: "Package active flag is required." }),
}) satisfies z.ZodType<PackageToggleInput>;

export type PackageTableFilterInput = z.input<typeof packageTableFilterSchema>;
export type PackageTableFilter = {
  page: number;
  pageSize: number;
  order: PackageTableSortOrder | null;
  search: string | null;
  sort: PackageTableSortKey | null;
  summary: PackageSummary | null;
};
