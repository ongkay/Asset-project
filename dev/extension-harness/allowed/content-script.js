/* global chrome */

function postReadySignal() {
  if (!window.location.pathname.startsWith("/console/extension-harness")) {
    return;
  }

  window.postMessage(
    {
      extensionId: chrome.runtime.id,
      source: "assetnext-extension-harness-extension",
      type: "ready",
    },
    window.location.origin,
  );
}

window.addEventListener("message", async (event) => {
  if (!window.location.pathname.startsWith("/console/extension-harness")) {
    return;
  }

  if (event.source !== window || event.data?.source !== "assetnext-extension-harness-page") {
    return;
  }

  if (event.data.type === "handshake") {
    postReadySignal();
    return;
  }

  const response = await chrome.runtime.sendMessage({
    type: "assetnext-extension-harness:request",
    payload: event.data.payload,
  });

  window.postMessage(
    {
      source: "assetnext-extension-harness-extension",
      type: "result",
      response,
    },
    window.location.origin,
  );
});

postReadySignal();
