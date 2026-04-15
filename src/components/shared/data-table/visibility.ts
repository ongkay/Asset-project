"use client";

import { useState } from "react";

import { getLocalStorageValue, setLocalStorageValue } from "@/lib/local-storage.client";

import type { AdminColumnVisibility } from "./types";

type UseAdminColumnVisibilityInput<TColumnKey extends string> = {
  columnKeys: readonly TColumnKey[];
  defaultVisibility: AdminColumnVisibility<TColumnKey>;
  lockedVisibleKeys?: readonly TColumnKey[];
  storageKey: string;
};

function normalizeColumnVisibility<TColumnKey extends string>(
  value: string | null,
  input: UseAdminColumnVisibilityInput<TColumnKey>,
): AdminColumnVisibility<TColumnKey> {
  if (!value) {
    return input.defaultVisibility;
  }

  try {
    const parsedValue = JSON.parse(value) as Partial<Record<TColumnKey, unknown>>;
    const normalizedVisibility = input.columnKeys.reduce<AdminColumnVisibility<TColumnKey>>(
      (visibility, columnKey) => {
        visibility[columnKey] =
          typeof parsedValue[columnKey] === "boolean"
            ? (parsedValue[columnKey] as boolean)
            : input.defaultVisibility[columnKey];
        return visibility;
      },
      { ...input.defaultVisibility },
    );

    for (const lockedKey of input.lockedVisibleKeys ?? []) {
      normalizedVisibility[lockedKey] = true;
    }

    return normalizedVisibility;
  } catch {
    return input.defaultVisibility;
  }
}

export function useAdminColumnVisibility<TColumnKey extends string>(input: UseAdminColumnVisibilityInput<TColumnKey>) {
  const [visibleColumns, setVisibleColumns] = useState<AdminColumnVisibility<TColumnKey>>(() =>
    normalizeColumnVisibility(getLocalStorageValue(input.storageKey), input),
  );

  function handleToggleColumn(columnKey: TColumnKey, nextVisible: boolean) {
    if (input.lockedVisibleKeys?.includes(columnKey)) {
      return;
    }

    const nextVisibility: AdminColumnVisibility<TColumnKey> = {
      ...visibleColumns,
      [columnKey]: nextVisible,
    };

    for (const lockedKey of input.lockedVisibleKeys ?? []) {
      nextVisibility[lockedKey] = true;
    }

    setVisibleColumns(nextVisibility);
    setLocalStorageValue(input.storageKey, JSON.stringify(nextVisibility));
  }

  return {
    handleToggleColumn,
    visibleColumns,
  };
}
