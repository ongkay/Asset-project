import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import type { ExtensionHarnessHistoryEntry } from "./extension-harness-state";

export const extensionHarnessScenarios = [
  {
    expectedStatus: 200,
    id: "session-success",
    label: "Session Success",
    request: {
      headers: {
        origin: "chrome-extension://allowed-id",
        "x-extension-id": "allowed-id",
      },
      method: "GET",
      url: "/api/extension/session",
    },
  },
  {
    expectedStatus: 200,
    id: "session-processed",
    label: "Session Processed",
    request: {
      headers: {
        origin: "chrome-extension://allowed-id",
        "x-extension-id": "allowed-id",
      },
      method: "GET",
      url: "/api/extension/session",
    },
  },
  {
    expectedStatus: 200,
    id: "asset-success",
    label: "Asset Success",
    request: {
      headers: {
        origin: "chrome-extension://allowed-id",
        "x-extension-id": "allowed-id",
        "x-request-nonce": "replace-from-session-response",
      },
      method: "GET",
      url: "/api/extension/asset?id=TV-001",
    },
  },
  {
    expectedStatus: 400,
    id: "asset-missing-nonce",
    label: "Asset Missing Nonce",
    request: {
      headers: {
        origin: "chrome-extension://allowed-id",
        "x-extension-id": "allowed-id",
      },
      method: "GET",
      url: "/api/extension/asset?id=TV-001",
    },
  },
  {
    expectedStatus: 400,
    id: "asset-invalid-nonce",
    label: "Asset Invalid Nonce",
    request: {
      headers: {
        origin: "chrome-extension://allowed-id",
        "x-extension-id": "allowed-id",
        "x-request-nonce": "invalid-nonce",
      },
      method: "GET",
      url: "/api/extension/asset?id=TV-001",
    },
  },
  {
    expectedStatus: 200,
    id: "track-success",
    label: "Track Success",
    request: {
      body: {
        browser: "Chrome",
        deviceId: "m11-allowed-primary",
        extensionVersion: "0.0.1",
        os: "macOS",
      },
      headers: {
        "content-type": "application/json",
        origin: "chrome-extension://allowed-id",
        "x-extension-id": "allowed-id",
      },
      method: "POST",
      url: "/api/extension/track",
    },
  },
  {
    expectedStatus: 200,
    id: "track-different-identity",
    label: "Track Different Identity",
    request: {
      body: {
        browser: "Chrome",
        deviceId: "m11-allowed-secondary",
        extensionVersion: "0.0.1",
        os: "macOS",
      },
      headers: {
        "content-type": "application/json",
        origin: "chrome-extension://allowed-id",
        "x-extension-id": "allowed-id",
      },
      method: "POST",
      url: "/api/extension/track",
    },
  },
  {
    expectedStatus: 400,
    id: "missing-extension-header",
    label: "Missing Extension Header",
    request: {
      headers: {
        origin: "chrome-extension://allowed-id",
      },
      method: "GET",
      url: "/api/extension/session",
    },
  },
  {
    expectedStatus: 403,
    id: "denied-origin",
    label: "Denied Origin",
    request: {
      body: {
        browser: "Chrome",
        deviceId: "m11-denied-origin",
        extensionVersion: "0.0.1",
        os: "macOS",
      },
      headers: {
        "content-type": "application/json",
        origin: "chrome-extension://denied-id",
        "x-extension-id": "denied-id",
      },
      method: "POST",
      url: "/api/extension/track",
    },
  },
] as const;

export type ExtensionHarnessScenario = (typeof extensionHarnessScenarios)[number];
export type ExtensionHarnessScenarioId = ExtensionHarnessScenario["id"];

export function ExtensionScenarioList(props: {
  history: ExtensionHarnessHistoryEntry[];
  onSelectScenario: (scenarioId: ExtensionHarnessScenarioId) => void;
  selectedScenarioId: ExtensionHarnessScenarioId;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Scenario Presets</CardTitle>
        <CardDescription>
          Pilih preset request yang akan dikirim oleh companion extension dari origin asli.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          {extensionHarnessScenarios.map((scenario) => (
            <Button
              key={scenario.id}
              className="justify-between"
              onClick={() => props.onSelectScenario(scenario.id)}
              variant={props.selectedScenarioId === scenario.id ? "default" : "outline"}
            >
              <span>{scenario.label}</span>
              <Badge variant={scenario.expectedStatus >= 400 ? "destructive" : "secondary"}>
                {scenario.expectedStatus}
              </Badge>
            </Button>
          ))}
        </div>

        <Separator />

        <div className="flex flex-col gap-2 text-sm">
          <p className="font-medium">Recent Runs</p>
          {props.history.length ? (
            props.history.slice(0, 3).map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border/60 px-3 py-2"
              >
                <span className="truncate text-muted-foreground">{entry.scenarioId}</span>
                <Badge variant={entry.summary === "PASS" ? "secondary" : "destructive"}>{entry.status}</Badge>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">Belum ada run tersimpan.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
