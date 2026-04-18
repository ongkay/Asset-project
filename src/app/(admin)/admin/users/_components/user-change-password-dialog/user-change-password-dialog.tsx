"use client";

import { useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { LockKeyhole } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { changeUserPasswordAction } from "@/modules/auth/actions";

import { getAdminUsersActionMessage, shouldAllowAdminUsersDialogOpenChange } from "../users-action-feedback";
import { userChangePasswordFormSchema } from "./user-change-password-form-schema";

type UserChangePasswordDialogProps = {
  open: boolean;
  userId: string | null;
  onOpenChange: (open: boolean) => void;
};

type UserChangePasswordValues = {
  confirmPassword: string;
  newPassword: string;
};

const DEFAULT_VALUES: UserChangePasswordValues = {
  confirmPassword: "",
  newPassword: "",
};

export function UserChangePasswordDialog({ open, userId, onOpenChange }: UserChangePasswordDialogProps) {
  const passwordMutation = useAction(changeUserPasswordAction);
  const form = useForm<UserChangePasswordValues>({
    defaultValues: DEFAULT_VALUES,
    resolver: zodResolver(userChangePasswordFormSchema),
  });

  useEffect(() => {
    if (!open) {
      form.reset(DEFAULT_VALUES);
    }
  }, [form, open]);

  function handleOpenChange(nextOpen: boolean) {
    if (!shouldAllowAdminUsersDialogOpenChange(nextOpen, passwordMutation.isPending)) {
      return;
    }

    onOpenChange(nextOpen);
  }

  async function onSubmitChangePassword(values: UserChangePasswordValues) {
    if (!userId) {
      return;
    }

    const result = await passwordMutation.executeAsync({
      ...values,
      userId,
    });
    const newPasswordError = result.validationErrors?.fieldErrors?.newPassword?.[0];
    const confirmPasswordError = result.validationErrors?.fieldErrors?.confirmPassword?.[0];

    if (newPasswordError) {
      form.setError("newPassword", { message: newPasswordError, type: "server" });
    }

    if (confirmPasswordError) {
      form.setError("confirmPassword", { message: confirmPasswordError, type: "server" });
    }

    if (newPasswordError || confirmPasswordError) {
      return;
    }

    if (!result.data?.ok) {
      toast.error(getAdminUsersActionMessage(result ?? {}) ?? "Failed to update user password.");
      return;
    }

    toast.success("Password updated.");
    form.reset(DEFAULT_VALUES);
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="border-border/70 p-0 sm:max-w-lg">
        <div className="border-b border-border/60 px-4 py-4 sm:px-6 sm:py-5">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>Set a new password for the selected user account.</DialogDescription>
          </DialogHeader>
        </div>

        <form className="px-4 py-4 sm:px-6 sm:py-5" noValidate onSubmit={form.handleSubmit(onSubmitChangePassword)}>
          <FieldGroup className="gap-4">
            <Field data-invalid={form.formState.errors.newPassword ? true : undefined}>
              <FieldLabel htmlFor="change-user-password">New Password</FieldLabel>
              <PasswordInput
                {...form.register("newPassword")}
                aria-invalid={form.formState.errors.newPassword ? true : undefined}
                autoComplete="new-password"
                id="change-user-password"
                leadingIcon={<LockKeyhole />}
                placeholder="Minimum 6 characters"
              />
              <FieldError errors={[form.formState.errors.newPassword]} />
            </Field>

            <Field data-invalid={form.formState.errors.confirmPassword ? true : undefined}>
              <FieldLabel htmlFor="change-user-confirm-password">Confirm Password</FieldLabel>
              <PasswordInput
                {...form.register("confirmPassword")}
                aria-invalid={form.formState.errors.confirmPassword ? true : undefined}
                autoComplete="new-password"
                id="change-user-confirm-password"
                leadingIcon={<LockKeyhole />}
                placeholder="Repeat the new password"
              />
              <FieldError errors={[form.formState.errors.confirmPassword]} />
            </Field>
          </FieldGroup>

          <DialogFooter className="mt-6 border-t border-border/60 px-0 pt-4">
            <Button
              disabled={passwordMutation.isPending}
              onClick={() => handleOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={passwordMutation.isPending || !userId} type="submit">
              Save Password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
