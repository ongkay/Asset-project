import "server-only";

import { z } from "zod";

import { createInsForgeAdminDatabase } from "@/lib/insforge/database";

import { EXT_PLATFORMS } from "./platforms";
import { extModeSchema, extPlatformSchema } from "./schemas";

const extAppConfigRowSchema = z.object({
  download_url: z.string().min(1),
  extension_key: z.string().min(1),
  is_active: z.boolean(),
  latest_version: z.string().min(1),
  minimum_version: z.string().min(1),
});

const extPlatformAccessRowSchema = z.object({
  access_key: z.string().min(1),
  asset_platform: extPlatformSchema,
});

const extAssetCookieSchema = z.object({
  domain: z.string().min(1).optional(),
  expirationDate: z.number().int().optional(),
  httpOnly: z.boolean().default(false),
  name: z.string().min(1),
  path: z.string().min(1).default("/"),
  sameSite: z.enum(["lax", "no_restriction", "strict", "unspecified"]).default("no_restriction"),
  secure: z.boolean().default(true),
  value: z.string().min(1),
});

const extAssetSecretRowSchema = z.object({
  asset_json: z.array(extAssetCookieSchema),
  proxy: z.string().nullable(),
});

const extPurchasablePackageRowSchema = z.object({
  access_keys_json: z.array(z.string()),
  amount_rp: z.number().int().nonnegative(),
  checkout_url: z.string().nullable(),
  id: z.string().min(1),
  name: z.string().min(1),
});

const extHeartbeatRowSchema = z.object({
  first_seen_at: z.string().min(1),
  id: z.string().min(1),
  last_seen_at: z.string().min(1),
});

function updateExtHeartbeatByFingerprint(input: {
  browser: string;
  city: string | null;
  country: string | null;
  database: ReturnType<typeof createInsForgeAdminDatabase>;
  deviceId: string;
  extensionId: string;
  extensionVersion: string;
  ipAddress: string;
  nowIso: string;
  origin: string;
  os: string;
  sessionId: string;
  userId: string;
}) {
  return input.database
    .from("extension_tracks")
    .update({
      city: input.city,
      country: input.country,
      extension_version: input.extensionVersion,
      last_seen_at: input.nowIso,
      session_id: input.sessionId,
    })
    .eq("user_id", input.userId)
    .eq("device_id", input.deviceId)
    .eq("extension_id", input.extensionId)
    .eq("origin", input.origin)
    .eq("ip_address", input.ipAddress)
    .eq("browser", input.browser)
    .eq("os", input.os)
    .select("id, first_seen_at, last_seen_at")
    .maybeSingle();
}

export async function readExtAppConfig(extensionKey: string) {
  const { data, error } = await createInsForgeAdminDatabase()
    .from("extension_app_configs")
    .select("extension_key, latest_version, minimum_version, download_url, is_active")
    .eq("extension_key", extensionKey)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const row = extAppConfigRowSchema.parse(data);

  return {
    downloadUrl: row.download_url,
    extensionKey: row.extension_key,
    isActive: row.is_active,
    latestVersion: row.latest_version,
    minimumVersion: row.minimum_version,
  };
}

export async function readExtPlatformAccessByUserId(userId: string) {
  const { data, error } = await createInsForgeAdminDatabase()
    .from("asset_assignments")
    .select("access_key, asset_platform")
    .eq("user_id", userId)
    .is("revoked_at", null);

  if (error) {
    throw error;
  }

  const rows = z.array(extPlatformAccessRowSchema).parse(data ?? []);
  const byPlatform = new Map<
    z.infer<typeof extPlatformSchema>,
    { hasPrivateAccess: boolean; hasShareAccess: boolean }
  >();

  for (const row of rows) {
    const current = byPlatform.get(row.asset_platform) ?? {
      hasPrivateAccess: false,
      hasShareAccess: false,
    };

    current.hasPrivateAccess ||= row.access_key.endsWith(":private");
    current.hasShareAccess ||= row.access_key.endsWith(":share");
    byPlatform.set(row.asset_platform, current);
  }

  return [...byPlatform.entries()].map(([platform, value]) => ({
    ...value,
    platform,
  }));
}

export async function readExtAssetSecretByUserId(input: {
  mode: z.infer<typeof extModeSchema>;
  platform: z.infer<typeof extPlatformSchema>;
  userId: string;
}) {
  const accessKey = `${input.platform}:${input.mode}`;
  const { data, error } = await createInsForgeAdminDatabase()
    .from("asset_assignments")
    .select("assets!inner(proxy, asset_json)")
    .eq("user_id", input.userId)
    .eq("access_key", accessKey)
    .is("revoked_at", null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data || !("assets" in data) || !data.assets) {
    return null;
  }

  const asset = extAssetSecretRowSchema.parse(data.assets);
  const defaultCookieDomain = EXT_PLATFORMS[input.platform].cookieDomains[0];

  return {
    cookies: asset.asset_json.map((cookie) => ({
      ...cookie,
      domain: cookie.domain ?? defaultCookieDomain,
    })),
    proxy: asset.proxy,
  };
}

export async function readExtPurchasablePackages() {
  const { data, error } = await createInsForgeAdminDatabase()
    .from("packages")
    .select("id, name, amount_rp, checkout_url, access_keys_json")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return z
    .array(extPurchasablePackageRowSchema)
    .parse(data ?? [])
    .map((row) => {
      const hasPrivateAccess = row.access_keys_json.some((value) => value.endsWith(":private"));
      const hasShareAccess = row.access_keys_json.some((value) => value.endsWith(":share"));

      return {
        amountRp: row.amount_rp,
        checkoutUrl: `/paymentdummy?packageId=${row.id}`,
        id: row.id,
        name: row.name,
        summary: hasPrivateAccess && hasShareAccess ? "mixed" : hasPrivateAccess ? "private" : "share",
      };
    });
}

export async function upsertExtHeartbeatByFingerprint(input: {
  browser: string;
  city: string | null;
  country: string | null;
  deviceId: string;
  extensionId: string;
  extensionVersion: string;
  ipAddress: string;
  origin: string;
  os: string;
  sessionId: string;
  userId: string;
}) {
  const nowIso = new Date().toISOString();
  const database = createInsForgeAdminDatabase();
  const { data: updatedRow, error: updateError } = await updateExtHeartbeatByFingerprint({
    ...input,
    database,
    nowIso,
  });

  if (updateError) {
    throw updateError;
  }

  if (updatedRow) {
    return extHeartbeatRowSchema.parse(updatedRow);
  }

  const { data: insertedRow, error: insertError } = await database
    .from("extension_tracks")
    .insert([
      {
        browser: input.browser,
        city: input.city,
        country: input.country,
        device_id: input.deviceId,
        extension_id: input.extensionId,
        extension_version: input.extensionVersion,
        first_seen_at: nowIso,
        ip_address: input.ipAddress,
        last_seen_at: nowIso,
        origin: input.origin,
        os: input.os,
        session_id: input.sessionId,
        user_id: input.userId,
      },
    ])
    .select("id, first_seen_at, last_seen_at")
    .single();

  if (insertError) {
    if (insertError.code !== "23505") {
      throw insertError;
    }

    const { data: racedUpdateRow, error: racedUpdateError } = await updateExtHeartbeatByFingerprint({
      ...input,
      database,
      nowIso,
    });

    if (racedUpdateError) {
      throw racedUpdateError;
    }

    if (!racedUpdateRow) {
      throw insertError;
    }

    return extHeartbeatRowSchema.parse(racedUpdateRow);
  }

  return extHeartbeatRowSchema.parse(insertedRow);
}
