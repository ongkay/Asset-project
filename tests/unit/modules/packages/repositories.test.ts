import { beforeEach, describe, expect, it, vi } from "vitest";

const databaseMocks = vi.hoisted(() => ({
  createInsForgeAdminDatabase: vi.fn(),
}));

const sessionServiceMocks = vi.hoisted(() => ({
  validateActiveAppSession: vi.fn(),
}));

const authRepositoryMocks = vi.hoisted(() => ({
  readProfileByUserId: vi.fn(),
}));

vi.mock("@/lib/insforge/database", () => ({
  createInsForgeAdminDatabase: databaseMocks.createInsForgeAdminDatabase,
}));

vi.mock("@/modules/sessions/services", () => ({
  validateActiveAppSession: sessionServiceMocks.validateActiveAppSession,
}));

vi.mock("@/modules/auth/repositories", () => ({
  readProfileByUserId: authRepositoryMocks.readProfileByUserId,
}));

describe("packages/repositories member read path", () => {
  beforeEach(() => {
    databaseMocks.createInsForgeAdminDatabase.mockReset();
    sessionServiceMocks.validateActiveAppSession.mockReset();
    authRepositoryMocks.readProfileByUserId.mockReset();
  });

  it("returns an empty package list when there is no active app session", async () => {
    sessionServiceMocks.validateActiveAppSession.mockResolvedValue(null);

    const { listActivePackageRowsForMember } = await import("@/modules/packages/repositories");

    await expect(listActivePackageRowsForMember()).resolves.toEqual([]);
    expect(authRepositoryMocks.readProfileByUserId).not.toHaveBeenCalled();
    expect(databaseMocks.createInsForgeAdminDatabase).not.toHaveBeenCalled();
  });

  it("returns active packages for a member profile even without a provider token", async () => {
    const activeSession = {
      expiresAt: "2026-05-01T00:00:00.000Z",
      lastSeenAt: "2026-04-01T00:00:00.000Z",
      sessionId: "session-1",
      userId: "11111111-1111-4111-8111-111111111111",
    };
    const maybeSingle = vi.fn();
    const eq = vi.fn().mockReturnValue({
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: "20000000-0000-0000-0000-000000000001",
            code: "PKG-1",
            name: "Starter",
            amount_rp: 120000,
            list_amount_rp: 150000,
            duration_days: 30,
            checkout_group: "full-private",
            sort_order: 10,
            checkout_url: null,
            is_extended: true,
            is_active: true,
            access_keys_json: ["tradingview:private"],
            created_at: "2026-04-01T00:00:00.000Z",
            updated_at: "2026-04-01T00:00:00.000Z",
          },
        ],
        error: null,
      }),
      maybeSingle,
    });

    sessionServiceMocks.validateActiveAppSession.mockResolvedValue(activeSession);
    authRepositoryMocks.readProfileByUserId.mockResolvedValue({
      avatarUrl: null,
      email: "member@example.com",
      isBanned: false,
      publicId: "member-1",
      role: "member",
      userId: activeSession.userId,
      username: "member",
    });
    databaseMocks.createInsForgeAdminDatabase.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ eq }),
      }),
    });

    const { listActivePackageRowsForMember } = await import("@/modules/packages/repositories");

    await expect(listActivePackageRowsForMember()).resolves.toEqual([
      {
        accessKeys: ["tradingview:private"],
        amountRp: 120000,
        checkoutGroup: "full-private",
        checkoutUrl: null,
        code: "PKG-1",
        createdAt: "2026-04-01T00:00:00.000Z",
        durationDays: 30,
        id: "20000000-0000-0000-0000-000000000001",
        isActive: true,
        isExtended: true,
        listAmountRp: 150000,
        name: "Starter",
        sortOrder: 10,
        updatedAt: "2026-04-01T00:00:00.000Z",
      },
    ]);
    expect(authRepositoryMocks.readProfileByUserId).toHaveBeenCalledWith(activeSession.userId);
    expect(databaseMocks.createInsForgeAdminDatabase).toHaveBeenCalledTimes(1);
    expect(eq).toHaveBeenCalledWith("is_active", true);
  });

  it("returns null for package-by-id when the active profile is not a member", async () => {
    sessionServiceMocks.validateActiveAppSession.mockResolvedValue({
      expiresAt: "2026-05-01T00:00:00.000Z",
      lastSeenAt: "2026-04-01T00:00:00.000Z",
      sessionId: "session-1",
      userId: "11111111-1111-4111-8111-111111111111",
    });
    authRepositoryMocks.readProfileByUserId.mockResolvedValue({
      avatarUrl: null,
      email: "admin@example.com",
      isBanned: false,
      publicId: "admin-1",
      role: "admin",
      userId: "11111111-1111-4111-8111-111111111111",
      username: "admin",
    });

    const { getActivePackageRowByIdForMember } = await import("@/modules/packages/repositories");

    await expect(getActivePackageRowByIdForMember("11111111-1111-4111-8111-111111111111")).resolves.toBeNull();
    expect(databaseMocks.createInsForgeAdminDatabase).not.toHaveBeenCalled();
  });

  it("sanitizes legacy access key payloads from admin package reads", async () => {
    databaseMocks.createInsForgeAdminDatabase.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: "20000000-0000-0000-0000-000000000003",
                code: "PKG-1",
                name: "Legacy Package",
                amount_rp: 120000,
                list_amount_rp: 120000,
                duration_days: 30,
                checkout_group: "legacy",
                sort_order: 0,
                checkout_url: null,
                is_extended: true,
                is_active: true,
                access_keys_json: ["invalid:key", 42, "tradingview:private"],
                created_at: "2026-04-01T00:00:00.000Z",
                updated_at: "2026-04-01T00:00:00.000Z",
              },
              error: null,
            }),
          }),
        }),
      }),
    });

    const { getPackageById } = await import("@/modules/packages/repositories");

    await expect(getPackageById("20000000-0000-0000-0000-000000000003")).resolves.toMatchObject({
      id: "20000000-0000-0000-0000-000000000003",
      accessKeys: ["tradingview:private"],
    });
  });
});
