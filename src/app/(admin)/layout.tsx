import type { ReactNode } from "react";

import { cookies } from "next/headers";

import { AdminShell } from "./_components/admin-shell/admin-shell";
import { getServerPreference } from "@/lib/preferences/preferences-server";
import { SIDEBAR_COLLAPSIBLE_VALUES, SIDEBAR_VARIANT_VALUES } from "@/lib/preferences/layout";
import { requireAdminShellAccess } from "@/modules/users/services";

export default async function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  const authenticatedUser = await requireAdminShellAccess();
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";
  const [variant, collapsible] = await Promise.all([
    getServerPreference("sidebar_variant", SIDEBAR_VARIANT_VALUES, "inset"),
    getServerPreference("sidebar_collapsible", SIDEBAR_COLLAPSIBLE_VALUES, "icon"),
  ]);

  return (
    <AdminShell
      profile={authenticatedUser.profile}
      defaultOpen={defaultOpen}
      variant={variant}
      collapsible={collapsible}
    >
      {children}
    </AdminShell>
  );
}
