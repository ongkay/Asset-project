import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/extension/services", () => ({
  createExtensionLogoutResponse: vi.fn(),
  createExtensionTrackResponse: vi.fn(),
  getExtensionAssetResponse: vi.fn(),
  getExtensionSessionResponse: vi.fn(),
}));

import { GET as getExtensionAsset } from "@/app/api/extension/asset/route";
import { POST as postExtensionLogout } from "@/app/api/extension/logout/route";
import { GET as getExtensionSession } from "@/app/api/extension/session/route";
import { POST as postExtensionTrack } from "@/app/api/extension/track/route";
import { ExtensionApiError } from "@/lib/extension-api/errors";
import {
  createExtensionLogoutResponse,
  createExtensionTrackResponse,
  getExtensionAssetResponse,
  getExtensionSessionResponse,
} from "@/modules/extension/services";

const mockedCreateExtensionLogoutResponse = vi.mocked(createExtensionLogoutResponse);
const mockedGetExtensionSessionResponse = vi.mocked(getExtensionSessionResponse);
const mockedGetExtensionAssetResponse = vi.mocked(getExtensionAssetResponse);
const mockedCreateExtensionTrackResponse = vi.mocked(createExtensionTrackResponse);

describe("extension route handlers", () => {
  it("returns the extension session payload", async () => {
    mockedGetExtensionSessionResponse.mockResolvedValue({
      requestNonce: { expiresAt: "2026-04-21T13:01:00.000Z", value: "nonce-1" },
      subscription: {
        assets: [],
        daysLeft: 12,
        endAt: "2026-05-01T00:00:00.000Z",
        packageName: "Starter",
        status: "active",
      },
      user: {
        email: "seed.active.browser@assetnext.dev",
        id: "user-1",
        publicId: "MEM-001",
        username: "seed-active-browser",
      },
    });

    const response = await getExtensionSession(
      new Request("http://localhost/api/extension/session", {
        headers: {
          origin: "chrome-extension://allowed-id",
          "x-extension-id": "allowed-id",
        },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      requestNonce: { expiresAt: "2026-04-21T13:01:00.000Z", value: "nonce-1" },
      subscription: {
        assets: [],
        daysLeft: 12,
        endAt: "2026-05-01T00:00:00.000Z",
        packageName: "Starter",
        status: "active",
      },
      user: {
        email: "seed.active.browser@assetnext.dev",
        id: "user-1",
        publicId: "MEM-001",
        username: "seed-active-browser",
      },
    });
  });

  it("maps sign-out to a successful extension logout payload", async () => {
    mockedCreateExtensionLogoutResponse.mockResolvedValue({
      redirectTo: "/login",
      success: true,
    });

    const request = new Request("http://localhost/api/extension/logout", {
      method: "POST",
      headers: {
        origin: "chrome-extension://allowed-id",
        "x-extension-id": "allowed-id",
      },
    });
    const response = await postExtensionLogout(request);

    expect(response.status).toBe(200);
    expect(mockedCreateExtensionLogoutResponse).toHaveBeenCalledWith({
      requestHeaders: request.headers,
    });
    await expect(response.json()).resolves.toEqual({
      redirectTo: "/login",
      success: true,
    });
  });

  it("maps logout ExtensionApiError to a JSON error response", async () => {
    mockedCreateExtensionLogoutResponse.mockRejectedValue(
      new ExtensionApiError("EXT_HEADER_REQUIRED", "Header x-extension-id is required."),
    );

    const response = await postExtensionLogout(
      new Request("http://localhost/api/extension/logout", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "EXT_HEADER_REQUIRED",
        message: "Header x-extension-id is required.",
      },
    });
  });

  it("maps ExtensionApiError to a JSON error response", async () => {
    mockedGetExtensionAssetResponse.mockRejectedValue(
      new ExtensionApiError("NONCE_INVALID", "Request nonce is invalid."),
    );

    const response = await getExtensionAsset(
      new Request("http://localhost/api/extension/asset?id=TV-001", {
        headers: {
          origin: "chrome-extension://allowed-id",
          "x-extension-id": "allowed-id",
          "x-request-nonce": "bad-nonce",
        },
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "NONCE_INVALID",
        message: "Request nonce is invalid.",
      },
    });
  });

  it("passes the request body into POST /api/extension/track", async () => {
    mockedCreateExtensionTrackResponse.mockResolvedValue({
      success: true,
      timestamp: "2026-04-21T13:05:00.000Z",
    });

    const response = await postExtensionTrack(
      new Request("http://localhost/api/extension/track", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "chrome-extension://allowed-id",
          "x-extension-id": "allowed-id",
        },
        body: JSON.stringify({
          browser: "Chrome",
          deviceId: "m11-allowed-primary",
          extensionVersion: "0.0.1",
          os: "macOS",
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      timestamp: "2026-04-21T13:05:00.000Z",
    });
  });
});
