"use client";

import { useEffect, useState } from "react";

import {
  EXTENSION_HARNESS_EDITOR_STORAGE_KEY,
  EXTENSION_HARNESS_HISTORY_STORAGE_KEY,
  EXTENSION_HARNESS_SCENARIO_STORAGE_KEY,
  appendHarnessHistoryEntry,
  parseHarnessHistory,
  type ExtensionHarnessHistoryEntry,
} from "./extension-harness-state";
import { ExtensionRequestPanel } from "./extension-request-panel";
import { ExtensionResponseViewer } from "./extension-response-viewer";
import {
  extensionHarnessScenarios,
  ExtensionScenarioList,
  type ExtensionHarnessScenarioId,
} from "./extension-scenario-list";

type HarnessBridgeResponse = {
  body: unknown;
  status: number;
};

function getScenarioRequestById(scenarioId: string | null) {
  return extensionHarnessScenarios.find((scenario) => scenario.id === scenarioId) ?? extensionHarnessScenarios[0];
}

function createHistoryEntry(input: {
  expectedStatus: number;
  scenarioId: string;
  status: number;
}): ExtensionHarnessHistoryEntry {
  return {
    executedAt: new Date().toISOString(),
    expectedStatus: input.expectedStatus,
    id: crypto.randomUUID(),
    scenarioId: input.scenarioId,
    status: input.status,
    summary: input.status === input.expectedStatus ? "PASS" : "FAIL",
  };
}

export function ExtensionHarnessShell(props: {
  allowedIds: string[];
  allowedOrigins: string[];
  currentUser: { email: string; role: string; username: string };
}) {
  const defaultScenario = extensionHarnessScenarios[0];
  const [history, setHistory] = useState<ExtensionHarnessHistoryEntry[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<ExtensionHarnessScenarioId>(defaultScenario.id);
  const [requestEditorValue, setRequestEditorValue] = useState(JSON.stringify(defaultScenario.request, null, 2));
  const [latestResponse, setLatestResponse] = useState<HarnessBridgeResponse | null>(null);
  const [connectionState, setConnectionState] = useState<"waiting" | "ready">("waiting");

  const selectedScenario = getScenarioRequestById(selectedScenarioId);

  useEffect(() => {
    const persistedScenario = getScenarioRequestById(
      window.localStorage.getItem(EXTENSION_HARNESS_SCENARIO_STORAGE_KEY),
    );
    const persistedEditorValue =
      window.localStorage.getItem(EXTENSION_HARNESS_EDITOR_STORAGE_KEY) ??
      JSON.stringify(persistedScenario.request, null, 2);

    queueMicrotask(() => {
      setHistory(parseHarnessHistory(window.localStorage.getItem(EXTENSION_HARNESS_HISTORY_STORAGE_KEY)));
      setSelectedScenarioId(persistedScenario.id);
      setRequestEditorValue(persistedEditorValue);
    });
  }, []);

  useEffect(() => {
    window.localStorage.setItem(EXTENSION_HARNESS_HISTORY_STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    window.localStorage.setItem(EXTENSION_HARNESS_SCENARIO_STORAGE_KEY, selectedScenarioId);
  }, [selectedScenarioId]);

  useEffect(() => {
    window.localStorage.setItem(EXTENSION_HARNESS_EDITOR_STORAGE_KEY, requestEditorValue);
  }, [requestEditorValue]);

  useEffect(() => {
    function handleWindowMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.data?.source !== "assetnext-extension-harness-extension") {
        return;
      }

      if (event.data.type === "ready") {
        setConnectionState("ready");
        return;
      }

      if (event.data.type !== "result") {
        return;
      }

      if (!event.data.response) {
        return;
      }

      const nextResponse = {
        body: event.data.response.body,
        status: event.data.response.status,
      } satisfies HarnessBridgeResponse;

      setLatestResponse(nextResponse);
      setHistory((currentEntries) =>
        appendHarnessHistoryEntry(
          currentEntries,
          createHistoryEntry({
            expectedStatus: selectedScenario.expectedStatus,
            scenarioId: selectedScenario.id,
            status: nextResponse.status,
          }),
        ),
      );
    }

    window.addEventListener("message", handleWindowMessage);

    window.postMessage(
      {
        source: "assetnext-extension-harness-page",
        type: "handshake",
      },
      window.location.origin,
    );

    return () => window.removeEventListener("message", handleWindowMessage);
  }, [selectedScenario.expectedStatus, selectedScenario.id]);

  async function handleRunScenario() {
    try {
      const payload = JSON.parse(requestEditorValue) as {
        body?: unknown;
        headers: Record<string, string>;
        method: string;
        url: string;
      };

      window.postMessage(
        {
          payload: {
            ...payload,
            url: new URL(payload.url, window.location.origin).toString(),
          },
          source: "assetnext-extension-harness-page",
          type: "request",
        },
        window.location.origin,
      );
    } catch (error) {
      const nextResponse = {
        body: {
          error: {
            code: "HARNESS_EDITOR_INVALID",
            message: error instanceof Error ? error.message : "Raw request JSON is invalid.",
          },
        },
        status: 0,
      } satisfies HarnessBridgeResponse;

      setLatestResponse(nextResponse);
      setHistory((currentEntries) =>
        appendHarnessHistoryEntry(
          currentEntries,
          createHistoryEntry({
            expectedStatus: selectedScenario.expectedStatus,
            scenarioId: selectedScenario.id,
            status: 0,
          }),
        ),
      );
    }
  }

  function handleSelectScenario(nextScenarioId: ExtensionHarnessScenarioId) {
    const nextScenario = getScenarioRequestById(nextScenarioId);

    setSelectedScenarioId(nextScenarioId);
    setRequestEditorValue(JSON.stringify(nextScenario.request, null, 2));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <ExtensionScenarioList
          history={history}
          onSelectScenario={handleSelectScenario}
          selectedScenarioId={selectedScenarioId}
        />
        <ExtensionRequestPanel
          allowedIds={props.allowedIds}
          allowedOrigins={props.allowedOrigins}
          connectionState={connectionState}
          currentUser={props.currentUser}
          editorValue={requestEditorValue}
          onChangeEditorValue={setRequestEditorValue}
          onRunScenario={handleRunScenario}
          scenario={selectedScenario}
        />
      </div>

      <ExtensionResponseViewer history={history} latestResponse={latestResponse} />
    </div>
  );
}
