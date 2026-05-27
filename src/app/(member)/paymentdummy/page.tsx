import { redirect } from "next/navigation";

import { parsePaymentDummyPackageIdSearchParam } from "@/modules/console/schemas";
import type { ConsolePaymentError } from "@/modules/console/types";
import { getMemberPurchasablePackageById, getPackageById } from "@/modules/packages/services";

type PaymentDummyRoutePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function redirectToMember(paymentError: ConsolePaymentError): never {
  redirect(`/member?paymentError=${paymentError}`);
}

export default async function PaymentDummyRoutePage({ searchParams }: PaymentDummyRoutePageProps) {
  const resolvedSearchParams = await searchParams;
  const packageSearchParam = parsePaymentDummyPackageIdSearchParam(resolvedSearchParams);

  if (packageSearchParam.paymentError) {
    redirectToMember(packageSearchParam.paymentError);
  }

  const packageId = packageSearchParam.packageId;

  const purchasablePackage = await getMemberPurchasablePackageById(packageId);

  if (!purchasablePackage) {
    const packageRow = await getPackageById(packageId);
    redirectToMember(packageRow && !packageRow.isActive ? "disabled-package" : "invalid-package");
  }

  redirect(`/checkout?packageId=${packageId}`);
}
