"use client";

import { useRouter } from "next/navigation";

import { MoreHorizontal } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { togglePackageActiveAction } from "@/modules/packages/actions";
import type { PackageAdminRow } from "@/modules/packages/types";

type AdminPackageRowActionsProps = {
  onEditPackage: (packageId: string) => void;
  row: PackageAdminRow;
};

export function AdminPackageRowActions({ row, onEditPackage }: AdminPackageRowActionsProps) {
  const router = useRouter();
  const toggleMutation = useAction(togglePackageActiveAction);

  const isToggling = toggleMutation.isPending;

  async function handleTogglePackageActive() {
    const result = await toggleMutation.executeAsync({
      id: row.id,
      isActive: !row.isActive,
    });

    if (result.validationErrors?.formErrors?.[0]) {
      toast.error(result.validationErrors.formErrors[0]);
      return;
    }

    if (!result.data?.ok) {
      toast.error(result.data?.message ?? "Failed to update package status.");
      return;
    }

    toast.success(`Package ${result.data.row.isActive ? "enabled" : "disabled"}.`);
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label={`Open actions for ${row.name}`} size="icon-sm" type="button" variant="ghost">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuGroup>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              onEditPackage(row.id);
            }}
          >
            Edit Package
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={isToggling}
          onSelect={(event) => {
            event.preventDefault();
            void handleTogglePackageActive();
          }}
        >
          {row.isActive ? "Disable" : "Enable"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
