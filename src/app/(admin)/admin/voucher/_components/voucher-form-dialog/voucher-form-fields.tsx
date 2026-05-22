"use client";

import { BadgePercent, CalendarClock, Hash, Package2, Tag, TicketPercent } from "lucide-react";
import { Controller, type UseFormReturn, useWatch } from "react-hook-form";

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
import { Switch } from "@/components/ui/switch";

import type { VoucherPackageOption } from "@/modules/admin/vouchers/types";
import type { VoucherFormDialogValues } from "./voucher-form-dialog-types";

type VoucherFormFieldsProps = {
  form: UseFormReturn<VoucherFormDialogValues>;
  packageOptions: VoucherPackageOption[];
};

export function VoucherFormFields({ form, packageOptions }: VoucherFormFieldsProps) {
  const selectedScopeType = useWatch({ control: form.control, name: "scopeType" });
  const selectedPackageId = useWatch({ control: form.control, name: "packageId" });
  const selectedPackage = packageOptions.find((packageOption) => packageOption.packageId === selectedPackageId) ?? null;

  return (
    <FieldGroup className="gap-4">
      <Controller
        control={form.control}
        name="code"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="voucher-code">Voucher Code</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <TicketPercent />
              </InputGroupAddon>
              <InputGroupInput {...field} aria-invalid={fieldState.invalid} id="voucher-code" placeholder="VIP15" />
            </InputGroup>
            <FieldDescription>Code is uppercase on save and can be edited later.</FieldDescription>
            {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
          </Field>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Controller
          control={form.control}
          name="scopeType"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="voucher-scope-type">Scope</FieldLabel>
              <Select
                onValueChange={(nextScopeType) => {
                  field.onChange(nextScopeType);
                  if (nextScopeType === "global") {
                    form.setValue("packageId", null, { shouldDirty: true, shouldValidate: true });
                  }
                  field.onBlur();
                }}
                value={field.value}
              >
                <SelectTrigger
                  aria-invalid={fieldState.invalid}
                  className="w-full"
                  id="voucher-scope-type"
                  onBlur={field.onBlur}
                  ref={field.ref}
                >
                  <Tag className="text-muted-foreground" />
                  <SelectValue placeholder="Select voucher scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Voucher Scope</SelectLabel>
                    <SelectItem value="global">Global</SelectItem>
                    <SelectItem value="package">Package</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="discountPercent"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="voucher-discount-percent">Discount Percent</FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <BadgePercent />
                </InputGroupAddon>
                <InputGroupInput
                  aria-invalid={fieldState.invalid}
                  id="voucher-discount-percent"
                  inputMode="numeric"
                  max={100}
                  min={1}
                  onChange={(event) => {
                    const nextValue = Number.isNaN(event.target.valueAsNumber) ? 1 : event.target.valueAsNumber;
                    field.onChange(nextValue);
                  }}
                  type="number"
                  value={field.value}
                />
              </InputGroup>
              {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
            </Field>
          )}
        />
      </div>

      {selectedScopeType === "package" ? (
        <Controller
          control={form.control}
          name="packageId"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="voucher-package-id">Target Package</FieldLabel>
              <Select
                onValueChange={(nextPackageId) => {
                  field.onChange(nextPackageId);
                  field.onBlur();
                }}
                value={field.value ?? ""}
              >
                <SelectTrigger
                  aria-invalid={fieldState.invalid}
                  className="w-full"
                  id="voucher-package-id"
                  onBlur={field.onBlur}
                  ref={field.ref}
                >
                  <Package2 className="text-muted-foreground" />
                  <SelectValue placeholder="Select checkout package" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Checkout Packages</SelectLabel>
                    {packageOptions.map((packageOption) => (
                      <SelectItem key={packageOption.packageId} value={packageOption.packageId}>
                        {packageOption.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldDescription>Only current checkout packages are available as voucher targets.</FieldDescription>
              {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
            </Field>
          )}
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Controller
          control={form.control}
          name="maxUses"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="voucher-max-uses">Max Uses</FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <Hash />
                </InputGroupAddon>
                <InputGroupInput
                  aria-invalid={fieldState.invalid}
                  id="voucher-max-uses"
                  inputMode="numeric"
                  min={1}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    field.onChange(nextValue.length === 0 ? null : Number(event.target.valueAsNumber));
                  }}
                  placeholder="Leave blank for unlimited"
                  type="number"
                  value={field.value ?? ""}
                />
              </InputGroup>
              <FieldDescription>Leave blank to keep the voucher unlimited.</FieldDescription>
              {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="expiresAt"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="voucher-expires-at">Expires At</FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <CalendarClock />
                </InputGroupAddon>
                <InputGroupInput
                  aria-invalid={fieldState.invalid}
                  id="voucher-expires-at"
                  onChange={(event) => field.onChange(event.target.value.length > 0 ? event.target.value : null)}
                  type="datetime-local"
                  value={field.value ?? ""}
                />
              </InputGroup>
              <FieldDescription>Leave blank if the voucher should not expire automatically.</FieldDescription>
              {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
            </Field>
          )}
        />
      </div>

      <Controller
        control={form.control}
        name="isActive"
        render={({ field }) => (
          <Field orientation="horizontal">
            <FieldLabel htmlFor="voucher-is-active">Voucher Active</FieldLabel>
            <Switch
              checked={field.value}
              id="voucher-is-active"
              onCheckedChange={(checked) => field.onChange(checked)}
            />
          </Field>
        )}
      />

      <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
        <p className="font-medium text-sm">Voucher preview</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs">Scope</p>
            <p className="font-medium text-sm capitalize">{selectedScopeType}</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs">Target Package</p>
            <p className="font-medium text-sm">{selectedPackage?.name ?? "All checkout packages"}</p>
          </div>
        </div>
      </div>
    </FieldGroup>
  );
}
