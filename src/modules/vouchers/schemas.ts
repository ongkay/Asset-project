import { z } from "zod";

import type {
  CheckoutVoucherValidationInput,
  CreateVoucherInput,
  UpdateVoucherInput,
  VoucherFormInput,
  VoucherListFilters,
  VoucherScopeType,
  VoucherToggleInput,
  VoucherUsageConsumeInput,
} from "./types";

export const voucherScopeTypeSchema = z.enum(["global", "package"]) satisfies z.ZodType<VoucherScopeType>;

export const voucherCodeSchema = z
  .string({ error: "Kode voucher wajib diisi." })
  .trim()
  .min(1, "Kode voucher wajib diisi.")
  .max(64, "Kode voucher terlalu panjang.")
  .transform((value) => value.toUpperCase());

export const checkoutVoucherValidationSchema = z.object({
  baseAmountRp: z
    .number({ error: "Nominal voucher tidak valid." })
    .int("Nominal voucher tidak valid.")
    .safe("Nominal voucher tidak valid.")
    .min(0, "Nominal voucher tidak valid."),
  code: voucherCodeSchema,
  packageId: z.uuid("Package ID must be a valid UUID."),
}) satisfies z.ZodType<CheckoutVoucherValidationInput>;

export const voucherUsageConsumeSchema = z.object({
  voucherId: z.uuid("Voucher ID must be a valid UUID."),
}) satisfies z.ZodType<VoucherUsageConsumeInput>;

function normalizeNullableGuid(value: string | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

function normalizeNullableExpiresAt(value: string | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    return null;
  }

  const parsedDate = new Date(trimmedValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return trimmedValue;
  }

  return parsedDate.toISOString();
}

const voucherPackageIdSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform(normalizeNullableGuid)
  .refine((value) => value === null || z.uuid().safeParse(value).success, "Package target tidak valid.");

const voucherExpiresAtSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform(normalizeNullableExpiresAt)
  .refine((value) => value === null || !Number.isNaN(new Date(value).getTime()), "Tanggal kedaluwarsa tidak valid.");

export const voucherFormSchema = z
  .object({
    code: voucherCodeSchema,
    discountPercent: z
      .number({ error: "Diskon voucher wajib diisi." })
      .int("Diskon voucher harus berupa angka bulat.")
      .safe("Diskon voucher tidak valid.")
      .min(1, "Diskon voucher minimal 1%.")
      .max(100, "Diskon voucher maksimal 100%."),
    expiresAt: voucherExpiresAtSchema,
    isActive: z.boolean({ error: "Status voucher wajib diisi." }),
    maxUses: z
      .number({ error: "Kuota voucher tidak valid." })
      .int("Kuota voucher harus berupa angka bulat.")
      .safe("Kuota voucher tidak valid.")
      .positive("Kuota voucher harus lebih dari 0.")
      .nullable(),
    packageId: voucherPackageIdSchema,
    scopeType: voucherScopeTypeSchema,
  })
  .superRefine((value, context) => {
    if (value.scopeType === "global" && value.packageId !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Voucher global tidak boleh memilih package target.",
        path: ["packageId"],
      });
    }

    if (value.scopeType === "package" && value.packageId === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Pilih package target untuk voucher package.",
        path: ["packageId"],
      });
    }
  }) satisfies z.ZodType<VoucherFormInput>;

export const createVoucherSchema = z
  .object({
    createdBy: z.uuid("Creator ID must be a valid UUID."),
  })
  .and(voucherFormSchema) satisfies z.ZodType<CreateVoucherInput>;

export const updateVoucherSchema = z
  .object({
    id: z.uuid("Voucher ID must be a valid UUID."),
  })
  .and(voucherFormSchema) satisfies z.ZodType<UpdateVoucherInput>;

export const voucherToggleSchema = z.object({
  id: z.uuid("Voucher ID must be a valid UUID."),
  isActive: z.boolean({ error: "Status voucher wajib diisi." }),
}) satisfies z.ZodType<VoucherToggleInput>;

export const voucherListFilterSchema = z.object({
  page: z.number({ error: "Page must be a number." }).int().min(1).default(1),
  pageSize: z.number({ error: "Page size must be a number." }).int().min(1).max(100).default(10),
  scopeType: voucherScopeTypeSchema.nullable().optional().default(null),
  search: z
    .string()
    .trim()
    .transform((searchValue) => (searchValue.length > 0 ? searchValue : null))
    .nullable()
    .optional()
    .default(null),
  status: z.enum(["active", "all", "exhausted", "expired", "inactive"]).optional().default("all"),
}) satisfies z.ZodType<VoucherListFilters>;
