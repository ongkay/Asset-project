import { describe, expect, it } from "vitest";

import { deriveConsoleStateSnapshot } from "@/modules/console/queries";

describe("deriveConsoleStateSnapshot", () => {
  const now = new Date("2026-04-19T12:00:00.000Z");

  it("returns none when the user has no subscription history", () => {
    expect(deriveConsoleStateSnapshot(null, now)).toEqual({
      latestSubscription: null,
      state: "none",
    });
  });

  it("keeps a running processed subscription as processed", () => {
    expect(
      deriveConsoleStateSnapshot(
        {
          endAt: "2026-05-19T12:00:00.000Z",
          id: "sub-1",
          packageId: "pkg-1",
          packageName: "Paket 1",
          startAt: "2026-04-10T12:00:00.000Z",
          status: "processed",
        },
        now,
      ),
    ).toEqual({
      latestSubscription: {
        endAt: "2026-05-19T12:00:00.000Z",
        id: "sub-1",
        packageId: "pkg-1",
        packageName: "Paket 1",
        startAt: "2026-04-10T12:00:00.000Z",
        status: "processed",
      },
      state: "processed",
    });
  });

  it("derives an ended active subscription as expired", () => {
    expect(
      deriveConsoleStateSnapshot(
        {
          endAt: "2026-04-18T12:00:00.000Z",
          id: "sub-2",
          packageId: "pkg-2",
          packageName: "Paket 2",
          startAt: "2026-03-18T12:00:00.000Z",
          status: "active",
        },
        now,
      ),
    ).toEqual({
      latestSubscription: {
        endAt: "2026-04-18T12:00:00.000Z",
        id: "sub-2",
        packageId: "pkg-2",
        packageName: "Paket 2",
        startAt: "2026-03-18T12:00:00.000Z",
        status: "expired",
      },
      state: "expired",
    });
  });

  it("preserves canceled as the explicit non-running state", () => {
    expect(
      deriveConsoleStateSnapshot(
        {
          endAt: "2026-04-25T12:00:00.000Z",
          id: "sub-3",
          packageId: "pkg-3",
          packageName: "Paket 3",
          startAt: "2026-04-01T12:00:00.000Z",
          status: "canceled",
        },
        now,
      ),
    ).toEqual({
      latestSubscription: {
        endAt: "2026-04-25T12:00:00.000Z",
        id: "sub-3",
        packageId: "pkg-3",
        packageName: "Paket 3",
        startAt: "2026-04-01T12:00:00.000Z",
        status: "canceled",
      },
      state: "canceled",
    });
  });
});
