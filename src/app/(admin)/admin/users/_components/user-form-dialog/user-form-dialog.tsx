"use client";

import { useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useAction } from "next-safe-action/hooks";
import { LockKeyhole, Mail, Shield } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
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
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createUserAction } from "@/modules/users/actions";
import { adminCreateUserSchema, type AdminCreateUserValues } from "@/modules/users/schemas";

import {
  getAdminUsersActionMessage,
  isAdminUsersTableQueryKey,
  shouldAllowAdminUsersDialogOpenChange,
} from "../users-action-feedback";

type UserFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const DEFAULT_VALUES: AdminCreateUserValues = {
  confirmPassword: "",
  email: "",
  password: "",
  role: "member",
};

export function UserFormDialog({ open, onOpenChange }: UserFormDialogProps) {
  const queryClient = useQueryClient();
  const createMutation = useAction(createUserAction);
  const form = useForm<AdminCreateUserValues>({
    defaultValues: DEFAULT_VALUES,
    resolver: zodResolver(adminCreateUserSchema),
  });

  useEffect(() => {
    if (!open) {
      form.reset(DEFAULT_VALUES);
    }
  }, [form, open]);

  function handleOpenChange(nextOpen: boolean) {
    if (!shouldAllowAdminUsersDialogOpenChange(nextOpen, createMutation.isPending)) {
      return;
    }

    onOpenChange(nextOpen);
  }

  async function onSubmitCreateUser(values: AdminCreateUserValues) {
    const result = await createMutation.executeAsync(values);
    const passwordError = result.validationErrors?.fieldErrors?.password?.[0];
    const confirmPasswordError = result.validationErrors?.fieldErrors?.confirmPassword?.[0];

    if (passwordError) {
      form.setError("password", { message: passwordError, type: "server" });
    }

    if (confirmPasswordError) {
      form.setError("confirmPassword", { message: confirmPasswordError, type: "server" });
    }

    if (passwordError || confirmPasswordError) {
      return;
    }

    if (!result.data?.ok) {
      toast.error(getAdminUsersActionMessage(result ?? {}) ?? "Failed to create user.");
      return;
    }

    toast.success("User created.");
    await queryClient.invalidateQueries({ predicate: (query) => isAdminUsersTableQueryKey(query.queryKey) });
    form.reset(DEFAULT_VALUES);
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-border/70 p-0 sm:max-w-lg">
        <div className="border-b border-border/60 px-4 py-4 sm:px-6 sm:py-5">
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription>Create a new loginable admin or member account.</DialogDescription>
          </DialogHeader>
        </div>

        <form className="px-4 py-4 sm:px-6 sm:py-5" noValidate onSubmit={form.handleSubmit(onSubmitCreateUser)}>
          <FieldGroup className="gap-4">
            <Field data-invalid={form.formState.errors.email ? true : undefined}>
              <FieldLabel htmlFor="create-user-email">Email</FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <Mail />
                </InputGroupAddon>
                <InputGroupInput
                  {...form.register("email")}
                  aria-invalid={form.formState.errors.email ? true : undefined}
                  autoComplete="email"
                  id="create-user-email"
                  placeholder="name@example.com"
                />
              </InputGroup>
              <FieldError errors={[form.formState.errors.email]} />
            </Field>

            <Controller
              control={form.control}
              name="role"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid ? true : undefined}>
                  <FieldLabel htmlFor="create-user-role">Role</FieldLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger aria-invalid={fieldState.invalid} className="w-full" id="create-user-role">
                      <Shield data-icon="inline-start" />
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Role</SelectLabel>
                        <SelectItem value="member">member</SelectItem>
                        <SelectItem value="admin">admin</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Field data-invalid={form.formState.errors.password ? true : undefined}>
              <FieldLabel htmlFor="create-user-password">Password</FieldLabel>
              <PasswordInput
                {...form.register("password")}
                aria-invalid={form.formState.errors.password ? true : undefined}
                autoComplete="new-password"
                id="create-user-password"
                leadingIcon={<LockKeyhole />}
                placeholder="Minimum 6 characters"
              />
              <FieldError errors={[form.formState.errors.password]} />
            </Field>

            <Field data-invalid={form.formState.errors.confirmPassword ? true : undefined}>
              <FieldLabel htmlFor="create-user-confirm-password">Confirm Password</FieldLabel>
              <PasswordInput
                {...form.register("confirmPassword")}
                aria-invalid={form.formState.errors.confirmPassword ? true : undefined}
                autoComplete="new-password"
                id="create-user-confirm-password"
                leadingIcon={<LockKeyhole />}
                placeholder="Repeat the password"
              />
              <FieldError errors={[form.formState.errors.confirmPassword]} />
            </Field>
          </FieldGroup>

          <DialogFooter className="mt-6 border-t border-border/60 px-0 pt-4">
            <Button
              disabled={createMutation.isPending}
              onClick={() => handleOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={createMutation.isPending} type="submit">
              Create User
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
