import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("vercel cron config", () => {
  it("matches the repo-managed cron schedules", () => {
    const vercelConfigPath = join(process.cwd(), "vercel.json");
    const vercelConfig = JSON.parse(readFileSync(vercelConfigPath, "utf8"));

    expect(vercelConfig).toEqual({
      $schema: "https://openapi.vercel.sh/vercel.json",
      crons: [
        { path: "/api/cron/expire-subscriptions", schedule: "* * * * *" },
        { path: "/api/cron/reconcile-invalid-assets", schedule: "* * * * *" },
      ],
    });
  });
});
