import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/users/services", async () => {
  return {
    createUserByAdmin: vi.fn(),
    updateUserProfileByAdmin: vi.fn(),
    toggleUserBanByAdmin: vi.fn(),
    getAuthenticatedAppUser: vi.fn().mockResolvedValue({
      profile: {
        isBanned: false,
        role: "admin",
        userId: "91000000-0000-4000-8000-000000000001",
      },
      session: {
        id: "session-1",
        userId: "91000000-0000-4000-8000-000000000001",
      },
    }),
  };
});

import * as userServices from "@/modules/users/services";
import { createUserAction } from "@/modules/users/actions";

const mockedCreateUserByAdmin = vi.mocked(userServices.createUserByAdmin);
const mockedGetAuthenticatedAppUser = vi.mocked(userServices.getAuthenticatedAppUser);

describe("users/actions", () => {
  beforeEach(() => {
    mockedCreateUserByAdmin.mockReset();
    mockedGetAuthenticatedAppUser.mockResolvedValue({
      profile: {
        isBanned: false,
        role: "admin",
        userId: "91000000-0000-4000-8000-000000000001",
      },
      session: {
        id: "session-1",
        userId: "91000000-0000-4000-8000-000000000001",
      },
    } as never);
  });

  it("rejects invalid create-user payloads before the service runs", async () => {
    const result = await createUserAction({
      email: "not-an-email",
      password: "123",
      confirmPassword: "321",
      role: "member",
    });

    expect(result?.validationErrors?.fieldErrors.email).toContain("Email address must be valid.");
    expect(result?.validationErrors?.fieldErrors.confirmPassword).toContain("Password confirmation must match.");
    expect(mockedCreateUserByAdmin).not.toHaveBeenCalled();
  });

  it("rejects banned admins before browser-callable writes execute", async () => {
    mockedGetAuthenticatedAppUser.mockResolvedValueOnce({
      profile: {
        isBanned: true,
        role: "admin",
        userId: "91000000-0000-4000-8000-000000000001",
      },
      session: {
        id: "session-1",
        userId: "91000000-0000-4000-8000-000000000001",
      },
    } as never);

    const result = await createUserAction({
      email: "new.member@assetnext.dev",
      password: "Devpass123",
      confirmPassword: "Devpass123",
      role: "member",
    });

    expect(result?.serverError).toBe("Forbidden.");
    expect(mockedCreateUserByAdmin).not.toHaveBeenCalled();
  });

  it("returns a stable unauthorized error when no admin session is present", async () => {
    mockedGetAuthenticatedAppUser.mockResolvedValueOnce(null as never);

    const result = await createUserAction({
      email: "new.member@assetnext.dev",
      password: "Devpass123",
      confirmPassword: "Devpass123",
      role: "member",
    });

    expect(result?.serverError).toBe("Unauthorized.");
    expect(mockedCreateUserByAdmin).not.toHaveBeenCalled();
  });
});
