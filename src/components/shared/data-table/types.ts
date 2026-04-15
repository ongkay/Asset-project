"use client";

export type AdminColumnVisibility<TColumnKey extends string = string> = Record<TColumnKey, boolean>;

export type AdminSortOrder = "asc" | "desc";

export type AdminTableColumnOption<TColumnKey extends string = string> = {
  canHide?: boolean;
  key: TColumnKey;
  label: string;
};

export type AdminDataTablePaginationState = {
  page: number;
  pageSize: number;
  totalCount: number;
};
