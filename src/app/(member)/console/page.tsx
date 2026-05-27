import { redirect } from "next/navigation";

import { parseConsolePaymentErrorSearchParam } from "@/modules/console/schemas";

type MemberConsoleRoutePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MemberConsoleRoutePage({ searchParams }: MemberConsoleRoutePageProps) {
  const resolvedSearchParams = await searchParams;
  const initialPaymentError = parseConsolePaymentErrorSearchParam(resolvedSearchParams);

  redirect(initialPaymentError ? `/member?paymentError=${initialPaymentError}` : "/member");
}
