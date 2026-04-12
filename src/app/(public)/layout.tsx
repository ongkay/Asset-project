import type { ReactNode } from "react";

import Link from "next/link";

import { APP_CONFIG } from "@/config/app-config";

export default function PublicLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8 lg:px-10">
        <header className="flex items-center justify-between border-b border-border/60 pb-6">
          <Link href="/login" className="font-semibold text-lg tracking-tight">
            {APP_CONFIG.name}
          </Link>
          <p className="text-right text-sm text-muted-foreground">Subscription access and extension session control.</p>
        </header>
        <main className="flex flex-1 items-center justify-center py-10">{children}</main>
      </div>
    </div>
  );
}
