import "server-only";

import { z } from "zod";

const nonEmptyString = z.string().trim().min(1);

const commaSeparatedValues = z
  .string()
  .trim()
  .min(1)
  .transform((value) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );

const extensionId = z
  .string()
  .trim()
  .min(1)
  .refine((value) => !value.includes("://") && !value.includes("/"), "Must be a raw extension ID.");

const extensionOrigin = z
  .string()
  .trim()
  .refine(
    (value) => value.startsWith("chrome-extension://") || value.startsWith("https://"),
    "Must be a chrome-extension:// or https:// origin.",
  );

const serverEnvSchema = z.object({
  DATABASE_URL: nonEmptyString,
  NEXT_PUBLIC_INSFORGE_URL: z.url(),
  NEXT_PUBLIC_INSFORGE_ANON_KEY: nonEmptyString,
  INSFORGE_URL: z.url(),
  INSFORGE_ANON_KEY: nonEmptyString,
  INSFORGE_SERVICE_KEY: nonEmptyString,
  INSFORGE_PROJECT_ADMIN_EMAIL: z.email(),
  INSFORGE_PROJECT_ADMIN_PASSWORD: nonEmptyString,
  APP_SESSION_SECRET: nonEmptyString.min(32, "APP_SESSION_SECRET must be at least 32 characters."),
  APP_SESSION_COOKIE_NAME: z.literal("app_session").default("app_session"),
  EXTENSION_ALLOWED_IDS: commaSeparatedValues.pipe(z.array(extensionId).min(1)),
  EXTENSION_ALLOWED_ORIGINS: commaSeparatedValues.pipe(z.array(extensionOrigin).min(1)),
  CRON_SECRET: nonEmptyString,
  TRUSTED_PROXY_IP_HEADER: nonEmptyString,
  TRUSTED_PROXY_CITY_HEADER: nonEmptyString,
  TRUSTED_PROXY_COUNTRY_HEADER: nonEmptyString,
});

const parsedServerEnv = serverEnvSchema.safeParse(process.env);

if (!parsedServerEnv.success) {
  throw new Error(`Invalid server environment variables:\n${z.prettifyError(parsedServerEnv.error)}`);
}

export const env = parsedServerEnv.data;

export type AppEnv = typeof env;
