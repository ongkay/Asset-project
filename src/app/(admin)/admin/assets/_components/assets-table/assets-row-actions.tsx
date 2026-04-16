"use client";

import { useState } from "react";

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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteAssetAction, toggleAssetDisabledAction } from "@/modules/assets/actions";

import { ADMIN_ASSET_QUERY_KEY } from "../assets-query";

import type { AssetAdminRow } from "@/modules/admin/assets/types";

type AdminAssetsRowActionsProps = {
  row: AssetAdminRow;
  onEditAsset: (assetId: string) => void;
  onOpenDetails: (assetId: string) => void;
};

export function AdminAssetsRowActions({ row, onEditAsset, onOpenDetails }: AdminAssetsRowActionsProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const toggleMutation = useAction(toggleAssetDisabledAction);
  const deleteMutation = useAction(deleteAssetAction);

  async function handleToggleDisabled() {
    const result = await toggleMutation.executeAsync({
      id: row.id,
      disabled: row.disabledAt === null,
    });

    const validationError = result.validationErrors?.formErrors?.[0];

    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (!result.data?.ok) {
      toast.error(result.data?.message ?? "Failed to update asset state.");
      return;
    }

    toast.success(row.disabledAt ? "Asset enabled." : "Asset disabled.");
    await queryClient.invalidateQueries({ queryKey: ADMIN_ASSET_QUERY_KEY });
  }

  async function handleDeleteAsset() {
    const result = await deleteMutation.executeAsync({ id: row.id });
    const validationError = result.validationErrors?.formErrors?.[0];

    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (!result.data?.ok) {
      toast.error(result.data?.message ?? "Failed to delete asset.");
      return;
    }

    toast.success("Asset deleted.");
    await queryClient.invalidateQueries({ queryKey: ADMIN_ASSET_QUERY_KEY });
    setIsDeleteDialogOpen(false);
  }

  return (
    <>
      <DropdownMenu onOpenChange={setIsMenuOpen} open={isMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button aria-label={`Open actions for asset ${row.id}`} size="icon-sm" type="button" variant="ghost">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuGroup>
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                setIsMenuOpen(false);
                onOpenDetails(row.id);
              }}
            >
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                setIsMenuOpen(false);
                onEditAsset(row.id);
              }}
            >
              Edit Asset
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={toggleMutation.isPending}
            onSelect={(event) => {
              event.preventDefault();
              setIsMenuOpen(false);
              void handleToggleDisabled();
            }}
          >
            {row.disabledAt ? "Enable" : "Disable"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              setIsMenuOpen(false);
              setIsDeleteDialogOpen(true);
            }}
          >
            <span className="text-destructive">Delete Asset</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this asset?</AlertDialogTitle>
            <AlertDialogDescription>
              Asset will be deleted via safe-delete flow and active assignments will be re-evaluated server-side.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteAsset();
              }}
              variant="destructive"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
