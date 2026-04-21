import { describe, expect, it } from "vitest";

import { ExtensionApiError, buildExtensionApiErrorResponse } from "@/lib/extension-api/errors";

describe("extension api errors", () => {
  it("maps SESSION_MISSING to a 401 response", async () => {
    const response = buildExtensionApiErrorResponse(
      new ExtensionApiError("SESSION_MISSING", "An active app session is required."),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "SESSION_MISSING",
        message: "An active app session is required.",
      },
    });
  });

  it("maps NOT_FOUND to a 404 response", async () => {
    const response = buildExtensionApiErrorResponse(new ExtensionApiError("NOT_FOUND", "Asset was not found."));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "NOT_FOUND",
        message: "Asset was not found.",
      },
    });
  });
});
