import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/ext/services", () => ({
  createExtHeartbeatResponse: vi.fn(),
  createExtLogoutResponse: vi.fn(),
  createExtRedeemResponse: vi.fn(),
  getExtAssetResponse: vi.fn(),
  getExtAssetSyncResponse: vi.fn(),
  getExtBootstrapResponse: vi.fn(),
}));

import { GET as getExtAsset, runtime as assetRuntime } from "@/app/api/ext/asset/route";
import { GET as getExtAssetSync, runtime as assetSyncRuntime } from "@/app/api/ext/asset/sync/route";
import { GET as getExtBootstrap, runtime as bootstrapRuntime } from "@/app/api/ext/bootstrap/route";
import { POST as postExtHeartbeat, runtime as heartbeatRuntime } from "@/app/api/ext/heartbeat/route";
import { POST as postExtLogout, runtime as logoutRuntime } from "@/app/api/ext/logout/route";
import { POST as postExtRedeem, runtime as redeemRuntime } from "@/app/api/ext/redeem/route";
import { ExtApiError } from "@/lib/ext-api/errors";
import {
  createExtHeartbeatResponse,
  createExtLogoutResponse,
  createExtRedeemResponse,
  getExtAssetResponse,
  getExtAssetSyncResponse,
  getExtBootstrapResponse,
} from "@/modules/ext/services";

const mockedCreateExtHeartbeatResponse = vi.mocked(createExtHeartbeatResponse);
const mockedCreateExtLogoutResponse = vi.mocked(createExtLogoutResponse);
const mockedCreateExtRedeemResponse = vi.mocked(createExtRedeemResponse);
const mockedGetExtAssetResponse = vi.mocked(getExtAssetResponse);
const mockedGetExtAssetSyncResponse = vi.mocked(getExtAssetSyncResponse);
const mockedGetExtBootstrapResponse = vi.mocked(getExtBootstrapResponse);

