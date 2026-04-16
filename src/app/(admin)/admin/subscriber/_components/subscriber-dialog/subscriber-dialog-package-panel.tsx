"use client";

import { Controller, type Control } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
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
import { CalendarClock, Package2 } from "lucide-react";

import type { SubscriberPackageOption } from "@/modules/admin/subscriptions/types";

type SubscriberDialogPackagePanelProps = {
  control: Control<{
    userId: string;
    packageId: string;
    durationDays: number;
    manualAssignmentsByAccessKey: Record<string, string | null>;
  }>;
  packageOptions: SubscriberPackageOption[];
  selectedPackage: SubscriberPackageOption | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

export function SubscriberDialogPackagePanel({
  control,
  packageOptions,
  selectedPackage,
}: SubscriberDialogPackagePanelProps) {
  return (
    <FieldGroup className="gap-4">
      <Controller
        control={control}
        name="packageId"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="subscriber-package">Package</FieldLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger aria-invalid={fieldState.invalid} className="w-full" id="subscriber-package">
                <Package2 className="text-muted-foreground" />
                <SelectValue placeholder="Select package" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Active Packages</SelectLabel>
                  {packageOptions.map((packageOption) => (
                    <SelectItem key={packageOption.packageId} value={packageOption.packageId}>
                      {packageOption.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
          </Field>
        )}
      />

      <Controller
        control={control}
        name="durationDays"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="subscriber-duration-days">Duration Days</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <CalendarClock />
              </InputGroupAddon>
              <InputGroupInput
                aria-invalid={fieldState.invalid}
                id="subscriber-duration-days"
                type="number"
                min={1}
                value={Number.isFinite(field.value) ? field.value : ""}
                onChange={(event) => field.onChange(Number(event.target.value))}
              />
            </InputGroup>
            <FieldDescription>Override the package duration with a positive integer.</FieldDescription>
            {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
          </Field>
        )}
      />

      {selectedPackage ? (
        <div className="rounded-lg border p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Rp {formatCurrency(selectedPackage.amountRp)}</Badge>
            <Badge variant="outline">Default {selectedPackage.durationDays} days</Badge>
            <Badge variant="outline">{selectedPackage.isExtended ? "Can extend" : "Replace only"}</Badge>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedPackage.accessKeys.map((accessKey) => (
              <Badge key={accessKey} variant="outline">
                {accessKey}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}
    </FieldGroup>
  );
}
