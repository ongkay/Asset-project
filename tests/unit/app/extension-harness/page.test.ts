import { beforeEach, describe, expect, it, vi } from "vitest";

const navigationMocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn((location: string) => {
    throw new Error(`NEXT_REDIRECT:${location}`);
  }),
}));

vi.mock("next/navigation", () => ({
  notFound: navigationMocks.notFound,
  redirect: navigationMocks.redirect,
}));

vi.mock("@/modules/users/services", () => ({
  getAuthenticatedAppUser: vi.fn(),
}));

vi.mock("@/modules/extension/services", () => ({
  getExtensionRuntimeConfig: vi.fn(() => ({
    allowedIds: ["allowed-id"],
    allowedOrigins: ["chrome-extension://allowed-id"],
    trustedProxyHeaders: { city: "x-city", country: "x-country", ip: "x-ip" },
  })),
}));

vi.mock("@/app/(extension-dev)/console/extension-harness/_components/extension-harness-shell", () => ({
  ExtensionHarnessShell: vi.fn(() => null),
}));

import * as userServices from "@/modules/users/services";

import ExtensionHarnessPage from "@/app/(extension-dev)/console/extension-harness/page";

const mockedGetAuthenticatedAppUser = vi.mocked(userServices.getAuthenticatedAppUser);

describe("extension harness page", () => {
  beforeEach(() => {
    mockedGetAuthenticatedAppUser.mockReset();
    mockedGetAuthenticatedAppUser.mockResolvedValue({
      profile: {
        email: "seed.active.browser@assetnext.dev",
        isBanned: false,
        role: "member",
        username: "seed-active-browser",
      },
      session: {
        sessionId: "session-1",
        userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      },
    } as never);
  });

  it("returns notFound in production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    await expect(ExtensionHarnessPage()).rejects.toThrow("NEXT_NOT_FOUND");

    vi.unstubAllEnvs();
  });

  it("redirects guests to /login", async () => {
    mockedGetAuthenticatedAppUser.mockResolvedValue(null);

    await expect(ExtensionHarnessPage()).rejects.toThrow("NEXT_REDIRECT:/login");
  });
});
