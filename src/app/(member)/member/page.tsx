import { MemberPage } from "./_components/member-page";

import { getConsoleSnapshot, getConsoleStateSnapshot } from "@/modules/console/queries";
import { parseConsolePaymentErrorSearchParam } from "@/modules/console/schemas";
import { requireMemberShellAccess } from "@/modules/users/services";

type MemberRoutePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MemberRoutePage({ searchParams }: MemberRoutePageProps) {
  const resolvedSearchParams = await searchParams;
  const initialPaymentError = parseConsolePaymentErrorSearchParam(resolvedSearchParams);
  const [authenticatedUser, initialSnapshot, initialStateSnapshot] = await Promise.all([
    requireMemberShellAccess(),
    getConsoleSnapshot(),
    getConsoleStateSnapshot(),
  ]);

  return (
    <MemberPage
      initialPaymentError={initialPaymentError}
      initialSnapshot={initialSnapshot}
      initialStateSnapshot={initialStateSnapshot}
      profile={authenticatedUser.profile}
    />
  );
}
