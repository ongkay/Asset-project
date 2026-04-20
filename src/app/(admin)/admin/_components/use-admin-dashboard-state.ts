"use client";

import { useEffect, useState } from "react";

import { usePathname } from "next/navigation";

import type { AdminDashboardFilters, AdminDashboardPreset } from "@/modules/admin/dashboard/types";

export function getAdminDashboardCustomRangeError(range: { from: string | null; to: string | null }) {
  if (range.from && range.to && range.from > range.to) {
    return "Tanggal mulai tidak boleh melewati tanggal akhir.";
  }

  return null;
}

function writeSearchParam(searchParams: URLSearchParams, key: string, value: string | null) {
  if (!value) {
    searchParams.delete(key);
    return;
  }

  searchParams.set(key, value);
}

export function buildAdminDashboardUrl(pathname: string, filters: AdminDashboardFilters, currentSearch = "") {
  const searchParams = new URLSearchParams(currentSearch);

  if (filters.preset === "30d") {
    searchParams.delete("preset");
    searchParams.delete("from");
    searchParams.delete("to");
  } else {
    writeSearchParam(searchParams, "preset", filters.preset);
    writeSearchParam(searchParams, "from", filters.preset === "custom" ? filters.from : null);
    writeSearchParam(searchParams, "to", filters.preset === "custom" ? filters.to : null);
  }

  const query = searchParams.toString();

  return query ? `${pathname}?${query}` : pathname;
}

export function resolveAdminDashboardPresetChange(
  currentFilters: AdminDashboardFilters,
  currentCustomRange: { from: string | null; to: string | null },
  preset: AdminDashboardPreset,
) {
  if (preset === "custom") {
    return {
      filters: {
        preset,
        from: currentFilters.from,
        to: currentFilters.to,
      },
      customRange: currentCustomRange,
    };
  }

  return {
    filters: {
      preset,
      from: null,
      to: null,
    },
    customRange: {
      from: null,
      to: null,
    },
  };
}

export function useAdminDashboardState(initialFilters: AdminDashboardFilters) {
  const pathname = usePathname();
  const [filters, setFilters] = useState(initialFilters);
  const [customRange, setCustomRange] = useState({ from: initialFilters.from, to: initialFilters.to });
  const customRangeError = getAdminDashboardCustomRangeError(customRange);

  useEffect(() => {
    window.history.replaceState(null, "", buildAdminDashboardUrl(pathname, filters, window.location.search));
  }, [filters, pathname]);

  function setPreset(preset: AdminDashboardPreset) {
    const nextState = resolveAdminDashboardPresetChange(filters, customRange, preset);

    setFilters(nextState.filters);
    setCustomRange(nextState.customRange);
  }

  function setCustomDateRange(nextRange: { from: string | null; to: string | null }) {
    const nextRangeError = getAdminDashboardCustomRangeError(nextRange);

    setCustomRange(nextRange);

    if (!nextRange.from && !nextRange.to) {
      setFilters((current) => (current.preset === "custom" ? { preset: "30d", from: null, to: null } : current));
      return;
    }

    if (nextRangeError || !nextRange.from || !nextRange.to) {
      return;
    }

    setFilters({
      preset: "custom",
      from: nextRange.from,
      to: nextRange.to,
    });
  }

  return {
    filters,
    customRange,
    customRangeError,
    setPreset,
    setCustomDateRange,
  };
}
