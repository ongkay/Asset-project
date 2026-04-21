/* global chrome */

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "assetnext-extension-harness:request") {
    return undefined;
  }

  fetch(message.payload.url, {
    method: message.payload.method,
    headers: message.payload.headers,
    body: message.payload.body ? JSON.stringify(message.payload.body) : undefined,
    credentials: "include",
  })
    .then(async (response) => {
      const text = await response.text();
      let body;

      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }

      sendResponse({
        body,
        headers: Object.fromEntries(response.headers.entries()),
        ok: response.ok,
        status: response.status,
      });
    })
    .catch((error) => {
      sendResponse({
        body: {
          error: {
            code: "HARNESS_RUNTIME_ERROR",
            message: error instanceof Error ? error.message : "Unknown extension runtime error.",
          },
        },
        headers: {},
        ok: false,
        status: 0,
      });
    });

  return true;
});
