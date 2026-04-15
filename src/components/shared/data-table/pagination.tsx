"use client";

import { useId } from "react";

import { ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type AdminDataTablePaginationProps = {
  itemLabel: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  page: number;
  pageSize: number;
  pageSizeOptions?: number[];
  totalCount: number;
};

export function AdminDataTablePagination({
  itemLabel,
  onPageChange,
  onPageSizeChange,
  page,
  pageSize,
  pageSizeOptions = [10, 20, 50],
  totalCount,
}: AdminDataTablePaginationProps) {
  const pageSizeSelectId = useId();
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const firstVisibleRow = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastVisibleRow = Math.min(page * pageSize, totalCount);
  const canPreviousPage = page > 1;
  const canNextPage = page < pageCount;

  return (
    <div className="flex items-center justify-between px-4">
      <div className="hidden flex-1 text-muted-foreground text-sm lg:flex">
        Showing {firstVisibleRow}-{lastVisibleRow} of {totalCount} {itemLabel}(s).
      </div>
      <div className="flex w-full items-center gap-8 lg:w-fit">
        <div className="hidden items-center gap-2 lg:flex">
          <Label htmlFor={pageSizeSelectId} className="font-medium text-sm">
            Rows per page
          </Label>
          <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
            <SelectTrigger size="sm" className="w-20" id={pageSizeSelectId}>
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              <SelectGroup>
                {pageSizeOptions.map((pageSizeOption) => (
                  <SelectItem key={pageSizeOption} value={String(pageSizeOption)}>
                    {pageSizeOption}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-fit items-center justify-center font-medium text-sm">
          Page {page} of {pageCount}
        </div>
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <Button
            aria-label="Go to first page"
            className="hidden size-8 p-0 lg:flex"
            disabled={!canPreviousPage}
            onClick={() => onPageChange(1)}
            size="icon"
            type="button"
            variant="outline"
          >
            <ChevronsLeftIcon />
          </Button>
          <Button
            aria-label="Go to previous page"
            className="size-8"
            disabled={!canPreviousPage}
            onClick={() => onPageChange(page - 1)}
            size="icon"
            type="button"
            variant="outline"
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            aria-label="Go to next page"
            className="size-8"
            disabled={!canNextPage}
            onClick={() => onPageChange(page + 1)}
            size="icon"
            type="button"
            variant="outline"
          >
            <ChevronRightIcon />
          </Button>
          <Button
            aria-label="Go to last page"
            className="hidden size-8 lg:flex"
            disabled={!canNextPage}
            onClick={() => onPageChange(pageCount)}
            size="icon"
            type="button"
            variant="outline"
          >
            <ChevronsRightIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}
