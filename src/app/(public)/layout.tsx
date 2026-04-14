import type { ReactNode } from "react";

import Link from "next/link";

import { APP_CONFIG } from "@/config/app-config";

export default function PublicLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/20 p-6 sm:p-10">
      <div className="mb-8 text-center">
        <Link
          href="/login"
          className="text-2xl font-bold tracking-tight text-foreground transition-colors hover:text-primary"
        >
          {APP_CONFIG.name}
        </Link>
      </div>
      <main className="w-full flex justify-center">{children}</main>
    </div>
  );
}
