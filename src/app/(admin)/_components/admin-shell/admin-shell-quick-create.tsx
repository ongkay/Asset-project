"use client";

import Link from "next/link";

import { PlusCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { ADMIN_QUICK_CREATE_ITEMS } from "./admin-shell-config";

export function AdminShellQuickCreate() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon-sm" className="sm:w-auto sm:px-2.5 sm:gap-1.5" variant="outline" aria-label="Quick create">
          <PlusCircle data-icon="inline-start" />
          <span className="hidden sm:inline">Quick Create</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Quick Create</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ADMIN_QUICK_CREATE_ITEMS.map((item, index) => (
          <DropdownMenuItem key={item.href} asChild>
            <Link prefetch={false} href={item.href}>
              <item.icon data-icon="inline-start" />
              <span>{item.label}</span>
              <DropdownMenuShortcut>
                {index === 0 ? "⌘1" : index === 1 ? "⌘2" : index === 2 ? "⌘3" : index === 3 ? "⌘4" : "⌘5"}
              </DropdownMenuShortcut>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
