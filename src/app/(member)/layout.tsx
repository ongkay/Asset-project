import type { ReactNode } from "react";

import { requireMemberShellAccess } from "@/modules/users/services";

export default async function MemberLayout({ children }: Readonly<{ children: ReactNode }>) {
  await requireMemberShellAccess();

  return <main className="min-h-screen">{children}</main>;
}
