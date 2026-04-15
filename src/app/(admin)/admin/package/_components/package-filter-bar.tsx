"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  onPageSizeChange: (pageSize: number) => void;
  onSearchChange: (search: string) => void;
  onSummaryChange: (summary: PackageSummary | null) => void;
  pageSizeValue: number;
  searchValue: string;
  summaryValue: PackageSummary | null;
};

export function AdminPackageFilterBar({
  pageSizeValue,
  searchValue,
  summaryValue,
  onPageSizeChange,
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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative w-full max-w-lg">
        <Input
          aria-label="Search package by name"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search package name"
          value={searchValue}
        />
        {searchValue ? (
          <Button
            aria-label="Clear search"
            className="absolute top-1 right-1"
            onClick={() => onSearchChange("")}
            size="icon-xs"
            type="button"
            variant="ghost"
          >
            <X />
          </Button>
        ) : null}
      </div>
      <Select
        onValueChange={(value) => onSummaryChange(value === "all" ? null : parseSummaryValue(value))}
        value={summaryValue ?? "all"}
      >
        <SelectTrigger aria-label="Filter package summary" className="w-full sm:w-44">
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

      <Select onValueChange={(value) => onPageSizeChange(Number.parseInt(value, 10))} value={String(pageSizeValue)}>
        <SelectTrigger aria-label="Rows per page" className="w-full sm:w-36">
          <SelectValue placeholder="Rows" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Rows</SelectLabel>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="50">50</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
