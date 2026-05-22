import { z } from "zod";

import { voucherCodeSchema } from "@/modules/vouchers/schemas";

import type { CheckoutPaymentMethod, ResolveCheckoutStateInput, SubmitCheckoutInput } from "./types";

export const checkoutPaymentMethodSchema = z.enum([
  "qris",
  "crypto",
  "card",
]) satisfies z.ZodType<CheckoutPaymentMethod>;

export const optionalCheckoutVoucherCodeSchema = z
  .union([voucherCodeSchema, z.null(), z.undefined()])
  .transform((value) => value ?? null);

export const resolveCheckoutStateSchema = z.object({
  packageId: z
    .union([z.uuid("Package ID must be a valid UUID."), z.null(), z.undefined()])
    .transform((value) => value ?? null),
  voucherCode: optionalCheckoutVoucherCodeSchema,
}) satisfies z.ZodType<ResolveCheckoutStateInput>;

export const submitCheckoutSchema = z.object({
  packageId: z.uuid("Package ID must be a valid UUID."),
  paymentMethod: checkoutPaymentMethodSchema,
  voucherCode: optionalCheckoutVoucherCodeSchema,
}) satisfies z.ZodType<SubmitCheckoutInput>;

function readSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseCheckoutPackageIdSearchParam(searchParams: Record<string, string | string[] | undefined>) {
  const packageIdValue = readSingleSearchParam(searchParams.packageId)?.trim();
  const parsedPackageId = z.uuid().safeParse(packageIdValue);
  return parsedPackageId.success ? parsedPackageId.data : null;
}
