import "server-only";

import { listMemberPurchasablePackages } from "@/modules/packages/services";

import type { CheckoutCatalogGroup, CheckoutCatalogItem } from "./types";

const checkoutGroupOrder = ["semi-private", "full-private", "legacy"] as const;

const checkoutGroupPresentationByKey: Record<string, Omit<CheckoutCatalogGroup, "items">> = {
  "full-private": {
    description: "Exclusive, private premium access.",
    featureList: ["Akses TradingView Premium Private", "Akses ForexTest Premium"],
    groupKey: "full-private",
    label: "Full Private",
  },
  legacy: {
    description: "Package tambahan yang masih tersedia untuk pembelian internal.",
    featureList: ["Akses premium sesuai entitlement package", "Diproses setelah pembayaran berhasil"],
    groupKey: "legacy",
    label: "Other Package",
  },
  "semi-private": {
    description: "Smart value, curated shared access.",
    featureList: ["Akses TradingView Premium", "Akses ForexTest Premium"],
    groupKey: "semi-private",
    label: "Semi Private",
  },
};

function getCheckoutGroupPresentation(groupKey: string) {
  return checkoutGroupPresentationByKey[groupKey] ?? checkoutGroupPresentationByKey.legacy;
}

function formatDurationLabel(durationDays: number) {
  return `${durationDays} days`;
}

function calculatePackageDiscountAmount(listAmountRp: number, amountRp: number) {
  return Math.max(0, listAmountRp - amountRp);
}

function calculatePackageDiscountPercent(listAmountRp: number, amountRp: number) {
  if (listAmountRp <= 0 || amountRp >= listAmountRp) {
    return 0;
  }

  return Math.round(((listAmountRp - amountRp) / listAmountRp) * 100);
}

function mapCatalogItem(input: {
  amountRp: number;
  durationDays: number;
  listAmountRp: number;
  name: string;
  packageId: string;
  sortOrder: number;
  summary: "private" | "share" | "mixed";
}): CheckoutCatalogItem {
  const durationMonths = input.durationDays / 30;
  const packageDiscountAmountRp = calculatePackageDiscountAmount(input.listAmountRp, input.amountRp);

  return {
    amountRp: input.amountRp,
    appliedVoucherAmountRp: 0,
    appliedVoucherCode: null,
    appliedVoucherId: null,
    appliedVoucherPercent: null,
    durationDays: input.durationDays,
    durationLabel: formatDurationLabel(input.durationDays),
    durationMonths,
    listAmountRp: input.listAmountRp,
    name: input.name,
    originalMonthlyPriceRp: durationMonths > 0 ? input.listAmountRp / durationMonths : input.listAmountRp,
    packageDiscountAmountRp,
    packageDiscountPercent: calculatePackageDiscountPercent(input.listAmountRp, input.amountRp),
    packageId: input.packageId,
    previewMonthlyPriceRp: durationMonths > 0 ? input.amountRp / durationMonths : input.amountRp,
    previewTotalRp: input.amountRp,
    sortOrder: input.sortOrder,
    summary: input.summary,
  };
}

export async function getCheckoutCatalog(): Promise<CheckoutCatalogGroup[]> {
  const packages = await listMemberPurchasablePackages();
  const groups = new Map<string, CheckoutCatalogItem[]>();

  for (const packageItem of packages) {
    const groupKey = packageItem.checkoutGroup;
    const nextItems = groups.get(groupKey) ?? [];

    nextItems.push(
      mapCatalogItem({
        amountRp: packageItem.amountRp,
        durationDays: packageItem.durationDays,
        listAmountRp: packageItem.listAmountRp,
        name: packageItem.name,
        packageId: packageItem.packageId,
        sortOrder: packageItem.sortOrder,
        summary: packageItem.summary,
      }),
    );
    groups.set(groupKey, nextItems);
  }

  return [...groups.entries()]
    .sort(([leftKey], [rightKey]) => {
      const leftIndex = checkoutGroupOrder.indexOf(leftKey as (typeof checkoutGroupOrder)[number]);
      const rightIndex = checkoutGroupOrder.indexOf(rightKey as (typeof checkoutGroupOrder)[number]);
      return (
        (leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex) -
        (rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex)
      );
    })
    .map(([groupKey, items]) => {
      const presentation = getCheckoutGroupPresentation(groupKey);

      return {
        description: presentation.description,
        featureList: presentation.featureList,
        groupKey,
        items: [...items].sort((leftItem, rightItem) => leftItem.sortOrder - rightItem.sortOrder),
        label: presentation.label,
      } satisfies CheckoutCatalogGroup;
    });
}
