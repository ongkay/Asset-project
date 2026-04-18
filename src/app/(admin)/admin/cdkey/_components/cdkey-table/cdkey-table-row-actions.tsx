"use client";

import { useState } from "react";

import { Eye, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { CdKeyAdminRow } from "@/modules/admin/cdkeys/types";

type AdminCdKeyTableRowActionsProps = {
  row: CdKeyAdminRow;
  onOpenDetails: (row: CdKeyAdminRow) => void;
};

export function AdminCdKeyTableRowActions({ row, onOpenDetails }: AdminCdKeyTableRowActionsProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <DropdownMenu onOpenChange={setIsMenuOpen} open={isMenuOpen}>
      <DropdownMenuTrigger asChild>
        <Button aria-label={`Open actions for CD-Key ${row.code}`} size="icon-sm" type="button" variant="ghost">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuGroup>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              setIsMenuOpen(false);
              onOpenDetails(row);
            }}
          >
            <Eye data-icon="inline-start" />
            View Detail
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
