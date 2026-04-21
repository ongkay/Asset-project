/* global chrome */

window.addEventListener("message", async (event) => {
  if (event.source !== window || event.data?.source !== "assetnext-extension-harness-page") {
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

window.postMessage(
  {
    extensionId: chrome.runtime.id,
    source: "assetnext-extension-harness-extension",
    type: "ready",
  },
  window.location.origin,
);
