import { ConsolePage } from "./_components/console-page";

import { LogoutButton } from "@/components/auth/logout-button";
import { Badge } from "@/components/ui/badge";
import {
  readCurrentAuthEmailVerificationState,
  readCurrentEmailVerificationResendCooldownRemainingSeconds,
} from "@/modules/auth/services";
import { getConsoleSnapshot, getConsoleStateSnapshot } from "@/modules/console/queries";
import { parseConsolePaymentErrorSearchParam } from "@/modules/console/schemas";
import { listMemberPurchasablePackages } from "@/modules/packages/services";
import { requireMemberShellAccess } from "@/modules/users/services";

type MemberConsoleRoutePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MemberConsoleRoutePage({ searchParams }: MemberConsoleRoutePageProps) {
  const resolvedSearchParams = await searchParams;
  const initialPaymentError = parseConsolePaymentErrorSearchParam(resolvedSearchParams);
  const [
    authenticatedUser,
    initialSnapshot,
    initialStateSnapshot,
    initialPackages,
    initialEmailVerified,
    initialCooldownRemainingSeconds,
  ] = await Promise.all([
    requireMemberShellAccess(),
    getConsoleSnapshot(),
    getConsoleStateSnapshot(),
    listMemberPurchasablePackages(),
    readCurrentAuthEmailVerificationState(),
    readCurrentEmailVerificationResendCooldownRemainingSeconds(),
  ]);

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8 lg:px-10">
        <header className="flex flex-col gap-4 border-b border-border/60 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Akses member</p>
            <h1 className="font-semibold text-2xl tracking-tight">Kelola langganan akun</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{authenticatedUser.profile.role}</Badge>
              <span>{authenticatedUser.profile.username}</span>
              <span>{authenticatedUser.profile.email}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LogoutButton />
          </div>
        </header>

        <div className="flex-1 py-8">
          <ConsolePage
            initialEmailVerificationResendCooldownRemainingSeconds={initialCooldownRemainingSeconds}
            initialEmailVerified={initialEmailVerified}
            initialPackages={initialPackages}
            initialPaymentError={initialPaymentError}
            initialSnapshot={initialSnapshot}
            initialStateSnapshot={initialStateSnapshot}
          />
        </div>
      </div>
    </div>
  );
}
