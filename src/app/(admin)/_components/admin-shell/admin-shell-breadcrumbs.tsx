"use client";

import { usePathname } from "next/navigation";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import { ADMIN_BREADCRUMB_LABELS, getAdminBreadcrumbLabel } from "./admin-shell-config";

export function AdminShellBreadcrumbs() {
  const pathname = usePathname();
  const currentLabel = getAdminBreadcrumbLabel(pathname);
  const isHome = pathname === "/admin";

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          {isHome ? <BreadcrumbPage>Home</BreadcrumbPage> : <BreadcrumbLink href="/admin">Home</BreadcrumbLink>}
        </BreadcrumbItem>
        {!isHome && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{currentLabel ?? ADMIN_BREADCRUMB_LABELS["/admin"]}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
