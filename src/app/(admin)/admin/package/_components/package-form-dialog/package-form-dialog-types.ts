import { z } from "zod";

import { packageFormSchema } from "@/modules/packages/schemas";
import { sortPackageAccessKeysCanonical } from "@/modules/packages/types";

import type { PackageEditorPrefill } from "@/modules/admin/packages/types";

export type PackageFormDialogSubmitValues = z.input<typeof packageFormSchema>;
export type PackageFormDialogValues = PackageFormDialogSubmitValues;

export function getDefaultFormValues(prefill: PackageEditorPrefill | null): PackageFormDialogValues {
  if (!prefill) {
    return {
      accessKeys: [],
      amountRp: 0,
      checkoutUrl: "",
      durationDays: 30,
      isExtended: false,
      name: "",
    };
  }

  return {
    accessKeys: sortPackageAccessKeysCanonical(prefill.accessKeys),
    amountRp: prefill.amountRp,
    checkoutUrl: prefill.checkoutUrl ?? "",
    durationDays: prefill.durationDays,
    isExtended: prefill.isExtended,
    name: prefill.name,
  };
}

export function normalizeCheckoutUrl(checkoutUrl: string | null): string | null {
  if (!checkoutUrl) {
    return null;
  }

  const trimmedValue = checkoutUrl.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}
