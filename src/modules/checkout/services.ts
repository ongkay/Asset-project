import "server-only";

import { getCheckoutCatalog } from "./queries";
import { resolveCheckoutStateSchema, submitCheckoutSchema } from "./schemas";
import { purchaseSubscriptionWithPaymentDummy } from "@/modules/subscriptions/services";
import { validateVoucherForPackage } from "@/modules/vouchers/services";

import type { CheckoutCatalogItem, CheckoutSummaryQuote, ResolvedCheckoutState, SubmitCheckoutResult } from "./types";

function flattenCatalogItems(groups: Awaited<ReturnType<typeof getCheckoutCatalog>>) {
  return groups.flatMap((group) => group.items.map((item) => ({ group, item })));
}

function buildQuote(input: {
  featureList: string[];
  groupDescription: string;
  groupKey: string;
  groupLabel: string;
  item: CheckoutCatalogItem;
}): CheckoutSummaryQuote {
  return {
    durationLabel: input.item.durationLabel,
    featureList: input.featureList,
    groupDescription: input.groupDescription,
    groupKey: input.groupKey,
    groupLabel: input.groupLabel,
    listAmountRp: input.item.listAmountRp,
    packageDiscountAmountRp: input.item.packageDiscountAmountRp,
    packageDiscountPercent: input.item.packageDiscountPercent,
    packageId: input.item.packageId,
    packageName: input.item.name,
    totalRp: input.item.previewTotalRp,
    voucherCode: input.item.appliedVoucherCode,
    voucherDiscountAmountRp: input.item.appliedVoucherAmountRp,
    voucherId: input.item.appliedVoucherId,
    voucherDiscountPercent: input.item.appliedVoucherPercent,
  };
}

