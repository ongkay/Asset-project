"use client";

import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { AdminSortOrder } from "./types";

type AdminSortableHeaderProps<TSortKey extends string> = {
  children: string;
  onSortChange: (sortKey: TSortKey) => void;
  sortKey: TSortKey;
  sortOrder: AdminSortOrder | null;
  sortValue: TSortKey | null;
};

export function AdminSortableHeader<TSortKey extends string>({
  children,
  sortKey,
  sortOrder,
  sortValue,
  onSortChange,
}: AdminSortableHeaderProps<TSortKey>) {
  const isActive = sortValue === sortKey;
  const SortIcon = !isActive ? ArrowUpDownIcon : sortOrder === "asc" ? ArrowUpIcon : ArrowDownIcon;

  return (
    <Button
      className="-ml-2 h-8 px-2 text-muted-foreground data-[active=true]:text-foreground"
      data-active={isActive ? "true" : undefined}
      onClick={() => onSortChange(sortKey)}
      size="sm"
      type="button"
      variant="ghost"
    >
      {children}
      <SortIcon data-icon="inline-end" />
    </Button>
  );
}
