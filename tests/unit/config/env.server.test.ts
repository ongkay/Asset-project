import { afterEach, describe, expect, it, vi } from "vitest";

const baseServerEnv = {
  APP_SESSION_COOKIE_NAME: "app_session",
  APP_SESSION_SECRET: "12345678901234567890123456789012",
  CRON_SECRET: "cron-secret",
  DATABASE_URL: "https://database.example.com",
  EXT_API_ALLOWED_IDS: "ext-id-1, ext-id-2",
  EXT_API_ALLOWED_ORIGINS: "chrome-extension://ext-id-1, https://app.example.com",
  EXT_API_DEV_HEADER_OVERRIDE: "true",
  EXTENSION_ALLOWED_IDS: "legacy-ext-id",
  EXTENSION_ALLOWED_ORIGINS: "chrome-extension://legacy-ext-id",
  INSFORGE_ANON_KEY: "insforge-anon",
  INSFORGE_PROJECT_ADMIN_EMAIL: "admin@example.com",
  INSFORGE_PROJECT_ADMIN_PASSWORD: "admin-password",
  INSFORGE_SERVICE_KEY: "insforge-service",
  INSFORGE_URL: "https://insforge.example.com",
  NEXT_PUBLIC_INSFORGE_ANON_KEY: "public-anon",
  NEXT_PUBLIC_INSFORGE_URL: "https://public-insforge.example.com",
  TRUSTED_PROXY_CITY_HEADER: "x-vercel-ip-city",
  TRUSTED_PROXY_COUNTRY_HEADER: "x-vercel-ip-country",
  TRUSTED_PROXY_IP_HEADER: "x-forwarded-for",
} as const;

async function loadEnvModule(overrides: Partial<Record<keyof typeof baseServerEnv, string>> = {}) {
  vi.resetModules();

  for (const [key, value] of Object.entries({ ...baseServerEnv, ...overrides })) {
    vi.stubEnv(key, value);
  }

  return import("@/config/env.server");
}

describe("config/env.server", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("loads the new ext api defaults from the shared vitest bootstrap", async () => {
    const { env } = await import("@/config/env.server");

    expect(env.EXT_API_ALLOWED_IDS).toEqual(["ext-api-extension-id"]);
    expect(env.EXT_API_ALLOWED_ORIGINS).toEqual(["chrome-extension://ext-api-extension-id"]);
    expect(env.EXT_API_DEV_HEADER_OVERRIDE).toBe(false);
  });

  it("parses EXT_API_ALLOWED_IDS into a trimmed array", async () => {
    const { env } = await loadEnvModule({ EXT_API_ALLOWED_IDS: " ext-id-1 , ext-id-2 " });

    expect(env.EXT_API_ALLOWED_IDS).toEqual(["ext-id-1", "ext-id-2"]);
  });

  it("parses EXT_API_ALLOWED_ORIGINS into a trimmed array", async () => {
    const { env } = await loadEnvModule({
      EXT_API_ALLOWED_ORIGINS: " chrome-extension://ext-id-1 , https://app.example.com ",
    });

    expect(env.EXT_API_ALLOWED_ORIGINS).toEqual(["chrome-extension://ext-id-1", "https://app.example.com"]);
  });

  it("parses EXT_API_DEV_HEADER_OVERRIDE as a boolean flag", async () => {
    const { env: truthyEnv } = await loadEnvModule({ EXT_API_DEV_HEADER_OVERRIDE: "true" });
    expect(truthyEnv.EXT_API_DEV_HEADER_OVERRIDE).toBe(true);

    const { env: falsyEnv } = await loadEnvModule({ EXT_API_DEV_HEADER_OVERRIDE: "false" });
    expect(falsyEnv.EXT_API_DEV_HEADER_OVERRIDE).toBe(false);
  });
});
