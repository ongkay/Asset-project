import { z } from "zod";

import type { CheckoutPaymentPackageSnapshot, CreateQrisPaymentForCheckoutInput } from "./types";

const priceAmountSchema = z
  .number({ error: "Nominal pembayaran tidak valid." })
  .int("Nominal pembayaran tidak valid.")
  .safe("Nominal pembayaran tidak valid.")
  .min(0, "Nominal pembayaran tidak valid.");

const nullableVoucherCodeSchema = z
  .union([z.string().trim().min(1), z.null(), z.undefined()])
  .transform((value) => value ?? null);

export const paymentTransactionIdSchema = z.uuid("Transaction ID must be a valid UUID.");

export const providerInvoiceIdSchema = z.string().trim().min(1, "Invoice ID provider tidak valid.");

export const paymentActionInputSchema = z.object({
  transactionId: paymentTransactionIdSchema,
});

export const checkoutPaymentPackageSnapshotSchema = z.object({
  accessKeys: z.array(z.string().trim().min(1)).min(1),
  amountRp: priceAmountSchema,
  durationDays: z.number().int().positive(),
  isExtended: z.boolean(),
  name: z.string().trim().min(1),
  packageId: z.uuid("Package ID must be a valid UUID."),
}) satisfies z.ZodType<CheckoutPaymentPackageSnapshot>;

export const createQrisPaymentForCheckoutSchema = z.object({
  customerEmail: z.email("Email customer tidak valid."),
  customerName: z.string().trim().min(1, "Nama customer wajib diisi."),
  packageSnapshot: checkoutPaymentPackageSnapshotSchema,
  pricingSnapshot: z.object({
    listAmountRp: priceAmountSchema,
    packageDiscountAmountRp: priceAmountSchema,
    voucherCode: nullableVoucherCodeSchema,
    voucherDiscountAmountRp: priceAmountSchema.optional().default(0),
    voucherDiscountPercent: z
      .union([z.number().int().min(1).max(100), z.null(), z.undefined()])
      .transform((value) => value ?? null),
    voucherId: z
      .union([z.uuid("Voucher ID must be a valid UUID."), z.null(), z.undefined()])
      .transform((value) => value ?? null),
  }),
  userId: z.uuid("User ID must be a valid UUID."),
}) satisfies z.ZodType<CreateQrisPaymentForCheckoutInput>;
