import type { ReactNode } from "react";

import Link from "next/link";

import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { requireMemberShellAccess } from "@/modules/users/services";

export default async function MemberLayout({ children }: Readonly<{ children: ReactNode }>) {
  await requireMemberShellAccess();

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8 lg:px-10">
        <header className="flex flex-col gap-4 border-b border-border/60 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Member Shell</p>
            <h1 className="font-semibold text-2xl tracking-tight">Console</h1>
          </div>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/login" className="hover:text-foreground">
              Login
            </Link>
            <Link href="/reset-password" className="hover:text-foreground">
              Reset password
            </Link>
          </nav>
        </header>
        <main className="flex-1 py-8">{children}</main>
        <Alert className="mt-6 border-dashed border-border/60 bg-background/60">
          <AlertCircle className="size-4" />
          <AlertTitle>Member shell guarded</AlertTitle>
          <AlertDescription>
            Route ini sekarang memakai guard server-side berbasis `app_session` dan role member sebagai fondasi Phase 1.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
