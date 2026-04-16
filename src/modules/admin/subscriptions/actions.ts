"use server";

import { adminActionClient } from "@/modules/auth/action-client";

import {
  getSubscriberActivationDraft,
  getSubscriberEditorData,
  getSubscriberTablePage,
  searchSubscriberUsers,
} from "./queries";
import {
  subscriberActivationDraftInputSchema,
  subscriberEditorDataInputSchema,
  subscriberTableFilterSchema,
  subscriberUserSearchSchema,
} from "./schemas";

export const getSubscriberTablePageAction = adminActionClient
  .metadata({ actionName: "admin.subscriptions.get-table-page" })
  .inputSchema(subscriberTableFilterSchema)
  .action(async ({ parsedInput }) => {
    try {
      const tablePage = await getSubscriberTablePage(parsedInput);

      return {
        ok: true as const,
        tablePage,
      };
    } catch (error) {
      return {
        ok: false as const,
        message: error instanceof Error ? error.message : "Failed to load subscriber table.",
      };
    }
  });

export const getSubscriberEditorDataAction = adminActionClient
  .metadata({ actionName: "admin.subscriptions.get-editor-data" })
  .inputSchema(subscriberEditorDataInputSchema)
  .action(async ({ parsedInput }) => {
    try {
      const editorData = await getSubscriberEditorData(parsedInput);

      return {
        ok: true as const,
        editorData,
      };
    } catch (error) {
      return {
        ok: false as const,
        message: error instanceof Error ? error.message : "Failed to load subscriber editor data.",
      };
    }
  });

export const searchSubscriberUsersAction = adminActionClient
  .metadata({ actionName: "admin.subscriptions.search-users" })
  .inputSchema(subscriberUserSearchSchema)
  .action(async ({ parsedInput }) => {
    try {
      const result = await searchSubscriberUsers(parsedInput);

      return {
        ok: true as const,
        users: result.users,
        totalCount: result.totalCount,
      };
    } catch (error) {
      return {
        ok: false as const,
        message: error instanceof Error ? error.message : "Failed to search subscriber users.",
      };
    }
  });

export const getSubscriberActivationDraftAction = adminActionClient
  .metadata({ actionName: "admin.subscriptions.get-activation-draft" })
  .inputSchema(subscriberActivationDraftInputSchema)
  .action(async ({ parsedInput }) => {
    try {
      const draft = await getSubscriberActivationDraft(parsedInput);

      return {
        ok: true as const,
        draft,
      };
    } catch (error) {
      return {
        ok: false as const,
        message: error instanceof Error ? error.message : "Failed to load activation draft.",
      };
    }
  });