describe("ext route handlers", () => {
  it("exports nodejs runtime for every ext handler", () => {
    expect(bootstrapRuntime).toBe("nodejs");
    expect(assetRuntime).toBe("nodejs");
    expect(assetSyncRuntime).toBe("nodejs");
    expect(redeemRuntime).toBe("nodejs");
    expect(heartbeatRuntime).toBe("nodejs");
    expect(logoutRuntime).toBe("nodejs");
  });

  it("passes query version and headers to bootstrap service", async () => {
    mockedGetExtBootstrapResponse.mockResolvedValue({
      auth: { loginUrl: "/login", status: "unauthenticated" },
      version: { status: "supported" },
    });

    const request = new Request("http://localhost/api/ext/bootstrap?version=2.3.4", {
      headers: {
        origin: "chrome-extension://allowed-id",
        "x-extension-id": "allowed-id",
        "x-extension-version": "2.0.0",
      },
    });
    const response = await getExtBootstrap(request);

    expect(mockedGetExtBootstrapResponse).toHaveBeenCalledWith({
      query: { version: "2.3.4" },
      requestHeaders: request.headers,
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      auth: { loginUrl: "/login", status: "unauthenticated" },
      version: { status: "supported" },
    });
  });

  it("maps ExtApiError from asset service to JSON", async () => {
    mockedGetExtAssetResponse.mockRejectedValue(
      new ExtApiError("EXT_ASSET_UNAVAILABLE", "No active asset is available for this platform."),
    );

    const response = await getExtAsset(
      new Request("http://localhost/api/ext/asset?platform=windows", {
        headers: {
          origin: "chrome-extension://allowed-id",
          "x-extension-id": "allowed-id",
        },
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "EXT_ASSET_UNAVAILABLE",
        message: "No active asset is available for this platform.",
      },
    });
  });

  it("passes query and headers to asset sync service", async () => {
    mockedGetExtAssetSyncResponse.mockResolvedValue({
      mode: "private",
      platform: "tradingview",
      revision: "rev-1",
      status: "current",
      updatedAt: "2026-05-01T00:00:00.000Z",
    });

    const request = new Request("http://localhost/api/ext/asset/sync?platform=tradingview&revision=rev-1", {
      headers: {
        origin: "chrome-extension://allowed-id",
        "x-extension-id": "allowed-id",
      },
    });
    const response = await getExtAssetSync(request);

    expect(mockedGetExtAssetSyncResponse).toHaveBeenCalledWith({
      query: { platform: "tradingview", revision: "rev-1" },
      requestHeaders: request.headers,
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      mode: "private",
      platform: "tradingview",
      revision: "rev-1",
      status: "current",
      updatedAt: "2026-05-01T00:00:00.000Z",
    });
  });

  it("maps ExtApiError from asset sync service to JSON", async () => {
    mockedGetExtAssetSyncResponse.mockRejectedValue(
      new ExtApiError("EXT_UNAUTHENTICATED", "An active app session is required."),
    );

    const response = await getExtAssetSync(
      new Request("http://localhost/api/ext/asset/sync?platform=tradingview", {
        headers: {
          origin: "chrome-extension://allowed-id",
          "x-extension-id": "allowed-id",
        },
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "EXT_UNAUTHENTICATED",
        message: "An active app session is required.",
      },
    });
  });

  it("passes parsed POST body and headers to redeem service", async () => {
    mockedCreateExtRedeemResponse.mockResolvedValue({
      bootstrap: {
        assets: [],
        auth: { status: "authenticated" },
        subscription: {
          endAt: null,
          packageName: null,
          status: "active",
        },
        user: {
          avatarUrl: null,
          email: "seed.active@assetnext.dev",
          publicId: "MEM-001",
          username: "seed-active",
        },
        version: { status: "supported" },
      },
      message: "CD-Key berhasil diredeem.",
      ok: true,
    });

    const request = new Request("http://localhost/api/ext/redeem", {
      body: JSON.stringify({ code: "CDK-123-456" }),
      headers: {
        "content-type": "application/json",
        origin: "chrome-extension://allowed-id",
        "x-extension-id": "allowed-id",
      },
      method: "POST",
    });
    const response = await postExtRedeem(request);

    expect(mockedCreateExtRedeemResponse).toHaveBeenCalledWith({
      body: { code: "CDK-123-456" },
      requestHeaders: request.headers,
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      bootstrap: {
        assets: [],
        auth: { status: "authenticated" },
        subscription: {
          endAt: null,
          packageName: null,
          status: "active",
        },
        user: {
          avatarUrl: null,
          email: "seed.active@assetnext.dev",
          publicId: "MEM-001",
          username: "seed-active",
        },
        version: { status: "supported" },
      },
      message: "CD-Key berhasil diredeem.",
      ok: true,
    });
  });

  it("returns structured invalid-request JSON when redeem receives malformed JSON", async () => {
    const request = new Request("http://localhost/api/ext/redeem", {
      body: "{",
      headers: {
        "content-type": "application/json",
        origin: "chrome-extension://allowed-id",
        "x-extension-id": "allowed-id",
      },
      method: "POST",
    });
    const response = await postExtRedeem(request);

    expect(mockedCreateExtRedeemResponse).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "EXT_REQUEST_INVALID",
        message: "Request body must be valid JSON.",
      },
    });
  });

  it("passes parsed POST body and headers to heartbeat service", async () => {
    mockedCreateExtHeartbeatResponse.mockResolvedValue({
      ok: true,
      timestamp: "2026-04-25T00:00:00.000Z",
    });

    const request = new Request("http://localhost/api/ext/heartbeat", {
      body: JSON.stringify({
        deviceId: "device-1",
        extensionVersion: "2.3.4",
      }),
      headers: {
        "content-type": "application/json",
        origin: "chrome-extension://allowed-id",
        "x-extension-id": "allowed-id",
      },
      method: "POST",
    });
    const response = await postExtHeartbeat(request);

    expect(mockedCreateExtHeartbeatResponse).toHaveBeenCalledWith({
      body: {
        deviceId: "device-1",
        extensionVersion: "2.3.4",
      },
      requestHeaders: request.headers,
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      timestamp: "2026-04-25T00:00:00.000Z",
    });
  });

  it("returns structured invalid-request JSON when heartbeat receives malformed JSON", async () => {
    const request = new Request("http://localhost/api/ext/heartbeat", {
      body: "{",
      headers: {
        "content-type": "application/json",
        origin: "chrome-extension://allowed-id",
        "x-extension-id": "allowed-id",
      },
      method: "POST",
    });
    const response = await postExtHeartbeat(request);

    expect(mockedCreateExtHeartbeatResponse).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "EXT_REQUEST_INVALID",
        message: "Request body must be valid JSON.",
      },
    });
  });

  it("maps logout service payload to JSON", async () => {
    mockedCreateExtLogoutResponse.mockResolvedValue({
      ok: true,
      redirectTo: "/login",
    });

    const request = new Request("http://localhost/api/ext/logout", {
      headers: {
        origin: "chrome-extension://allowed-id",
        "x-extension-id": "allowed-id",
      },
      method: "POST",
    });
    const response = await postExtLogout(request);

    expect(mockedCreateExtLogoutResponse).toHaveBeenCalledWith({
      requestHeaders: request.headers,
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      redirectTo: "/login",
    });
  });
});
