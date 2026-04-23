import "server-only";

import { createInsForgeAdminDatabase } from "@/lib/insforge/database";
import { readConsoleAssetDetailByUserId, readConsoleSnapshotByUserId } from "@/modules/console/repositories";

import type {
  ExtensionNetworkMetadata,
  ExtensionTrackHeartbeatRecord,
  ExtensionTrackHeartbeatWriteInput,
} from "./types";

type ExtensionTrackRow = {
  first_seen_at: string;
  id: string;
  last_seen_at: string;
};

function getExtensionDatabase() {
  return createInsForgeAdminDatabase();
}

async function updateExistingExtensionTrackHeartbeat(input: {
  database: ReturnType<typeof getExtensionDatabase>;
  heartbeat: ExtensionTrackHeartbeatWriteInput;
  network: ExtensionNetworkMetadata;
  nowIso: string;
}) {
  return input.database
    .from("extension_tracks")
    .update({
      browser: input.heartbeat.browser,
      city: input.network.city,
      country: input.network.country,
      extension_version: input.heartbeat.extensionVersion,
      last_seen_at: input.nowIso,
      os: input.heartbeat.os,
      session_id: input.heartbeat.sessionId,
    })
    .eq("user_id", input.heartbeat.userId)
    .eq("device_id", input.heartbeat.deviceId)
    .eq("ip_address", input.network.ipAddress)
    .eq("extension_id", input.heartbeat.extensionId)
    .select("id, first_seen_at, last_seen_at")
    .maybeSingle<ExtensionTrackRow>();
}

export async function upsertExtensionTrackHeartbeat(input: {
  heartbeat: ExtensionTrackHeartbeatWriteInput;
  network: ExtensionNetworkMetadata;
}): Promise<ExtensionTrackHeartbeatRecord> {
  const database = getExtensionDatabase();
  const nowIso = new Date().toISOString();
  const { data: updatedRow, error: updateError } = await updateExistingExtensionTrackHeartbeat({
    database,
    heartbeat: input.heartbeat,
    network: input.network,
    nowIso,
  });

  if (updateError) {
    throw updateError;
  }

  if (updatedRow) {
    return {
      firstSeenAt: updatedRow.first_seen_at,
      id: updatedRow.id,
      lastSeenAt: updatedRow.last_seen_at,
    };
  }

  const { data: insertedRow, error: insertError } = await database
    .from("extension_tracks")
    .insert([
      {
        browser: input.heartbeat.browser,
        city: input.network.city,
        country: input.network.country,
        device_id: input.heartbeat.deviceId,
        extension_id: input.heartbeat.extensionId,
        extension_version: input.heartbeat.extensionVersion,
        first_seen_at: nowIso,
        ip_address: input.network.ipAddress,
        last_seen_at: nowIso,
        os: input.heartbeat.os,
        session_id: input.heartbeat.sessionId,
        user_id: input.heartbeat.userId,
      },
    ])
    .select("id, first_seen_at, last_seen_at")
    .single<ExtensionTrackRow>();

  if (insertError) {
    if (insertError.code !== "23505") {
      throw insertError;
    }

    const { data: racedUpdateRow, error: racedUpdateError } = await updateExistingExtensionTrackHeartbeat({
      database,
      heartbeat: input.heartbeat,
      network: input.network,
      nowIso,
    });

    if (racedUpdateError) {
      throw racedUpdateError;
    }

    if (!racedUpdateRow) {
      throw insertError;
    }

    return {
      firstSeenAt: racedUpdateRow.first_seen_at,
      id: racedUpdateRow.id,
      lastSeenAt: racedUpdateRow.last_seen_at,
    };
  }

  return {
    firstSeenAt: insertedRow.first_seen_at,
    id: insertedRow.id,
    lastSeenAt: insertedRow.last_seen_at,
  };
}

export async function readExtensionConsoleSnapshotRpc(userId: string) {
  return readConsoleSnapshotByUserId(userId);
}

export async function readExtensionAssetDetailRpc(input: { assetId: string; userId: string }) {
  return readConsoleAssetDetailByUserId(input);
}

export async function readExtensionAssetExistence(assetId: string) {
  const database = getExtensionDatabase();
  // This is a deliberate global existence probe so services can distinguish
  // a missing asset from an asset the current user is not allowed to access.
  const { data, error } = await database.from("assets").select("id").eq("id", assetId).maybeSingle<{ id: string }>();

  if (error) {
    throw error;
  }

  return data;
}
