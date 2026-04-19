import { ConsolePage } from "./_components/console-page";

import { getConsoleSnapshot, getConsoleStateSnapshot } from "@/modules/console/queries";
import { parseConsolePaymentErrorSearchParam } from "@/modules/console/schemas";
import { listMemberPurchasablePackages } from "@/modules/packages/services";

type MemberConsoleRoutePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MemberConsoleRoutePage({ searchParams }: MemberConsoleRoutePageProps) {
  const resolvedSearchParams = await searchParams;
  const initialPaymentError = parseConsolePaymentErrorSearchParam(resolvedSearchParams);
  const [initialSnapshot, initialStateSnapshot, initialPackages] = await Promise.all([
    getConsoleSnapshot(),
    getConsoleStateSnapshot(),
    listMemberPurchasablePackages(),
  ]);

  return (
    <ConsolePage
      initialPackages={initialPackages}
      initialPaymentError={initialPaymentError}
      initialSnapshot={initialSnapshot}
      initialStateSnapshot={initialStateSnapshot}
    />
  );
}
