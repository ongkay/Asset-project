import { describe, expect, it } from "vitest";

import { packageFormSchema } from "@/modules/packages/schemas";

describe("packages/schemas", () => {
  it("rejects original amount below selling amount", () => {
    const result = packageFormSchema.safeParse({
      accessKeys: ["tradingview:private"],
      amountRp: 175000,
      checkoutGroup: "full-private",
      checkoutUrl: null,
      durationDays: 30,
      isExtended: true,
      listAmountRp: 125000,
      name: "Full Private 30 days",
      sortOrder: 20,
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.listAmountRp).toContain(
      "Original amount must be greater than or equal to selling amount.",
    );
  });

  it("accepts checkout metadata and normalizes access keys", () => {
    const result = packageFormSchema.parse({
      accessKeys: ["fxtester:private", "tradingview:private"],
      amountRp: 100000,
      checkoutGroup: "full-private",
      checkoutUrl: null,
      durationDays: 15,
      isExtended: true,
      listAmountRp: 125000,
      name: "Full Private 15 days",
      sortOrder: 10,
    });

    expect(result).toMatchObject({
      amountRp: 100000,
      checkoutGroup: "full-private",
      listAmountRp: 125000,
      sortOrder: 10,
    });
    expect(result.accessKeys).toEqual(["tradingview:private", "fxtester:private"]);
  });
});
