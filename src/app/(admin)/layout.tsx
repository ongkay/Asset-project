import type { ReactNode } from "react";

import Link from "next/link";

import { AlertCircle } from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { requireAdminShellAccess } from "@/modules/users/services";

export default async function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  const authenticatedUser = await requireAdminShellAccess();

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 lg:px-10">
        <header className="flex flex-col gap-4 border-b border-border/60 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Admin Shell</p>
            <h1 className="font-semibold text-2xl tracking-tight">Admin</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{authenticatedUser.profile.role}</Badge>
              <span>{authenticatedUser.profile.username}</span>
              <span>{authenticatedUser.profile.email}</span>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <Link href="/login" className="hover:text-foreground">
              Login
            </Link>
            <Link href="/console" className="hover:text-foreground">
              Console
            </Link>
            <LogoutButton />
          </nav>
        </header>
        <main className="flex-1 py-8">{children}</main>
        <Alert className="mt-6 border-dashed border-border/60 bg-background/60">
          <AlertCircle className="size-4" />
          <AlertTitle>Admin shell guarded</AlertTitle>
          <AlertDescription>
            Route ini sekarang memakai guard server-side berbasis `app_session` dan role admin sebagai fondasi Phase 1.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
