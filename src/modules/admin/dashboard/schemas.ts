import { z } from "zod";

import type { AdminDashboardFilters, AdminDashboardPreset, AdminDashboardResolvedRange } from "./types";

const adminDashboardPresetSchema = z.enum(["30d", "90d", "custom"]);

function isValidAdminDashboardDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const resolvedDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

  return (
    resolvedDate.getUTCFullYear() === year &&
    resolvedDate.getUTCMonth() === month - 1 &&
    resolvedDate.getUTCDate() === day
  );
}

const adminDashboardDateSchema = z.string().refine(isValidAdminDashboardDateOnly, {
  message: "Tanggal dashboard harus memakai format kalender yang valid.",
});

export const adminDashboardFilterSchema = z.object({
  preset: adminDashboardPresetSchema.default("30d"),
  from: adminDashboardDateSchema.nullable().default(null),
  to: adminDashboardDateSchema.nullable().default(null),
});

function createUtcStartOfDay(dateOnly: string): Date {
  const [year, month, day] = dateOnly.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

function createUtcEndOfDay(dateOnly: string): Date {
  const [year, month, day] = dateOnly.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
}

function formatUtcDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function readSingleSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function getFallbackPreset(preset: string | undefined): Exclude<AdminDashboardPreset, "custom"> {
  return preset === "90d" ? "90d" : "30d";
}

export function parseAdminDashboardSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): AdminDashboardFilters {
  const presetResult = adminDashboardPresetSchema.safeParse(readSingleSearchParam(searchParams.preset));
  const fromResult = adminDashboardDateSchema.safeParse(readSingleSearchParam(searchParams.from));
  const toResult = adminDashboardDateSchema.safeParse(readSingleSearchParam(searchParams.to));

  const preset = presetResult.success ? presetResult.data : "30d";
  const from = fromResult.success ? fromResult.data : null;
  const to = toResult.success ? toResult.data : null;

  if (preset !== "custom") {
    return { preset, from: null, to: null };
  }

  if (!from || !to || from > to) {
    return { preset: "30d", from: null, to: null };
  }

  return { preset, from, to };
}

export function resolveAdminDashboardRange(
  filters: AdminDashboardFilters,
  now = new Date(),
): AdminDashboardResolvedRange {
  if (filters.preset === "custom" && filters.from && filters.to) {
    const fromDate = createUtcStartOfDay(filters.from);
    const toDate = createUtcEndOfDay(filters.to);

    return {
      preset: "custom",
      from: filters.from,
      to: filters.to,
      fromIso: fromDate.toISOString(),
      toIso: toDate.toISOString(),
      label: `${filters.from} - ${filters.to}`,
    };
  }

  const fallbackPreset = getFallbackPreset(filters.preset);
  const daysToSubtract = fallbackPreset === "90d" ? 89 : 29;
  const toDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
  const fromDate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysToSubtract, 0, 0, 0, 0),
  );

  return {
    preset: fallbackPreset,
    from: formatUtcDateOnly(fromDate),
    to: formatUtcDateOnly(toDate),
    fromIso: fromDate.toISOString(),
    toIso: toDate.toISOString(),
    label: fallbackPreset === "90d" ? "90 hari" : "30 hari",
  };
}
