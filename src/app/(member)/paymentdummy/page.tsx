import { redirect } from "next/navigation";

import { parsePaymentDummyPackageIdSearchParam } from "@/modules/console/schemas";
import type { ConsolePaymentError } from "@/modules/console/types";
import { getMemberPurchasablePackageById, getPackageById } from "@/modules/packages/services";

type PaymentDummyRoutePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function redirectToConsole(paymentError: ConsolePaymentError): never {
  redirect(`/console?paymentError=${paymentError}`);
}

export default async function PaymentDummyRoutePage({ searchParams }: PaymentDummyRoutePageProps) {
  const resolvedSearchParams = await searchParams;
  const packageSearchParam = parsePaymentDummyPackageIdSearchParam(resolvedSearchParams);

  if (packageSearchParam.paymentError) {
    redirectToConsole(packageSearchParam.paymentError);
  }

  const packageId = packageSearchParam.packageId;

  const purchasablePackage = await getMemberPurchasablePackageById(packageId);

  if (!purchasablePackage) {
    const packageRow = await getPackageById(packageId);
    redirectToConsole(packageRow && !packageRow.isActive ? "disabled-package" : "invalid-package");
  }

  redirect(`/checkout?packageId=${packageId}`);
}
