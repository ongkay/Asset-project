import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readManifest(variant: "allowed" | "denied") {
  return JSON.parse(
    readFileSync(join(process.cwd(), "dev", "extension-harness", variant, "manifest.json"), "utf8"),
  ) as {
    background: { service_worker: string };
    content_scripts: Array<{ js: string[]; matches: string[] }>;
    manifest_version: number;
    name: string;
  };
}

describe("extension harness manifests", () => {
  it("declares two installable Manifest V3 variants", () => {
    const allowed = readManifest("allowed");
    const denied = readManifest("denied");

    expect(allowed.manifest_version).toBe(3);
    expect(denied.manifest_version).toBe(3);
    expect(allowed.name).not.toBe(denied.name);
    expect(allowed.background.service_worker).toBe("background.js");
    expect(denied.background.service_worker).toBe("background.js");
  });

  it("grants content-script access across local dev app hosts", () => {
    const allowed = readManifest("allowed");

    expect(allowed.content_scripts[0]?.matches).toEqual(["http://localhost:3000/*", "http://127.0.0.1:3000/*"]);
    expect(allowed.content_scripts[0]?.js).toEqual(["content-script.js"]);
  });
});
