export type { ApiError, AuthSession, ClientOptions, InsForgeClient } from "@insforge/sdk";

import type { ClientOptions } from "@insforge/sdk";

type SharedInsForgeClientOptions = Pick<
  ClientOptions,
  "debug" | "fetch" | "functionsUrl" | "headers" | "retryCount" | "retryDelay" | "timeout"
>;

export type InsForgeServerClientOptions = SharedInsForgeClientOptions & {
  accessToken?: string;
};

export type InsForgeAdminClientOptions = SharedInsForgeClientOptions;

export type InsForgeRpcArgs = Record<string, unknown>;
