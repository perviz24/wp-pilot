/**
 * Shared types for AI tool context.
 * Every tool receives this context to access credentials and Convex.
 */

import type { Id } from "../../../../convex/_generated/dataModel";

/** Context passed to every AI tool's execute function */
export interface ToolContext {
  siteId: Id<"sites"> | null;
  convexToken: string | undefined;
}

/** WordPress REST API credentials (decrypted/plaintext from DB) */
export interface WpRestCredentials {
  url: string;
  username: string;
  appPassword: string;
}

/** cPanel API credentials (from DB) */
export interface CpanelCredentials {
  host: string;
  port: number;
  username: string;
  token: string;
}

/** Site record shape (subset we need for tools) */
export interface SiteRecord {
  _id: Id<"sites">;
  userId: string;
  name: string;
  url: string;
  cpanelHost?: string;
  cpanelPort?: number;
  cpanelUsername?: string;
  cpanelToken?: string;
  cpanelConnected: boolean;
  wpRestUrl?: string;
  wpUsername?: string;
  wpAppPassword?: string;
  wpRestConnected: boolean;
  wpAdminUser?: string;
  wpAdminPassword?: string;
  wpAdminConnected: boolean;
}
