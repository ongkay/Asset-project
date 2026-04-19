import { z } from "zod";

import type { ConsolePaymentError, PaymentDummyPackageSearchParamResult } from "./types";

const consolePaymentErrorSchema = z.enum(["missing-package", "invalid-package", "disabled-package"]);
const uuidSearchParamSchema = z.string().uuid();

function readSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export const consoleAssetDetailActionInputSchema = z.object({
  assetId: z
    .string({ error: "Asset ID is required." })
    .trim()
    .min(1, "Asset ID is required.")
    .uuid("Asset ID must be a valid UUID."),
});

export function parseConsolePaymentErrorSearchParam(
  searchParams: Record<string, string | string[] | undefined>,
): ConsolePaymentError | null {
  const paymentErrorValue = readSingleSearchParam(searchParams.paymentError)?.trim();
  const parsedPaymentError = consolePaymentErrorSchema.safeParse(paymentErrorValue);

  return parsedPaymentError.success ? parsedPaymentError.data : null;
}

export function parsePaymentDummyPackageIdSearchParam(
  searchParams: Record<string, string | string[] | undefined>,
): PaymentDummyPackageSearchParamResult {
  const packageIdValue = readSingleSearchParam(searchParams.packageId)?.trim();

  if (!packageIdValue) {
    return {
      packageId: null,
      paymentError: "missing-package",
    };
  }

  const parsedPackageId = uuidSearchParamSchema.safeParse(packageIdValue);

  if (!parsedPackageId.success) {
    return {
      packageId: null,
      paymentError: "invalid-package",
    };
  }

  return {
    packageId: parsedPackageId.data,
    paymentError: null,
  } satisfies PaymentDummyPackageSearchParamResult;
}
