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
  type ExtensionHarnessScenario,
  type ExtensionHarnessScenarioId,
} from "./extension-scenario-list";

type HarnessBridgeResponse = {
  body: unknown;
  status: number;
};

type ExtensionHarnessVariant = "allowed" | "denied";
type ExtensionHarnessSessionContext = {
  firstAssetId: string;
  requestNonce: string;
};

const ALLOWED_EXTENSION_PLACEHOLDER = "allowed-id";
const DENIED_EXTENSION_PLACEHOLDER = "denied-id";
const DENIED_SCENARIO_ID = "denied-origin" satisfies ExtensionHarnessScenarioId;
const ASSET_ID_PLACEHOLDER = "TV-001";
const REQUEST_NONCE_PLACEHOLDER = "replace-from-session-response";

function isAssetScenario(scenarioId: ExtensionHarnessScenarioId) {
  return scenarioId === "asset-success" || scenarioId === "asset-missing-nonce" || scenarioId === "asset-invalid-nonce";
}

function extractSessionContextFromResponseBody(body: unknown): ExtensionHarnessSessionContext | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const requestNonce =
    "requestNonce" in body &&
    body.requestNonce &&
    typeof body.requestNonce === "object" &&
    "value" in body.requestNonce &&
    typeof body.requestNonce.value === "string"
      ? body.requestNonce.value
      : null;

  const firstAssetId =
    "subscription" in body &&
    body.subscription &&
    typeof body.subscription === "object" &&
    "assets" in body.subscription &&
    Array.isArray(body.subscription.assets) &&
    body.subscription.assets[0] &&
    typeof body.subscription.assets[0] === "object" &&
    "id" in body.subscription.assets[0] &&
    typeof body.subscription.assets[0].id === "string"
      ? body.subscription.assets[0].id
      : null;

  if (!requestNonce || !firstAssetId) {
    return null;
  }

  return {
    firstAssetId,
    requestNonce,
  };
}

function getScenarioRequestById(scenarioId: string | null) {
  return extensionHarnessScenarios.find((scenario) => scenario.id === scenarioId) ?? extensionHarnessScenarios[0];
}

function getScenarioVariant(scenarioId: ExtensionHarnessScenarioId): ExtensionHarnessVariant {
  return scenarioId === DENIED_SCENARIO_ID ? "denied" : "allowed";
}

function replaceEditorExtensionIdentity(editorValue: string, extensionId: string) {
  const extensionOrigin = `chrome-extension://${extensionId}`;

  return editorValue
    .replaceAll(`chrome-extension://${ALLOWED_EXTENSION_PLACEHOLDER}`, extensionOrigin)
    .replaceAll(`chrome-extension://${DENIED_EXTENSION_PLACEHOLDER}`, extensionOrigin)
    .replaceAll(`"${ALLOWED_EXTENSION_PLACEHOLDER}"`, `"${extensionId}"`)
    .replaceAll(`"${DENIED_EXTENSION_PLACEHOLDER}"`, `"${extensionId}"`);
}

function replaceAssetScenarioContext(editorValue: string, sessionContext: ExtensionHarnessSessionContext | null) {
  if (!sessionContext) {
    return editorValue;
  }

  return editorValue
    .replaceAll(REQUEST_NONCE_PLACEHOLDER, sessionContext.requestNonce)
    .replaceAll(`id=${ASSET_ID_PLACEHOLDER}`, `id=${sessionContext.firstAssetId}`);
}

function getExtensionIdForVariant(input: {
  allowedIds: string[];
  deniedIds: string[];
  variant: ExtensionHarnessVariant;
}) {
  if (input.variant === "denied") {
    return input.deniedIds[0] ?? DENIED_EXTENSION_PLACEHOLDER;
  }

  return input.allowedIds[0] ?? ALLOWED_EXTENSION_PLACEHOLDER;
}

