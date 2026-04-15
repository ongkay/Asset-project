"use client";

import type { ComponentType } from "react";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AdminTableFilterSelectOption<TValue extends string> = {
  label: string;
  value: TValue;
};

type AdminTableFilterSelectProps<TValue extends string> = {
  allLabel?: string;
  ariaLabel: string;
  className?: string;
  icon: ComponentType;
  label: string;
  onChange: (value: TValue | null) => void;
  options: AdminTableFilterSelectOption<TValue>[];
  value: TValue | null;
};

export function AdminTableFilterSelect<TValue extends string>({
  allLabel = "All",
  ariaLabel,
  className = "w-full sm:w-44",
  icon: Icon,
  label,
  onChange,
  options,
  value,
}: AdminTableFilterSelectProps<TValue>) {
  return (
    <Select
      onValueChange={(nextValue) => onChange(nextValue === "all" ? null : (nextValue as TValue))}
      value={value ?? "all"}
    >
      <SelectTrigger aria-label={ariaLabel} className={className} size="sm">
        <Icon />
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>{label}</SelectLabel>
          <SelectItem value="all">{allLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
