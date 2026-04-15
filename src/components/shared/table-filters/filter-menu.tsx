"use client";

import type { ComponentType } from "react";

import { ChevronDownIcon, ListFilter, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type AdminTableGroupedFilterOption<TValue extends string> = {
  label: string;
  value: TValue;
};

type AdminTableGroupedFilterGroup<TValue extends string> = {
  key: string;
  label: string;
  onSelectedValuesChange: (values: TValue[]) => void;
  options: AdminTableGroupedFilterOption<TValue>[];
  selectedValues: TValue[];
};

type AdminTableGroupedFilterMenuProps<TValue extends string> = {
  groups: AdminTableGroupedFilterGroup<TValue>[];
  icon?: ComponentType;
  label?: string;
  onClearFilters: () => void;
};

function toggleSelectedValue<TValue extends string>(selectedValues: TValue[], value: TValue, checked: boolean) {
  if (checked) {
    return selectedValues.includes(value) ? selectedValues : [...selectedValues, value];
  }

  return selectedValues.filter((selectedValue) => selectedValue !== value);
}

export function AdminTableGroupedFilterMenu<TValue extends string>({
  groups,
  icon: Icon = ListFilter,
  label = "Filter",
  onClearFilters,
}: AdminTableGroupedFilterMenuProps<TValue>) {
  const activeFilterCount = groups.reduce((total, group) => total + group.selectedValues.length, 0);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="w-full sm:w-auto" size="sm" type="button" variant="outline">
          <Icon data-icon="inline-start" />
          {activeFilterCount > 0 ? `${label} ${activeFilterCount}` : label}
          <ChevronDownIcon data-icon="inline-end" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        {groups.map((group, groupIndex) => (
          <DropdownMenuGroup key={group.key}>
            {groupIndex > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
            {group.options.map((option) => (
              <DropdownMenuCheckboxItem
                checked={group.selectedValues.includes(option.value)}
                key={option.value}
                onCheckedChange={(checked) =>
                  group.onSelectedValuesChange(
                    toggleSelectedValue(group.selectedValues, option.value, Boolean(checked)),
                  )
                }
                onSelect={(event) => event.preventDefault()}
              >
                {option.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuGroup>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={activeFilterCount === 0} onClick={onClearFilters}>
          <X data-icon="inline-start" />
          Clear filters
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
