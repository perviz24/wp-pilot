/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as aiMessages from "../aiMessages.js";
import type * as aiSessions from "../aiSessions.js";
import type * as aiSiteMemory from "../aiSiteMemory.js";
import type * as auditLogs from "../auditLogs.js";
import type * as backups from "../backups.js";
import type * as discovery from "../discovery.js";
import type * as files from "../files.js";
import type * as sites from "../sites.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  aiMessages: typeof aiMessages;
  aiSessions: typeof aiSessions;
  aiSiteMemory: typeof aiSiteMemory;
  auditLogs: typeof auditLogs;
  backups: typeof backups;
  discovery: typeof discovery;
  files: typeof files;
  sites: typeof sites;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
