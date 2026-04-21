import { describe, expect, it } from "vitest";

import {
  extensionAssetDetailRpcSchema,
  extensionConsoleSnapshotRpcSchema,
  extensionTrackHeartbeatInputSchema,
} from "@/modules/extension/schemas";

describe("extension schemas", () => {
  it("accepts console snapshot rows that only expose active valid assets", () => {
    expect(
      extensionConsoleSnapshotRpcSchema.parse({
        subscription: {
          days_left: 12,
          end_at: "2026-05-01T00:00:00.000Z",
          id: "11111111-1111-4111-8111-111111111111",
          package_id: "22222222-2222-4222-8222-222222222222",
          package_name: "Starter",
          start_at: "2026-04-01T00:00:00.000Z",
          status: "processed",
        },
        assets: [
          {
            access_key: "tradingview:private",
            asset_type: "private",
            assignment_id: "33333333-3333-4333-8333-333333333333",
            expires_at: "2026-05-01T00:00:00.000Z",
            id: "TV-001",
            note: null,
            platform: "tradingview",
            proxy: null,
            subscription_id: "11111111-1111-4111-8111-111111111111",
          },
        ],
        transactions: [],
      }),
    ).toBeTruthy();
  });

  it("accepts raw asset detail rows returned by get_user_asset_detail", () => {
    expect(
      extensionAssetDetailRpcSchema.parse({
        access_key: "fxreplay:share",
        account: "account-1",
        asset_json: [{ name: "session", value: "cookie-1" }],
        asset_type: "share",
        expires_at: "2026-05-01T00:00:00.000Z",
        id: "20000000-0000-0000-0000-000000000003",
        note: "Seed share asset",
        platform: "fxreplay",
        proxy: null,
        subscription_id: "44444444-4444-4444-8444-444444444444",
      }),
    ).toBeTruthy();
  });

  it("accepts the track request body without extensionId because the ID comes from the header", () => {
    expect(
      extensionTrackHeartbeatInputSchema.parse({
        browser: "Chrome",
        deviceId: "m11-allowed-primary",
        extensionVersion: "0.0.1",
        os: "macOS",
      }),
    ).toEqual({
      browser: "Chrome",
      deviceId: "m11-allowed-primary",
      extensionVersion: "0.0.1",
      os: "macOS",
    });
  });
});
