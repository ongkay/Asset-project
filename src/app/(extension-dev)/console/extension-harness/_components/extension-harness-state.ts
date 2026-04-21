export const EXTENSION_HARNESS_HISTORY_STORAGE_KEY = "console.extension-harness.history.v1";
export const EXTENSION_HARNESS_EDITOR_STORAGE_KEY = "console.extension-harness.editor.v1";
export const EXTENSION_HARNESS_SCENARIO_STORAGE_KEY = "console.extension-harness.scenario.v1";

export type ExtensionHarnessHistoryEntry = {
  executedAt: string;
  expectedStatus: number;
  id: string;
  scenarioId: string;
  status: number;
  summary: string;
};

export function parseHarnessHistory(rawValue: string | null): ExtensionHarnessHistoryEntry[] {
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendHarnessHistoryEntry(
  currentEntries: ExtensionHarnessHistoryEntry[],
  nextEntry: ExtensionHarnessHistoryEntry,
) {
  return [nextEntry, ...currentEntries].slice(0, 10);
}
