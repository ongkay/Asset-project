import { beforeEach, describe, expect, it, vi } from "vitest";

const headerMocks = vi.hoisted(() => {
  const cookieStore = {
    get: vi.fn(),
    set: vi.fn(),
  };

  return {
    cookieStore,
    cookies: vi.fn(async () => cookieStore),
  };
});

vi.mock("next/headers", () => ({
  cookies: headerMocks.cookies,
}));

describe("lib/cookies app_session transport", () => {
  beforeEach(() => {
    headerMocks.cookieStore.get.mockReset();
    headerMocks.cookieStore.set.mockReset();
  });

  it("writes app_session with explicit SameSite=None for extension-compatible requests", async () => {
    const { writeAppSessionCookie } = await import("@/lib/cookies");

    await writeAppSessionCookie("opaque-token");

    expect(headerMocks.cookieStore.set).toHaveBeenCalledWith(
      "app_session",
      "opaque-token",
      expect.objectContaining({
        httpOnly: true,
        path: "/",
        sameSite: "none",
      }),
    );
  });

  it("marks SameSite=None app_session cookies as Secure so browsers do not reject them", async () => {
    const { writeAppSessionCookie } = await import("@/lib/cookies");

    await writeAppSessionCookie("opaque-token");

    expect(headerMocks.cookieStore.set).toHaveBeenCalledWith(
      "app_session",
      "opaque-token",
      expect.objectContaining({
        sameSite: "none",
        secure: true,
      }),
    );
  });

  it("writes the email verification resend cooldown cookie as an httpOnly server cookie", async () => {
    const { writeEmailVerificationResendCooldownCookie } = await import("@/lib/cookies");

    await writeEmailVerificationResendCooldownCookie("future-timestamp", 60);

    expect(headerMocks.cookieStore.set).toHaveBeenCalledWith(
      "email_verification_resend_cooldown",
      "future-timestamp",
      expect.objectContaining({
        httpOnly: true,
        maxAge: 60,
        path: "/",
        sameSite: "lax",
      }),
    );
  });
});
