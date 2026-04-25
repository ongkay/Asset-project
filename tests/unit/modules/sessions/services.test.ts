import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieMocks = vi.hoisted(() => ({
  clearAppSessionCookie: vi.fn(),
  clearInsForgeAccessTokenCookie: vi.fn(),
  readAppSessionCookie: vi.fn(),
  writeAppSessionCookie: vi.fn(),
}));

const repositoryMocks = vi.hoisted(() => ({
  createOpaqueSessionToken: vi.fn(),
  findActiveSessionByTokenHash: vi.fn(),
  hashSessionToken: vi.fn(),
  insertSessionRecord: vi.fn(),
  revokeSessionRecord: vi.fn(),
  revokeSessionsForUser: vi.fn(),
  touchSessionLastSeen: vi.fn(),
}));

vi.mock("@/lib/cookies", () => ({
  clearAppSessionCookie: cookieMocks.clearAppSessionCookie,
  clearInsForgeAccessTokenCookie: cookieMocks.clearInsForgeAccessTokenCookie,
  readAppSessionCookie: cookieMocks.readAppSessionCookie,
  writeAppSessionCookie: cookieMocks.writeAppSessionCookie,
}));

vi.mock("@/modules/sessions/repositories", async () => {
  const actual = await vi.importActual<typeof import("@/modules/sessions/repositories")>(
    "@/modules/sessions/repositories",
  );

  return {
    ...actual,
    createOpaqueSessionToken: repositoryMocks.createOpaqueSessionToken,
    findActiveSessionByTokenHash: repositoryMocks.findActiveSessionByTokenHash,
    hashSessionToken: repositoryMocks.hashSessionToken,
    insertSessionRecord: repositoryMocks.insertSessionRecord,
    revokeSessionRecord: repositoryMocks.revokeSessionRecord,
    revokeSessionsForUser: repositoryMocks.revokeSessionsForUser,
    touchSessionLastSeen: repositoryMocks.touchSessionLastSeen,
  };
});

