import { describe, expect, it } from "vitest";

import { ExtApiError, buildExtApiErrorResponse } from "@/lib/ext-api/errors";

describe("ext api errors", () => {
  it("maps EXT_UNAUTHENTICATED to 401", async () => {
    const response = buildExtApiErrorResponse(new ExtApiError("EXT_UNAUTHENTICATED", "Session required."));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "EXT_UNAUTHENTICATED",
        message: "Session required.",
      },
    });
  });

  it("maps EXT_REDEEM_USED to 409", async () => {
    const response = buildExtApiErrorResponse(new ExtApiError("EXT_REDEEM_USED", "Code already used."));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "EXT_REDEEM_USED",
        message: "Code already used.",
      },
    });
  });

  it("rethrows unknown errors", () => {
    const error = new Error("boom");

    expect(() => buildExtApiErrorResponse(error)).toThrow(error);
  });
});
