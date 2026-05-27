"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Package2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon } from "@/components/ui/input-group";
import type { ConsoleState } from "@/modules/console/types";
import type { MemberPurchasablePackage } from "@/modules/packages/types";

const consoleExtendFormSchema = z.object({
  packageId: z.string({ error: "Package wajib dipilih." }).trim().min(1, "Package wajib dipilih."),
});

type ConsoleExtendDialogProps = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  packages: MemberPurchasablePackage[];
  state: ConsoleState;
};

function formatAmount(amountRp: number) {
  return `Rp${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(amountRp)}`;
}

function getDialogCopy(state: ConsoleState) {
  if (state === "active" || state === "processed") {
    return {
      description: "Pilih package aktif untuk memperpanjang atau mengganti subscription yang sedang berjalan.",
      title: "Perpanjang langganan",
    };
  }

  return {
    description: "Pilih salah satu package aktif untuk memulai pembelian melalui checkout QRIS.",
    title: "Pilih package aktif",
  };
}

export function ConsoleExtendDialog({ onOpenChange, open, packages, state }: ConsoleExtendDialogProps) {
  const dialogCopy = getDialogCopy(state);
  const router = useRouter();
  const form = useForm<z.infer<typeof consoleExtendFormSchema>>({
    defaultValues: {
      packageId: packages[0]?.packageId ?? "",
    },
    resolver: zodResolver(consoleExtendFormSchema),
    shouldFocusError: true,
  });
  const selectedPackageId = form.watch("packageId");
  const selectedPackage = packages.find((item) => item.packageId === selectedPackageId) ?? null;

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);

    if (!nextOpen) {
      form.reset({ packageId: packages[0]?.packageId ?? "" });
    }
  }

  function handleSubmitExtend(values: z.infer<typeof consoleExtendFormSchema>) {
    const parsedValues = consoleExtendFormSchema.parse(values);
    onOpenChange(false);
    router.push(`/checkout?packageId=${parsedValues.packageId}`);
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{dialogCopy.title}</DialogTitle>
          <DialogDescription>{dialogCopy.description}</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-5" noValidate onSubmit={form.handleSubmit(handleSubmitExtend)}>
          <FieldGroup className="gap-4">
            <Controller
              control={form.control}
              name="packageId"
              render={({ field, fieldState }) => (
                <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="console-package-picker">Pilih package aktif</FieldLabel>
                  <InputGroup data-disabled={packages.length === 0}>
                    <InputGroupAddon>
                      <Package2 />
                    </InputGroupAddon>
                    <select
                      {...field}
                      aria-invalid={fieldState.invalid}
                      className="h-9 w-full appearance-none bg-transparent pr-3 text-sm outline-none disabled:pointer-events-none"
                      disabled={packages.length === 0}
                      id="console-package-picker"
                    >
                      {packages.map((item) => (
                        <option key={item.packageId} value={item.packageId}>
                          {item.name} - {formatAmount(item.amountRp)}
                        </option>
                      ))}
                    </select>
                  </InputGroup>
                  <FieldDescription>
                    Hanya package yang masih aktif untuk pembelian baru yang ditampilkan di sini.
                  </FieldDescription>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            {selectedPackage ? (
              <div className="rounded-lg border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{selectedPackage.name}</p>
                <p className="mt-1">
                  {selectedPackage.durationDays} hari, {selectedPackage.summary} access,{" "}
                  {formatAmount(selectedPackage.amountRp)}
                </p>
              </div>
            ) : null}
          </FieldGroup>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
              Batal
            </Button>
            <Button disabled={packages.length === 0} type="submit">
              <ArrowRight data-icon="inline-end" />
              Lanjut ke checkout
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
