import { describe, expect, it } from "vitest";

import {
  buildAdminDashboardUrl,
  getAdminDashboardCustomRangeError,
  resolveAdminDashboardPresetChange,
} from "@/app/(admin)/admin/_components/use-admin-dashboard-state";

describe("app/admin/use-admin-dashboard-state", () => {
  it("omits default 30d filters from the url", () => {
    expect(buildAdminDashboardUrl("/admin", { preset: "30d", from: null, to: null })).toBe("/admin");
  });

  it("serializes preset and custom date state", () => {
    expect(buildAdminDashboardUrl("/admin", { preset: "90d", from: null, to: null })).toBe("/admin?preset=90d");

    expect(
      buildAdminDashboardUrl("/admin", {
        preset: "custom",
        from: "2026-04-01",
        to: "2026-04-30",
      }),
    ).toBe("/admin?preset=custom&from=2026-04-01&to=2026-04-30");
  });

  it("returns an inline error for reversed custom ranges", () => {
    expect(getAdminDashboardCustomRangeError({ from: "2026-04-30", to: "2026-04-01" })).toBe(
      "Tanggal mulai tidak boleh melewati tanggal akhir.",
    );
  });

  it("resets stale custom range state when switching back to preset mode", () => {
    expect(
      resolveAdminDashboardPresetChange(
        { preset: "custom", from: "2026-04-01", to: "2026-04-30" },
        { from: "2026-04-01", to: "2026-04-30" },
        "90d",
      ),
    ).toEqual({
      filters: { preset: "90d", from: null, to: null },
      customRange: { from: null, to: null },
    });
  });
});