describe("session services", () => {
  const validSessionToken = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const validTrimmedSessionToken = `  ${validSessionToken}  `;
  const validCookieSessionToken = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
  const validActiveSessionToken = "cccccccccccccccccccccccccccccccc";
  const validSessionId = "11111111-1111-4111-8111-111111111111";
  const otherValidSessionId = "22222222-2222-4222-8222-222222222222";

  beforeEach(() => {
    cookieMocks.clearAppSessionCookie.mockReset();
    cookieMocks.clearInsForgeAccessTokenCookie.mockReset();
    cookieMocks.readAppSessionCookie.mockReset();
    cookieMocks.writeAppSessionCookie.mockReset();
    repositoryMocks.createOpaqueSessionToken.mockReset();
    repositoryMocks.findActiveSessionByTokenHash.mockReset();
    repositoryMocks.hashSessionToken.mockReset();
    repositoryMocks.insertSessionRecord.mockReset();
    repositoryMocks.revokeSessionRecord.mockReset();
    repositoryMocks.revokeSessionsForUser.mockReset();
    repositoryMocks.touchSessionLastSeen.mockReset();
  });

  it("returns null for an empty app session token override", async () => {
    const { validateAppSessionToken } = await import("@/modules/sessions/services");

    await expect(validateAppSessionToken("   ")).resolves.toBeNull();

    expect(repositoryMocks.hashSessionToken).not.toHaveBeenCalled();
    expect(repositoryMocks.findActiveSessionByTokenHash).not.toHaveBeenCalled();
  });

  it("rejects a non-empty app session token override that does not satisfy the session token schema", async () => {
    const { validateAppSessionToken } = await import("@/modules/sessions/services");

    await expect(validateAppSessionToken("short-token")).rejects.toThrow("Session token is required.");

    expect(repositoryMocks.hashSessionToken).not.toHaveBeenCalled();
    expect(repositoryMocks.findActiveSessionByTokenHash).not.toHaveBeenCalled();
  });

  it("trims and validates a provided app session token override", async () => {
    repositoryMocks.hashSessionToken.mockReturnValue("hashed-token");
    repositoryMocks.findActiveSessionByTokenHash.mockResolvedValue({
      createdAt: "2026-04-25T10:00:00.000Z",
      lastSeenAt: "2026-04-25T10:00:00.000Z",
      revokedAt: null,
      sessionId: validSessionId,
      userId: "11111111-1111-4111-8111-111111111111",
    });

    const { validateAppSessionToken } = await import("@/modules/sessions/services");

    await expect(validateAppSessionToken(validTrimmedSessionToken)).resolves.toMatchObject({
      sessionId: validSessionId,
      userId: "11111111-1111-4111-8111-111111111111",
    });

    expect(repositoryMocks.hashSessionToken).toHaveBeenCalledWith(validSessionToken);
    expect(repositoryMocks.findActiveSessionByTokenHash).toHaveBeenCalledWith("hashed-token");
  });

  it("reads the app session cookie before validating the active session", async () => {
    cookieMocks.readAppSessionCookie.mockResolvedValue(`  ${validCookieSessionToken}  `);
    repositoryMocks.hashSessionToken.mockReturnValue("cookie-hash");
    repositoryMocks.findActiveSessionByTokenHash.mockResolvedValue({
      createdAt: "2026-04-25T10:00:00.000Z",
      lastSeenAt: "2026-04-25T10:00:00.000Z",
      revokedAt: null,
      sessionId: validSessionId,
      userId: "11111111-1111-4111-8111-111111111111",
    });

    const { validateActiveAppSession } = await import("@/modules/sessions/services");

    await expect(validateActiveAppSession()).resolves.toMatchObject({
      sessionId: validSessionId,
    });

    expect(cookieMocks.readAppSessionCookie).toHaveBeenCalledTimes(1);
    expect(repositoryMocks.hashSessionToken).toHaveBeenCalledWith(validCookieSessionToken);
  });

  it("returns null for a malformed non-empty app session cookie without hitting the repository lookup", async () => {
    cookieMocks.readAppSessionCookie.mockResolvedValue("  short-token  ");

    const { validateActiveAppSession } = await import("@/modules/sessions/services");

    await expect(validateActiveAppSession()).resolves.toBeNull();

    expect(repositoryMocks.hashSessionToken).not.toHaveBeenCalled();
    expect(repositoryMocks.findActiveSessionByTokenHash).not.toHaveBeenCalled();
  });

  it("rejects when the active-session lookup fails for a valid cookie token", async () => {
    cookieMocks.readAppSessionCookie.mockResolvedValue(validCookieSessionToken);
    repositoryMocks.hashSessionToken.mockReturnValue("cookie-hash");
    repositoryMocks.findActiveSessionByTokenHash.mockRejectedValue(new Error("database unavailable"));

    const { validateActiveAppSession } = await import("@/modules/sessions/services");

    await expect(validateActiveAppSession()).rejects.toThrow("database unavailable");

    expect(repositoryMocks.hashSessionToken).toHaveBeenCalledWith(validCookieSessionToken);
    expect(repositoryMocks.findActiveSessionByTokenHash).toHaveBeenCalledWith("cookie-hash");
  });

  it("rejects an invalid session id before touching last-seen", async () => {
    const { touchAppSessionLastSeen } = await import("@/modules/sessions/services");

    await expect(touchAppSessionLastSeen("session-42")).rejects.toThrow("Session ID must be a valid UUID.");

    expect(repositoryMocks.touchSessionLastSeen).not.toHaveBeenCalled();
  });

  it("touches a session last-seen timestamp by explicit session id", async () => {
    repositoryMocks.touchSessionLastSeen.mockResolvedValue(undefined);

    const { touchAppSessionLastSeen } = await import("@/modules/sessions/services");

    await expect(touchAppSessionLastSeen(otherValidSessionId)).resolves.toBeUndefined();

    expect(repositoryMocks.touchSessionLastSeen).toHaveBeenCalledWith(otherValidSessionId);
  });

  it("touches the active session last-seen timestamp and returns the active session", async () => {
    cookieMocks.readAppSessionCookie.mockResolvedValue(validActiveSessionToken);
    repositoryMocks.hashSessionToken.mockReturnValue("active-hash");
    repositoryMocks.findActiveSessionByTokenHash.mockResolvedValue({
      createdAt: "2026-04-25T10:00:00.000Z",
      lastSeenAt: "2026-04-25T10:00:00.000Z",
      revokedAt: null,
      sessionId: otherValidSessionId,
      userId: "11111111-1111-4111-8111-111111111111",
    });
    repositoryMocks.touchSessionLastSeen.mockResolvedValue(undefined);

    const { touchActiveAppSessionLastSeen } = await import("@/modules/sessions/services");

    await expect(touchActiveAppSessionLastSeen()).resolves.toMatchObject({
      sessionId: otherValidSessionId,
    });

    expect(repositoryMocks.touchSessionLastSeen).toHaveBeenCalledWith(otherValidSessionId);
  });

  it("returns null without touching last-seen when there is no active session", async () => {
    cookieMocks.readAppSessionCookie.mockResolvedValue(undefined);

    const { touchActiveAppSessionLastSeen } = await import("@/modules/sessions/services");

    await expect(touchActiveAppSessionLastSeen()).resolves.toBeNull();

    expect(repositoryMocks.touchSessionLastSeen).not.toHaveBeenCalled();
  });
});
