"use client";

import { ListFilter, Search, X } from "lucide-react";

import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { PackageSummary } from "@/modules/packages/types";

type AdminPackageFilterBarProps = {
  onSearchChange: (search: string) => void;
  onSummaryChange: (summary: PackageSummary | null) => void;
  searchValue: string;
  summaryValue: PackageSummary | null;
};

export function AdminPackageFilterBar({
  searchValue,
  summaryValue,
  onSearchChange,
  onSummaryChange,
}: AdminPackageFilterBarProps) {
  function parseSummaryValue(value: string): PackageSummary | null {
    if (value === "private" || value === "share" || value === "mixed") {
      return value;
    }

    return null;
  }

  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center @3xl/main:max-w-2xl">
      <InputGroup className="w-full sm:min-w-72">
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupInput
          aria-label="Search package by name"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search package name"
          value={searchValue}
        />
        {searchValue ? (
          <InputGroupAddon align="inline-end">
            <InputGroupButton aria-label="Clear search" onClick={() => onSearchChange("")} size="icon-xs">
              <X />
            </InputGroupButton>
          </InputGroupAddon>
        ) : null}
      </InputGroup>
      <Select
        onValueChange={(value) => onSummaryChange(value === "all" ? null : parseSummaryValue(value))}
        value={summaryValue ?? "all"}
      >
        <SelectTrigger aria-label="Filter package summary" className="w-full sm:w-44" size="sm">
          <ListFilter />
          <SelectValue placeholder="Summary" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Summary</SelectLabel>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="private">Private</SelectItem>
            <SelectItem value="share">Share</SelectItem>
            <SelectItem value="mixed">Mixed</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
