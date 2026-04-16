import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/assets/repositories", () => ({
  countActiveAssignmentsByAssetId: vi.fn(),
  createAssetRow: vi.fn(),
  deleteAssetRowSafely: vi.fn(),
  getAssetById: vi.fn(),
  recheckAssetSubscriptionsAfterChange: vi.fn(),
  toggleAssetDisabledRow: vi.fn(),
  updateAssetRow: vi.fn(),
}));

import * as assetRepositories from "@/modules/assets/repositories";
import {
  buildDefaultAssetExpiry,
  createAsset,
  deleteAssetSafely,
  toggleAssetDisabled,
  updateAsset,
} from "@/modules/assets/services";

import type { AssetFormInput, AssetRow } from "@/modules/assets/types";

const mockedCountActiveAssignmentsByAssetId = vi.mocked(assetRepositories.countActiveAssignmentsByAssetId);
const mockedCreateAssetRow = vi.mocked(assetRepositories.createAssetRow);
const mockedDeleteAssetRowSafely = vi.mocked(assetRepositories.deleteAssetRowSafely);
const mockedGetAssetById = vi.mocked(assetRepositories.getAssetById);
const mockedRecheckAssetSubscriptionsAfterChange = vi.mocked(assetRepositories.recheckAssetSubscriptionsAfterChange);
const mockedToggleAssetDisabledRow = vi.mocked(assetRepositories.toggleAssetDisabledRow);
const mockedUpdateAssetRow = vi.mocked(assetRepositories.updateAssetRow);

function createAssetInput(overrides: Partial<AssetFormInput> = {}): AssetFormInput {
  return {
    platform: "tradingview",
    assetType: "private",
    account: "asset@example.com",
    note: "Asset note",
    proxy: null,
    assetJson: { session: "token" },
    expiresAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

function createAssetRowFixture(overrides: Partial<AssetRow> = {}): AssetRow {
  return {
    id: "asset-1",
    platform: "tradingview",
    assetType: "private",
    account: "asset@example.com",
    note: "Asset note",
    proxy: null,
    assetJson: { session: "token" },
    expiresAt: "2026-07-01T00:00:00.000Z",
    disabledAt: null,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("assets/services", () => {
  beforeEach(() => {
    mockedCountActiveAssignmentsByAssetId.mockResolvedValue(0);
    mockedCreateAssetRow.mockResolvedValue(createAssetRowFixture());
    mockedDeleteAssetRowSafely.mockResolvedValue(undefined);
    mockedGetAssetById.mockResolvedValue(createAssetRowFixture());
    mockedRecheckAssetSubscriptionsAfterChange.mockResolvedValue(undefined);
    mockedToggleAssetDisabledRow.mockResolvedValue(createAssetRowFixture({ disabledAt: "2026-06-10T00:00:00.000Z" }));
    mockedUpdateAssetRow.mockResolvedValue(createAssetRowFixture());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("builds the default expiry 30 days from the provided date", () => {
    expect(buildDefaultAssetExpiry(new Date("2026-01-01T00:00:00.000Z"))).toBe("2026-01-31T00:00:00.000Z");
  });

  it("delegates createAsset to createAssetRow", async () => {
    const input = createAssetInput();

    await expect(createAsset(input)).resolves.toEqual(createAssetRowFixture());
    expect(mockedCreateAssetRow).toHaveBeenCalledWith(input);
  });

  it("throws when updating a missing asset", async () => {
    mockedGetAssetById.mockResolvedValueOnce(null);

    await expect(updateAsset({ id: "missing-asset", ...createAssetInput() })).rejects.toThrow("Asset not found.");
    expect(mockedUpdateAssetRow).not.toHaveBeenCalled();
  });

  it("rejects platform or asset type changes while the asset is in use", async () => {
    mockedCountActiveAssignmentsByAssetId.mockResolvedValueOnce(1);

    await expect(
      updateAsset({
        id: "asset-1",
        ...createAssetInput({
          platform: "fxreplay",
          assetType: "share",
        }),
      }),
    ).rejects.toThrow("Platform or asset type cannot be changed while the asset is still in use.");

    expect(mockedUpdateAssetRow).not.toHaveBeenCalled();
  });

  it("rechecks subscriptions when an in-use asset is updated to an already expired expiry", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T00:00:00.000Z"));

    mockedCountActiveAssignmentsByAssetId.mockResolvedValueOnce(2);
    mockedGetAssetById.mockResolvedValueOnce(createAssetRowFixture({ expiresAt: "2026-07-01T00:00:00.000Z" }));
    mockedUpdateAssetRow.mockResolvedValueOnce(createAssetRowFixture({ expiresAt: "2026-05-01T00:00:00.000Z" }));

    await updateAsset({
      id: "asset-1",
      ...createAssetInput({ expiresAt: "2026-05-01T00:00:00.000Z" }),
    });

    expect(mockedUpdateAssetRow).toHaveBeenCalledOnce();
    expect(mockedRecheckAssetSubscriptionsAfterChange).toHaveBeenCalledWith({ id: "asset-1" });
  });

  it("does not recheck subscriptions when the updated expiry is still in the future", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T00:00:00.000Z"));

    mockedCountActiveAssignmentsByAssetId.mockResolvedValueOnce(2);
    mockedGetAssetById.mockResolvedValueOnce(createAssetRowFixture({ expiresAt: "2026-07-01T00:00:00.000Z" }));
    mockedUpdateAssetRow.mockResolvedValueOnce(createAssetRowFixture({ expiresAt: "2026-08-01T00:00:00.000Z" }));

    await updateAsset({
      id: "asset-1",
      ...createAssetInput({ expiresAt: "2026-08-01T00:00:00.000Z" }),
    });

    expect(mockedRecheckAssetSubscriptionsAfterChange).not.toHaveBeenCalled();
  });

  it("rechecks subscriptions after disabling an asset", async () => {
    await toggleAssetDisabled({ id: "asset-1", disabled: true });

    expect(mockedToggleAssetDisabledRow).toHaveBeenCalledWith({ id: "asset-1", disabled: true });
    expect(mockedRecheckAssetSubscriptionsAfterChange).toHaveBeenCalledWith({ id: "asset-1" });
    expect(mockedToggleAssetDisabledRow.mock.invocationCallOrder[0]).toBeLessThan(
      mockedRecheckAssetSubscriptionsAfterChange.mock.invocationCallOrder[0],
    );
  });

  it("does not recheck subscriptions when re-enabling an asset", async () => {
    await toggleAssetDisabled({ id: "asset-1", disabled: false });

    expect(mockedToggleAssetDisabledRow).toHaveBeenCalledWith({ id: "asset-1", disabled: false });
    expect(mockedRecheckAssetSubscriptionsAfterChange).not.toHaveBeenCalled();
  });

  it("delegates deleteAssetSafely to deleteAssetRowSafely", async () => {
    await expect(deleteAssetSafely({ id: "asset-1" })).resolves.toEqual({ id: "asset-1" });

    expect(mockedDeleteAssetRowSafely).toHaveBeenCalledWith({ id: "asset-1" });
  });
});
