import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthenticatedAppUser } from "@/modules/users/types";

const userServiceMocks = vi.hoisted(() => ({
  getAuthenticatedAppUser: vi.fn(),
}));

vi.mock("@/modules/users/services", () => ({
  getAuthenticatedAppUser: userServiceMocks.getAuthenticatedAppUser,
}));

function createAuthenticatedAppUser(overrides: Partial<AuthenticatedAppUser["profile"]> = {}): AuthenticatedAppUser {
  return {
    profile: {
      avatarUrl: null,
      email: "member@example.com",
      isBanned: false,
      publicId: "MEM-000001",
      role: "member",
      userId: "91000000-0000-4000-8000-000000000001",
      username: "member-user",
      ...overrides,
    },
    session: {
      createdAt: "2026-04-01T00:00:00.000Z",
      lastSeenAt: "2026-04-19T00:00:00.000Z",
      revokedAt: null,
      sessionId: "session-1",
      userId: overrides.userId ?? "91000000-0000-4000-8000-000000000001",
    },
  };
}

describe("auth/action-client", () => {
  beforeEach(() => {
    userServiceMocks.getAuthenticatedAppUser.mockReset();
  });

  it("allows member actions for a non-banned member", async () => {
    userServiceMocks.getAuthenticatedAppUser.mockResolvedValueOnce(createAuthenticatedAppUser());

    const { memberActionClient } = await import("@/modules/auth/action-client");
    const action = memberActionClient.metadata({ actionName: "auth.member-probe" }).action(async ({ ctx }) => ({
      role: ctx.currentAppUser.profile.role,
      userId: ctx.currentAppUser.profile.userId,
    }));

    await expect(action()).resolves.toMatchObject({
      data: {
        role: "member",
        userId: "91000000-0000-4000-8000-000000000001",
      },
    });
  });

  it("returns the stable unauthorized error when no app user exists", async () => {
    userServiceMocks.getAuthenticatedAppUser.mockResolvedValueOnce(null);

    const { memberActionClient } = await import("@/modules/auth/action-client");
    const action = memberActionClient.metadata({ actionName: "auth.member-probe" }).action(async () => ({ ok: true }));

    await expect(action()).resolves.toMatchObject({
      serverError: "Unauthorized.",
    });
  });

  it("returns the stable forbidden error for banned members", async () => {
    userServiceMocks.getAuthenticatedAppUser.mockResolvedValueOnce(
      createAuthenticatedAppUser({ isBanned: true, role: "member" }),
    );

    const { memberActionClient } = await import("@/modules/auth/action-client");
    const action = memberActionClient.metadata({ actionName: "auth.member-probe" }).action(async () => ({ ok: true }));

    await expect(action()).resolves.toMatchObject({
      serverError: "Forbidden.",
    });
  });

  it("keeps admin actions forbidden for non-admin users", async () => {
    userServiceMocks.getAuthenticatedAppUser.mockResolvedValueOnce(createAuthenticatedAppUser());

    const { adminActionClient } = await import("@/modules/auth/action-client");
    const action = adminActionClient.metadata({ actionName: "auth.admin-probe" }).action(async () => ({ ok: true }));

    await expect(action()).resolves.toMatchObject({
      serverError: "Forbidden.",
    });
  });
});
