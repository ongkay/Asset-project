"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { Controller, useForm } from "react-hook-form";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Spinner } from "@/components/ui/spinner";
import { redeemCdKeyAction } from "@/modules/cdkeys/actions";
import { redeemCdKeySchema } from "@/modules/cdkeys/schemas";

type ConsoleRedeemDialogProps = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

type ConsoleRedeemSuccessRouter = {
  refresh: () => void;
};

function getActionFormError(result: {
  serverError?: string;
  validationErrors?: {
    formErrors?: string[];
  };
}) {
  return result.validationErrors?.formErrors?.[0] ?? result.serverError ?? null;
}

function isGuardFailure(errorMessage: string | null) {
  return errorMessage === "Unauthorized." || errorMessage === "Forbidden.";
}

export function applySuccessfulRedeemMutation(input: {
  onOpenChange: (open: boolean) => void;
  resetDialogState: () => void;
  router: ConsoleRedeemSuccessRouter;
}) {
  input.resetDialogState();
  input.onOpenChange(false);
  input.router.refresh();
}

export function ConsoleRedeemDialog({ onOpenChange, open }: ConsoleRedeemDialogProps) {
  const router = useRouter();
  const redeemMutation = useAction(redeemCdKeyAction);
  const form = useForm({
    defaultValues: {
      code: "",
    },
    resolver: zodResolver(redeemCdKeySchema),
    shouldFocusError: true,
  });
  const actionMessage = form.formState.errors.root?.message ?? null;

  function resetDialogState() {
    form.reset({ code: "" });
  }

  async function handleRedeemCdKey(values: { code: string }) {
    form.clearErrors("root");
    const result = await redeemMutation.executeAsync(values);
    const formError = getActionFormError(result ?? {});

    if (isGuardFailure(formError)) {
      onOpenChange(false);
      router.refresh();
      return;
    }

    if (formError) {
      form.setError("root", { message: formError, type: "server" });
      return;
    }

    if (result.data?.ok) {
      applySuccessfulRedeemMutation({
        onOpenChange,
        resetDialogState,
        router,
      });
      return;
    }

    form.setError("root", {
      message: result.data?.message ?? "Redeem CD-Key gagal diproses. Silakan coba lagi.",
      type: "server",
    });
  }

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);

        if (!nextOpen) {
          resetDialogState();
        }
      }}
      open={open}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Redeem CD-Key</DialogTitle>
          <DialogDescription>
            Masukkan CD-Key aktif untuk mengaktifkan subscription sesuai snapshot key tersebut.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-5" noValidate onSubmit={form.handleSubmit(handleRedeemCdKey)}>
          <FieldGroup className="gap-4">
            <Controller
              control={form.control}
              name="code"
              render={({ field, fieldState }) => (
                <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="console-redeem-code">Masukkan CD-Key</FieldLabel>
                  <InputGroup>
                    <InputGroupAddon>
                      <KeyRound />
                    </InputGroupAddon>
                    <InputGroupInput
                      {...field}
                      aria-invalid={fieldState.invalid}
                      autoCapitalize="characters"
                      autoCorrect="off"
                      id="console-redeem-code"
                      placeholder="AB12CD34EF"
                      spellCheck={false}
                    />
                  </InputGroup>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            {actionMessage ? (
              <Alert variant="destructive">
                <KeyRound className="size-4" />
                <AlertTitle>Redeem belum berhasil</AlertTitle>
                <AlertDescription>{actionMessage}</AlertDescription>
              </Alert>
            ) : null}
          </FieldGroup>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
              Batal
            </Button>
            <Button disabled={redeemMutation.isPending} type="submit">
              {redeemMutation.isPending ? <Spinner /> : <ArrowRight data-icon="inline-end" />}
              Redeem sekarang
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
