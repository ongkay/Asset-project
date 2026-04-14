import "server-only";

import { headers } from "next/headers";

import { env } from "@/config/env.server";

export type TrustedRequestMetadata = {
  browser: string | null;
  host: string | null;
  ipAddress: string;
  origin: string | null;
  os: string | null;
  protocol: string;
};

function readHeaderValue(input: Headers, key: string) {
  return input.get(key) ?? input.get(key.toLowerCase());
}

function detectBrowser(userAgent: string | null) {
  if (!userAgent) {
    return null;
  }

  if (userAgent.includes("Edg/")) {
    return "Edge";
  }

  if (userAgent.includes("Chrome/")) {
    return "Chrome";
  }

  if (userAgent.includes("Firefox/")) {
    return "Firefox";
  }

  if (userAgent.includes("Safari/") && !userAgent.includes("Chrome/")) {
    return "Safari";
  }

  return null;
}

function detectOs(userAgent: string | null) {
  if (!userAgent) {
    return null;
  }

  if (userAgent.includes("Windows")) {
    return "Windows";
  }

  if (userAgent.includes("Mac OS X") || userAgent.includes("macOS")) {
    return "macOS";
  }

  if (userAgent.includes("Android")) {
    return "Android";
  }

  if (userAgent.includes("iPhone") || userAgent.includes("iPad") || userAgent.includes("iOS")) {
    return "iOS";
  }

  if (userAgent.includes("Linux")) {
    return "Linux";
  }

  return null;
}

export async function readTrustedRequestMetadata(): Promise<TrustedRequestMetadata> {
  const requestHeaders = await headers();
  const userAgent = readHeaderValue(requestHeaders, "user-agent");
  const origin = readHeaderValue(requestHeaders, "origin");
  const host = readHeaderValue(requestHeaders, "x-forwarded-host") ?? readHeaderValue(requestHeaders, "host");
  const protocol =
    readHeaderValue(requestHeaders, "x-forwarded-proto") ?? (origin?.startsWith("https://") ? "https" : "http");

  return {
    browser: detectBrowser(userAgent),
    host,
    ipAddress: readHeaderValue(requestHeaders, env.TRUSTED_PROXY_IP_HEADER) ?? "unknown",
    origin,
    os: detectOs(userAgent),
    protocol,
  };
}

export async function buildCurrentUrl(pathname: string) {
  const metadata = await readTrustedRequestMetadata();
  const normalizedPathname = pathname.startsWith("/") ? pathname : `/${pathname}`;

  if (metadata.origin) {
    return new URL(normalizedPathname, metadata.origin).toString();
  }

  if (!metadata.host) {
    throw new Error("Request host is not available for absolute URL generation.");
  }

  return `${metadata.protocol}://${metadata.host}${normalizedPathname}`;
}
