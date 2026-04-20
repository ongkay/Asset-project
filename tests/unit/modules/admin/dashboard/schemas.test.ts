import { describe, expect, it } from "vitest";

import { parseAdminDashboardSearchParams, resolveAdminDashboardRange } from "@/modules/admin/dashboard/schemas";

describe("admin/dashboard/schemas", () => {
  it("defaults to the 30d preset when no search params are present", () => {
    expect(parseAdminDashboardSearchParams({})).toEqual({
      preset: "30d",
      from: null,
      to: null,
    });
  });

  it("keeps a valid custom range and rejects a reversed custom range", () => {
    expect(
      parseAdminDashboardSearchParams({
        preset: "custom",
        from: "2026-04-01",
        to: "2026-04-30",
      }),
    ).toEqual({
      preset: "custom",
      from: "2026-04-01",
      to: "2026-04-30",
    });

    expect(
      parseAdminDashboardSearchParams({
        preset: "custom",
        from: "2026-13-40",
        to: "2026-04-01",
      }),
    ).toEqual({
      preset: "30d",
      from: null,
      to: null,
    });

    expect(
      parseAdminDashboardSearchParams({
        preset: "custom",
        from: "2026-04-30",
        to: "2026-04-01",
      }),
    ).toEqual({
      preset: "30d",
      from: null,
      to: null,
    });
  });

  it("resolves preset windows into inclusive UTC boundaries", () => {
    const range = resolveAdminDashboardRange(
      { preset: "90d", from: null, to: null },
      new Date("2026-04-20T12:00:00.000Z"),
    );

    expect(range.label).toBe("90 hari");
    expect(range.fromIso).toBe("2026-01-21T00:00:00.000Z");
    expect(range.toIso).toBe("2026-04-20T23:59:59.999Z");
  });
});
