import { describe, expect, it } from "vitest";

import { getInitials } from "@/lib/utils";

describe("lib/utils getInitials", () => {
  it("derives initials from normalized username segments", () => {
    expect(getInitials("seed-active-browser")).toBe("SA");
    expect(getInitials("adiwijayaty-a16893")).toBe("AA");
  });
});
