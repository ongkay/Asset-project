"use client";

import { MoreHorizontal } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useQueryClient } from "@tanstack/react-query";
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
import { toggleVoucherActiveAction } from "@/modules/admin/vouchers/actions";

import { ADMIN_VOUCHER_QUERY_KEY } from "../voucher-query";

import type { VoucherAdminRow } from "@/modules/admin/vouchers/types";

type AdminVoucherRowActionsProps = {
  onEditVoucher: (row: VoucherAdminRow) => void;
  row: VoucherAdminRow;
};

export function AdminVoucherRowActions({ row, onEditVoucher }: AdminVoucherRowActionsProps) {
  const queryClient = useQueryClient();
  const toggleMutation = useAction(toggleVoucherActiveAction);

  async function handleToggleVoucherActive() {
    const result = await toggleMutation.executeAsync({
      id: row.id,
      isActive: !row.isActive,
    });

    if (result.validationErrors?.formErrors?.[0]) {
      toast.error(result.validationErrors.formErrors[0]);
      return;
    }

    if (!result.data?.ok) {
      toast.error(result.data?.message ?? "Failed to update voucher status.");
      return;
    }

    toast.success(`Voucher ${result.data.row.isActive ? "activated" : "deactivated"}.`);
    await queryClient.invalidateQueries({ queryKey: ADMIN_VOUCHER_QUERY_KEY });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label={`Open actions for ${row.code}`} size="icon-sm" type="button" variant="ghost">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuGroup>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              onEditVoucher(row);
            }}
          >
            Edit Voucher
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={toggleMutation.isPending}
          onSelect={(event) => {
            event.preventDefault();
            void handleToggleVoucherActive();
          }}
        >
          {row.isActive ? "Deactivate" : "Activate"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
