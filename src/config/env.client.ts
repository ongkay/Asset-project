import { z } from "zod";

const nonEmptyString = z.string().trim().min(1);

const clientEnvSchema = z.object({
  NEXT_PUBLIC_INSFORGE_URL: z.url(),
  NEXT_PUBLIC_INSFORGE_ANON_KEY: nonEmptyString,
});

const parsedClientEnv = clientEnvSchema.safeParse({
  NEXT_PUBLIC_INSFORGE_URL: process.env.NEXT_PUBLIC_INSFORGE_URL,
  NEXT_PUBLIC_INSFORGE_ANON_KEY: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY,
});

if (!parsedClientEnv.success) {
  throw new Error(`Invalid public environment variables:\n${z.prettifyError(parsedClientEnv.error)}`);
}

export const publicEnv = parsedClientEnv.data;

export type PublicAppEnv = typeof publicEnv;
