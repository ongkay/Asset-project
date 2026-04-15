"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";

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

function subscribeToLocalStorageChanges(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("local-storage", callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("local-storage", callback);
  };
}

export function useAdminColumnVisibility<TColumnKey extends string>({
  columnKeys,
  defaultVisibility,
  lockedVisibleKeys,
  storageKey,
}: UseAdminColumnVisibilityInput<TColumnKey>) {
  const visibleColumnsSnapshotRef = useRef<{
    normalized: AdminColumnVisibility<TColumnKey>;
    rawValue: string | null;
  } | null>(null);

  const getVisibleColumnsSnapshot = useCallback(() => {
    const rawValue = getLocalStorageValue(storageKey);

    if (visibleColumnsSnapshotRef.current?.rawValue === rawValue) {
      return visibleColumnsSnapshotRef.current.normalized;
    }

    const normalized = normalizeColumnVisibility(rawValue, {
      columnKeys,
      defaultVisibility,
      lockedVisibleKeys,
      storageKey,
    });

    visibleColumnsSnapshotRef.current = {
      normalized,
      rawValue,
    };

    return normalized;
  }, [columnKeys, defaultVisibility, lockedVisibleKeys, storageKey]);

  const visibleColumns = useSyncExternalStore(
    subscribeToLocalStorageChanges,
    getVisibleColumnsSnapshot,
    () => defaultVisibility,
  );

  function handleToggleColumn(columnKey: TColumnKey, nextVisible: boolean) {
    if (lockedVisibleKeys?.includes(columnKey)) {
      return;
    }

    const nextVisibility: AdminColumnVisibility<TColumnKey> = {
      ...visibleColumns,
      [columnKey]: nextVisible,
    };

    for (const lockedKey of lockedVisibleKeys ?? []) {
      nextVisibility[lockedKey] = true;
    }

    setLocalStorageValue(storageKey, JSON.stringify(nextVisibility));
  }

  return {
    handleToggleColumn,
    visibleColumns,
  };
}
