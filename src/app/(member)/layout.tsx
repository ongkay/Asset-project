import type { ReactNode } from "react";

import { LogoutButton } from "@/components/auth/logout-button";
import { Badge } from "@/components/ui/badge";
import { requireMemberShellAccess } from "@/modules/users/services";

export default async function MemberLayout({ children }: Readonly<{ children: ReactNode }>) {
  const authenticatedUser = await requireMemberShellAccess();

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

        <main className="flex-1 py-8">{children}</main>
      </div>
    </div>
  );
}
