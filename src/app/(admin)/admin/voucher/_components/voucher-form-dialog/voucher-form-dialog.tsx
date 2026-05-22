"use client";

import { useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useAction } from "next-safe-action/hooks";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createVoucherAction, updateVoucherAction } from "@/modules/admin/vouchers/actions";
import { voucherFormSchema } from "@/modules/vouchers/schemas";

import { ADMIN_VOUCHER_QUERY_KEY } from "../voucher-query";
import { VoucherFormFields } from "./voucher-form-fields";
import { getDefaultVoucherFormValues, type VoucherFormDialogValues } from "./voucher-form-dialog-types";

import type { VoucherPackageOption } from "@/modules/admin/vouchers/types";
import type { VoucherFormDialogState } from "../voucher-page-types";

type AdminVoucherFormDialogProps = {
  dialogState: VoucherFormDialogState;
  onOpenChange: (open: boolean) => void;
  packageOptions: VoucherPackageOption[];
};

function getActionFormError(result: {
  serverError?: string;
  validationErrors?: {
    formErrors?: string[];
  };
}) {
  return result.validationErrors?.formErrors?.[0] ?? result.serverError ?? null;
}

export function AdminVoucherFormDialog({ dialogState, onOpenChange, packageOptions }: AdminVoucherFormDialogProps) {
  const queryClient = useQueryClient();
  const createMutation = useAction(createVoucherAction);
  const updateMutation = useAction(updateVoucherAction);
  const activeRow = dialogState.mode === "edit" ? dialogState.row : null;
  const form = useForm<VoucherFormDialogValues>({
    defaultValues: getDefaultVoucherFormValues(activeRow),
    resolver: zodResolver(voucherFormSchema),
  });

  useEffect(() => {
    if (!dialogState.open) {
      return;
    }

    form.reset(getDefaultVoucherFormValues(activeRow));
  }, [activeRow, dialogState.open, form]);

  const isEditMode = dialogState.mode === "edit";
  const isPending = createMutation.isPending || updateMutation.isPending;

  async function handleSubmitVoucher(values: VoucherFormDialogValues) {
    const payload = {
      code: values.code,
      discountPercent: Number(values.discountPercent),
      expiresAt: values.expiresAt ?? null,
      isActive: values.isActive,
      maxUses: values.maxUses === null ? null : Number(values.maxUses),
      packageId: values.scopeType === "package" ? values.packageId : null,
      scopeType: values.scopeType,
    };

    const result = isEditMode
      ? await updateMutation.executeAsync({
          ...payload,
          id: dialogState.row.id,
        })
      : await createMutation.executeAsync(payload);

    const formError = getActionFormError(result);

    if (formError) {
      toast.error(formError);
      return;
    }

    if (!result.data?.ok) {
      toast.error(result.data?.message ?? "Failed to save voucher.");
      return;
    }

    toast.success(isEditMode ? "Voucher updated." : "Voucher created.");
    await queryClient.invalidateQueries({ queryKey: ADMIN_VOUCHER_QUERY_KEY });
    onOpenChange(false);
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={dialogState.open}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Voucher" : "Create Voucher"}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update voucher code, scope, expiry, and usage rules without leaving the admin dashboard."
              : "Create a new voucher for the member checkout catalog with a clear scope and usage limit."}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" noValidate onSubmit={form.handleSubmit(handleSubmitVoucher)}>
          <VoucherFormFields form={form} packageOptions={packageOptions} />

          <DialogFooter>
            <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
              Cancel
            </Button>
            <Button disabled={isPending} type="submit">
              {isEditMode ? "Save Changes" : "Create Voucher"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
