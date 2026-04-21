import { describe, expect, it } from "vitest";

import {
  EXTENSION_HARNESS_HISTORY_STORAGE_KEY,
  appendHarnessHistoryEntry,
  parseHarnessHistory,
} from "@/app/(extension-dev)/console/extension-harness/_components/extension-harness-state";

describe("extension harness state", () => {
  it("parses an empty history safely", () => {
    expect(parseHarnessHistory(null)).toEqual([]);
    expect(parseHarnessHistory("not-json")).toEqual([]);
  });

  it("prepends the latest history entry and trims to the newest 10 items", () => {
    const currentEntries = Array.from({ length: 10 }, (_, index) => ({
      executedAt: `2026-04-21T13:0${index}:00.000Z`,
      expectedStatus: 200,
      id: `entry-${index}`,
      scenarioId: `scenario-${index}`,
      status: 200,
      summary: "PASS",
    }));

    const nextEntries = appendHarnessHistoryEntry(currentEntries, {
      executedAt: "2026-04-21T13:10:00.000Z",
      expectedStatus: 403,
      id: "entry-10",
      scenarioId: "denied-origin",
      status: 403,
      summary: "PASS",
    });

    expect(EXTENSION_HARNESS_HISTORY_STORAGE_KEY).toBe("console.extension-harness.history.v1");
    expect(nextEntries).toHaveLength(10);
    expect(nextEntries[0]?.id).toBe("entry-10");
    expect(nextEntries.at(-1)?.id).toBe("entry-8");
  });
});
