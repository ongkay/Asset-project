import { CheckoutPage } from "./_components/checkout-page";

import { parseCheckoutPackageIdSearchParam } from "@/modules/checkout/schemas";
import { resolveCheckoutState } from "@/modules/checkout/services";

type CheckoutRoutePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CheckoutRoutePage({ searchParams }: CheckoutRoutePageProps) {
  const resolvedSearchParams = await searchParams;
  const initialPackageId = parseCheckoutPackageIdSearchParam(resolvedSearchParams);
  const initialState = await resolveCheckoutState({
    packageId: initialPackageId,
    voucherCode: null,
  });

  return <CheckoutPage initialState={initialState} />;
}
