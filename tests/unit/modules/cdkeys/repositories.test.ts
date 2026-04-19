import { beforeEach, describe, expect, it, vi } from "vitest";

const databaseMocks = vi.hoisted(() => ({
  createInsForgeAdminDatabase: vi.fn(),
}));

vi.mock("@/lib/insforge/database", () => ({
  createInsForgeAdminDatabase: databaseMocks.createInsForgeAdminDatabase,
}));

describe("cdkeys/repositories", () => {
  beforeEach(() => {
    databaseMocks.createInsForgeAdminDatabase.mockReset();
  });

  it("guards is_active, used_at, and used_by in the atomic reservation write path", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-19T10:00:00.000Z"));

    const maybeSingle = vi.fn().mockResolvedValue({
      data: { used_at: "2026-04-19T10:00:00.000Z" },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const isUsedBy = vi.fn().mockReturnValue({ select });
    const isUsedAt = vi.fn((column: string, _value: null) => {
      if (column === "used_by") {
        return { select };
      }

      return { is: isUsedBy, select };
    });
    const eqIsActive = vi.fn().mockReturnValue({ is: isUsedAt });
    const eqId = vi.fn().mockReturnValue({ eq: eqIsActive });
    const update = vi.fn().mockReturnValue({ eq: eqId });

    databaseMocks.createInsForgeAdminDatabase.mockReturnValue({
      from: vi.fn().mockReturnValue({ update }),
    });

    const { reserveCdKeyUsage } = await import("@/modules/cdkeys/repositories");

    await expect(reserveCdKeyUsage("cdkey-1", "user-1")).resolves.toBe("2026-04-19T10:00:00.000Z");

    expect(update).toHaveBeenCalledWith({
      used_at: "2026-04-19T10:00:00.000Z",
      used_by: "user-1",
    });
    expect(eqId).toHaveBeenCalledWith("id", "cdkey-1");
    expect(eqIsActive).toHaveBeenCalledWith("is_active", true);
    expect(isUsedAt).toHaveBeenCalledWith("used_at", null);
    expect(isUsedBy).toHaveBeenCalledWith("used_by", null);

    vi.useRealTimers();
  });
});
