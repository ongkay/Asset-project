import { describe, expect, it } from "vitest";

import { readTrustedRequestMetadataFromHeaders } from "@/lib/request-metadata";

describe("request metadata helpers", () => {
  it("parses browser, os, origin, forwarded host and trusted ip from explicit headers", () => {
    const metadata = readTrustedRequestMetadataFromHeaders(
      new Headers({
        origin: "chrome-extension://allowed-id",
        "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/135.0.0.0 Safari/537.36",
        "x-forwarded-for": "127.0.0.1",
        "x-forwarded-host": "api.example.com",
        "x-forwarded-proto": "https",
      }),
      {
        cityHeader: "x-vercel-ip-city",
        countryHeader: "x-vercel-ip-country",
        ipHeader: "x-forwarded-for",
      },
    );

    expect(metadata).toEqual({
      browser: "Chrome",
      host: "api.example.com",
      ipAddress: "127.0.0.1",
      origin: "chrome-extension://allowed-id",
      os: "Linux",
      protocol: "https",
    });
  });

  it("falls back to host header, unknown ip, and protocol inferred from origin", () => {
    const metadata = readTrustedRequestMetadataFromHeaders(
      new Headers({
        host: "app.example.com",
        origin: "https://app.example.com",
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15",
      }),
      {
        cityHeader: "x-vercel-ip-city",
        countryHeader: "x-vercel-ip-country",
        ipHeader: "x-real-ip",
      },
    );

    expect(metadata).toEqual({
      browser: "Safari",
      host: "app.example.com",
      ipAddress: "unknown",
      origin: "https://app.example.com",
      os: "macOS",
      protocol: "https",
    });
  });
});
