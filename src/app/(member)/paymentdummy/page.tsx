import { redirect } from "next/navigation";

import { PaymentDummyPage } from "./_components/paymentdummy-page";

import { getConsoleSnapshot } from "@/modules/console/queries";
import { parsePaymentDummyPackageIdSearchParam } from "@/modules/console/schemas";
import { getMemberPurchasablePackageById, getPackageById } from "@/modules/packages/services";
import type { ConsolePaymentError } from "@/modules/console/types";

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
  const [selectedPackage, consoleSnapshot] = await Promise.all([
    getMemberPurchasablePackageById(packageId),
    getConsoleSnapshot(),
  ]);

  if (!selectedPackage) {
    const packageRow = await getPackageById(packageId);

    redirectToConsole(packageRow?.isActive === false ? "disabled-package" : "invalid-package");
  }

  return <PaymentDummyPage currentSubscription={consoleSnapshot.subscription} selectedPackage={selectedPackage} />;
}
