"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, KeyRound, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { redeemCdKeyAction } from "@/modules/cdkeys/actions";
import { redeemCdKeySchema } from "@/modules/cdkeys/schemas";

import { MEMBER_PAGE_CONTENT } from "./member-page-content";

type MemberRedeemDialogProps = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

type MemberRedeemSuccessRouter = {
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

export function applySuccessfulMemberRedeemMutation(input: {
  onOpenChange: (open: boolean) => void;
  queueRouteRefresh?: (refresh: () => void) => void;
  resetDialogState: () => void;
  router: MemberRedeemSuccessRouter;
  showSuccessToast: (message: string) => void;
}) {
  input.resetDialogState();
  input.onOpenChange(false);
  input.showSuccessToast(MEMBER_PAGE_CONTENT.redeemDialog.successToast);
  const queueRouteRefresh = input.queueRouteRefresh ?? ((refresh: () => void) => window.setTimeout(refresh, 150));
  queueRouteRefresh(() => input.router.refresh());
}

export function MemberRedeemDialog({ onOpenChange, open }: MemberRedeemDialogProps) {
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

  function closeDialog() {
    resetDialogState();
    onOpenChange(false);
  }

  async function handleRedeemVoucher(values: { code: string }) {
    form.clearErrors("root");
    const result = await redeemMutation.executeAsync(values);
    const formError = getActionFormError(result ?? {});

    if (isGuardFailure(formError)) {
      closeDialog();
      router.refresh();
      return;
    }

    if (formError) {
      form.setError("root", { message: formError, type: "server" });
      return;
    }

    if (result.data?.ok) {
      applySuccessfulMemberRedeemMutation({
        onOpenChange,
        queueRouteRefresh: (refresh) => window.setTimeout(refresh, 150),
        resetDialogState,
        router,
        showSuccessToast: toast.success,
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
      <DialogContent
        className="w-[calc(100%-32px)] max-w-[420px] rounded-2xl border border-white/8 bg-[#171b24] p-7 text-[#f8fafc] shadow-[0_30px_80px_rgba(0,0,0,0.32)] sm:p-9"
        showCloseButton={false}
      >
        <Button
          className="absolute right-6 top-6 size-8 rounded-lg border border-white/10 bg-white/5 text-[#a7afbd] hover:bg-white/10 hover:text-white focus-visible:border-white/10 focus-visible:ring-cyan-400/25"
          onClick={closeDialog}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <X />
          <span className="sr-only">Tutup modal</span>
        </Button>
        <DialogHeader className="gap-0">
          <DialogTitle className="mb-2 text-[20px] font-bold tracking-[-0.01em] text-white">
            {MEMBER_PAGE_CONTENT.redeemDialog.title}
          </DialogTitle>
          <DialogDescription className="mb-7 text-[13px] leading-6 text-[#7b8190]">
            {MEMBER_PAGE_CONTENT.redeemDialog.description}
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-5" noValidate onSubmit={form.handleSubmit(handleRedeemVoucher)}>
          <FieldGroup className="gap-4">
            <Controller
              control={form.control}
              name="code"
              render={({ field, fieldState }) => (
                <Field className="gap-2.5" data-invalid={fieldState.invalid}>
                  <FieldLabel className="text-[12px] font-semibold text-[#a7afbd]" htmlFor="member-redeem-code">
                    {MEMBER_PAGE_CONTENT.redeemDialog.fieldLabel}
                  </FieldLabel>
                  <InputGroup className="h-[46px] rounded-lg border-white/10 bg-[rgba(16,21,29,0.8)] text-white has-[[data-slot=input-group-control]:focus-visible]:border-cyan-400 has-[[data-slot=input-group-control]:focus-visible]:ring-3 has-[[data-slot=input-group-control]:focus-visible]:ring-cyan-400/12 has-[[data-slot][aria-invalid=true]]:border-red-500 has-[[data-slot][aria-invalid=true]]:ring-3 has-[[data-slot][aria-invalid=true]]:ring-red-500/12">
                    <InputGroupAddon className="pl-3 text-[#a7afbd]">
                      <KeyRound />
                    </InputGroupAddon>
                    <InputGroupInput
                      {...field}
                      aria-invalid={fieldState.invalid}
                      autoCapitalize="characters"
                      autoCorrect="off"
                      id="member-redeem-code"
                      placeholder={MEMBER_PAGE_CONTENT.redeemDialog.placeholder}
                      spellCheck={false}
                      className="h-[46px] px-0 text-[14px] text-white placeholder:text-[#a7afbd]/50"
                    />
                  </InputGroup>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            {actionMessage ? (
              <p className="text-[12px] font-medium text-red-400" role="alert">
                {actionMessage}
              </p>
            ) : null}
          </FieldGroup>
          <div className="flex gap-3">
            <Button
              className="h-[46px] flex-1 border-[#2b313d] bg-transparent font-bold text-[#a7afbd] hover:bg-white/5 hover:text-white"
              onClick={closeDialog}
              type="button"
              variant="outline"
            >
              {MEMBER_PAGE_CONTENT.redeemDialog.cancelLabel}
            </Button>
            <Button
              className="h-[46px] flex-1 border border-cyan-400/50 bg-linear-to-br from-[#0072ff] to-[#00c6ff] font-bold text-white shadow-[0_4px_14px_rgba(0,114,255,0.25),inset_0_1px_1px_rgba(255,255,255,0.3)] hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(0,114,255,0.4),inset_0_1px_1px_rgba(255,255,255,0.5)]"
              disabled={redeemMutation.isPending}
              type="submit"
            >
              {redeemMutation.isPending ? <Spinner /> : <ArrowRight data-icon="inline-end" />}
              {MEMBER_PAGE_CONTENT.redeemDialog.submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
