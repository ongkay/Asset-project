import "server-only";

import { createInsForgeAdminDatabase } from "@/lib/insforge/database";

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

export async function upsertExtensionTrackHeartbeat(input: {
  heartbeat: ExtensionTrackHeartbeatWriteInput;
  network: ExtensionNetworkMetadata;
}): Promise<ExtensionTrackHeartbeatRecord> {
  const database = createInsForgeAdminDatabase();
  const { data, error } = await database.rpc("upsert_extension_track", {
    p_browser: input.heartbeat.browser,
    p_city: input.network.city,
    p_country: input.network.country,
    p_device_id: input.heartbeat.deviceId,
    p_extension_id: input.heartbeat.extensionId,
    p_extension_version: input.heartbeat.extensionVersion,
    p_ip_address: input.network.ipAddress,
    p_os: input.heartbeat.os,
    p_session_id: input.heartbeat.sessionId,
    p_user_id: input.heartbeat.userId,
  });

  if (error) {
    throw error;
  }

  const row = data as ExtensionTrackRow;

  return {
    firstSeenAt: row.first_seen_at,
    id: row.id,
    lastSeenAt: row.last_seen_at,
  };
}