function createScenarioEditorValue(input: {
  allowedIds: string[];
  deniedIds: string[];
  latestSessionContext: ExtensionHarnessSessionContext | null;
  scenario: ExtensionHarnessScenario;
}) {
  return replaceAssetScenarioContext(
    replaceEditorExtensionIdentity(
      JSON.stringify(input.scenario.request, null, 2),
      getExtensionIdForVariant({
        allowedIds: input.allowedIds,
        deniedIds: input.deniedIds,
        variant: getScenarioVariant(input.scenario.id),
      }),
    ),
    isAssetScenario(input.scenario.id) ? input.latestSessionContext : null,
  );
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
  const [requestEditorValue, setRequestEditorValue] = useState(
    createScenarioEditorValue({
      allowedIds: props.allowedIds,
      deniedIds: [],
      latestSessionContext: null,
      scenario: defaultScenario,
    }),
  );
  const [detectedDeniedIds, setDetectedDeniedIds] = useState<string[]>([]);
  const [latestSessionContext, setLatestSessionContext] = useState<ExtensionHarnessSessionContext | null>(null);
  const [latestResponse, setLatestResponse] = useState<HarnessBridgeResponse | null>(null);
  const [connectionState, setConnectionState] = useState<"waiting" | "ready">("waiting");

  const selectedScenario = getScenarioRequestById(selectedScenarioId);
  const selectedVariant = getScenarioVariant(selectedScenario.id);
  const activeExtensionId = getExtensionIdForVariant({
    allowedIds: props.allowedIds,
    deniedIds: detectedDeniedIds,
    variant: selectedVariant,
  });

  useEffect(() => {
    const persistedScenario = getScenarioRequestById(
      window.localStorage.getItem(EXTENSION_HARNESS_SCENARIO_STORAGE_KEY),
    );
    const persistedEditorValue = replaceEditorExtensionIdentity(
      window.localStorage.getItem(EXTENSION_HARNESS_EDITOR_STORAGE_KEY) ??
        JSON.stringify(persistedScenario.request, null, 2),
      getExtensionIdForVariant({
        allowedIds: props.allowedIds,
        deniedIds: [],
        variant: getScenarioVariant(persistedScenario.id),
      }),
    );

    queueMicrotask(() => {
      setHistory(parseHarnessHistory(window.localStorage.getItem(EXTENSION_HARNESS_HISTORY_STORAGE_KEY)));
      setSelectedScenarioId(persistedScenario.id);
      setRequestEditorValue(persistedEditorValue);
    });
  }, [props.allowedIds]);

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

        const runtimeExtensionId =
          typeof event.data.extensionId === "string" && event.data.extensionId.length > 0
            ? event.data.extensionId
            : null;

        if (!runtimeExtensionId || props.allowedIds.includes(runtimeExtensionId)) {
          return;
        }

        setDetectedDeniedIds((currentDeniedIds) => {
          if (currentDeniedIds.includes(runtimeExtensionId)) {
            return currentDeniedIds;
          }

          return [...currentDeniedIds, runtimeExtensionId];
        });

        if (getScenarioVariant(selectedScenario.id) === "denied") {
          setRequestEditorValue((currentEditorValue) =>
            replaceEditorExtensionIdentity(currentEditorValue, runtimeExtensionId),
          );
        }

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

      if (
        nextResponse.status === 200 &&
        (selectedScenario.id === "session-success" || selectedScenario.id === "session-processed")
      ) {
        setLatestSessionContext(extractSessionContextFromResponseBody(nextResponse.body));
      }

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
  }, [props.allowedIds, selectedScenario.expectedStatus, selectedScenario.id]);

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
    setRequestEditorValue(
      createScenarioEditorValue({
        allowedIds: props.allowedIds,
        deniedIds: detectedDeniedIds,
        latestSessionContext,
        scenario: nextScenario,
      }),
    );
  }

  function handleSelectVariant(nextVariant: ExtensionHarnessVariant) {
    if (nextVariant === "denied") {
      handleSelectScenario(DENIED_SCENARIO_ID);
      return;
    }

    handleSelectScenario(selectedScenario.id === DENIED_SCENARIO_ID ? defaultScenario.id : selectedScenario.id);
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
          activeExtensionId={activeExtensionId}
          onChangeEditorValue={setRequestEditorValue}
          onRunScenario={handleRunScenario}
          onSelectVariant={handleSelectVariant}
          scenario={selectedScenario}
          selectedVariant={selectedVariant}
        />
      </div>

      <ExtensionResponseViewer history={history} latestResponse={latestResponse} />
    </div>
  );
}
