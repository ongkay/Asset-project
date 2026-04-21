// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ExtensionHarnessShell } from "@/app/(extension-dev)/console/extension-harness/_components/extension-harness-shell";

describe("extension harness shell", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    Reflect.set(globalThis as Record<string, unknown>, "IS_REACT_ACT_ENVIRONMENT", true);
    window.localStorage.clear();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root.unmount();
      });
    }

    container.remove();
    window.localStorage.clear();
  });

  it("recovers the extension ready state when the content script responds after the page listener mounts", async () => {
    const originalPostMessage = window.postMessage.bind(window) as typeof window.postMessage;

    vi.spyOn(window, "postMessage").mockImplementation((...args: Parameters<typeof window.postMessage>) => {
      const [message] = args;

      if (
        message &&
        typeof message === "object" &&
        "source" in message &&
        message.source === "assetnext-extension-harness-page" &&
        "type" in message &&
        message.type === "handshake"
      ) {
        window.dispatchEvent(
          new MessageEvent("message", {
            data: {
              extensionId: "pogjmgcgpbabalmodjejhmopfoapmoeo",
              source: "assetnext-extension-harness-extension",
              type: "ready",
            },
            origin: window.location.origin,
          }),
        );
      }

      return originalPostMessage(...args);
    });

    await act(async () => {
      root.render(
        createElement(ExtensionHarnessShell, {
          allowedIds: ["pogjmgcgpbabalmodjejhmopfoapmoeo"],
          allowedOrigins: ["chrome-extension://pogjmgcgpbabalmodjejhmopfoapmoeo"],
          currentUser: {
            email: "seed.active.browser@assetnext.dev",
            role: "member",
            username: "seed-active-browser",
          },
        }),
      );

      await Promise.resolve();
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(container.textContent).toContain("Extension Ready");

    const runScenarioButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Run Scenario"),
    );

    expect(runScenarioButton?.hasAttribute("disabled")).toBe(false);
  });

  it("ignores malformed result messages that do not include an extension response payload", async () => {
    await act(async () => {
      root.render(
        createElement(ExtensionHarnessShell, {
          allowedIds: ["pogjmgcgpbabalmodjejhmopfoapmoeo"],
          allowedOrigins: ["chrome-extension://pogjmgcgpbabalmodjejhmopfoapmoeo"],
          currentUser: {
            email: "seed.active.browser@assetnext.dev",
            role: "member",
            username: "seed-active-browser",
          },
        }),
      );

      await Promise.resolve();
    });

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            source: "assetnext-extension-harness-extension",
            type: "result",
          },
          origin: window.location.origin,
        }),
      );
      await Promise.resolve();
    });

    expect(container.textContent).toContain("Latest Response Body");
    expect(container.textContent).toContain("null");
  });
});