export async function resolveCheckoutState(input: {
  packageId: string | null;
  voucherCode: string | null;
}): Promise<ResolvedCheckoutState> {
  const parsedInput = resolveCheckoutStateSchema.parse(input);
  const groups = await getCheckoutCatalog();
  const catalogItems = flattenCatalogItems(groups);

  if (catalogItems.length === 0) {
    return {
      appliedVoucherCode: null,
      groups,
      quote: null,
      selectedGroupKey: null,
      selectedPackageId: null,
      voucherError: null,
    };
  }

  const selectedEntry =
    catalogItems.find((entry) => entry.item.packageId === parsedInput.packageId) ?? catalogItems[0] ?? null;

  if (!selectedEntry) {
    return {
      appliedVoucherCode: null,
      groups,
      quote: null,
      selectedGroupKey: null,
      selectedPackageId: null,
      voucherError: null,
    };
  }

  if (!parsedInput.voucherCode) {
    return {
      appliedVoucherCode: null,
      groups,
      quote: buildQuote({
        featureList: selectedEntry.group.featureList,
        groupDescription: selectedEntry.group.description,
        groupKey: selectedEntry.group.groupKey,
        groupLabel: selectedEntry.group.label,
        item: selectedEntry.item,
      }),
      selectedGroupKey: selectedEntry.group.groupKey,
      selectedPackageId: selectedEntry.item.packageId,
      voucherError: null,
    };
  }

  const selectedVoucherResult = await validateVoucherForPackage({
    baseAmountRp: selectedEntry.item.amountRp,
    code: parsedInput.voucherCode,
    packageId: selectedEntry.item.packageId,
  });

  if (!selectedVoucherResult.ok) {
    return {
      appliedVoucherCode: null,
      groups,
      quote: buildQuote({
        featureList: selectedEntry.group.featureList,
        groupDescription: selectedEntry.group.description,
        groupKey: selectedEntry.group.groupKey,
        groupLabel: selectedEntry.group.label,
        item: selectedEntry.item,
      }),
      selectedGroupKey: selectedEntry.group.groupKey,
      selectedPackageId: selectedEntry.item.packageId,
      voucherError: {
        errorCode: selectedVoucherResult.errorCode,
        message: selectedVoucherResult.message,
      },
    };
  }

  const appliedVoucherCode = parsedInput.voucherCode;

  if (!appliedVoucherCode) {
    return {
      appliedVoucherCode: null,
      groups,
      quote: buildQuote({
        featureList: selectedEntry.group.featureList,
        groupDescription: selectedEntry.group.description,
        groupKey: selectedEntry.group.groupKey,
        groupLabel: selectedEntry.group.label,
        item: selectedEntry.item,
      }),
      selectedGroupKey: selectedEntry.group.groupKey,
      selectedPackageId: selectedEntry.item.packageId,
      voucherError: null,
    };
  }

  const previewResults = await Promise.all(
    catalogItems.map(async (entry) => {
      const voucherResult = await validateVoucherForPackage({
        baseAmountRp: entry.item.amountRp,
        code: appliedVoucherCode,
        packageId: entry.item.packageId,
      });

      return {
        packageId: entry.item.packageId,
        voucherResult,
      };
    }),
  );

  const previewByPackageId = new Map(previewResults.map((result) => [result.packageId, result.voucherResult]));

  const groupsWithPreview = groups.map((group) => ({
    ...group,
    items: group.items.map((item) => {
      const voucherResult = previewByPackageId.get(item.packageId);

      if (!voucherResult?.ok) {
        return item;
      }

      const previewTotalRp = Math.max(0, item.amountRp - voucherResult.discountAmountRp);

      return {
        ...item,
        appliedVoucherAmountRp: voucherResult.discountAmountRp,
        appliedVoucherCode: voucherResult.voucher.code,
        appliedVoucherId: voucherResult.voucher.id,
        appliedVoucherPercent: voucherResult.voucher.discountPercent,
        previewMonthlyPriceRp: item.durationMonths > 0 ? previewTotalRp / item.durationMonths : previewTotalRp,
        previewTotalRp,
      };
    }),
  }));

  const selectedGroupWithPreview =
    groupsWithPreview.find((group) => group.groupKey === selectedEntry.group.groupKey) ?? groupsWithPreview[0];
  const selectedItemWithPreview =
    selectedGroupWithPreview.items.find((item) => item.packageId === selectedEntry.item.packageId) ??
    selectedGroupWithPreview.items[0];

  return {
    appliedVoucherCode,
    groups: groupsWithPreview,
    quote: buildQuote({
      featureList: selectedGroupWithPreview.featureList,
      groupDescription: selectedGroupWithPreview.description,
      groupKey: selectedGroupWithPreview.groupKey,
      groupLabel: selectedGroupWithPreview.label,
      item: selectedItemWithPreview,
    }),
    selectedGroupKey: selectedGroupWithPreview.groupKey,
    selectedPackageId: selectedItemWithPreview.packageId,
    voucherError: null,
  };
}

export async function submitCheckout(input: {
  packageId: string;
  paymentMethod: "qris" | "crypto" | "card";
  userId: string;
  voucherCode: string | null;
}): Promise<SubmitCheckoutResult> {
  const parsedInput = submitCheckoutSchema.parse(input);
  const resolvedState = await resolveCheckoutState({
    packageId: parsedInput.packageId,
    voucherCode: parsedInput.voucherCode,
  });

  if (
    !resolvedState.quote ||
    !resolvedState.selectedPackageId ||
    resolvedState.selectedPackageId !== parsedInput.packageId
  ) {
    return {
      errorCode: "invalid-package",
      message: "Package yang dipilih tidak valid atau sudah tidak tersedia.",
      ok: false,
    };
  }

  if (resolvedState.voucherError) {
    return {
      errorCode: resolvedState.voucherError.errorCode,
      message: resolvedState.voucherError.message,
      ok: false,
    };
  }

  const purchaseResult = await purchaseSubscriptionWithPaymentDummy({
    packageId: parsedInput.packageId,
    pricingSnapshot: {
      listAmountRp: resolvedState.quote.listAmountRp,
      packageDiscountAmountRp: resolvedState.quote.packageDiscountAmountRp,
      voucherCode: resolvedState.quote.voucherCode,
      voucherDiscountAmountRp: resolvedState.quote.voucherDiscountAmountRp,
      voucherDiscountPercent: resolvedState.quote.voucherDiscountPercent,
      voucherId: resolvedState.quote.voucherId,
    },
    userId: input.userId,
  });

  if (!purchaseResult.ok) {
    return purchaseResult;
  }

  return purchaseResult;
}
