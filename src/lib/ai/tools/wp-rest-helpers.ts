/**
 * Shared helpers for WP REST API tools.
 * Authentication, fetch wrapper, and context validation.
 */

import type { ToolContext } from "./types";
import { getSiteRecord, getWpRestCredentials, buildWpAuthHeader } from "./credential-access";
import type { Id } from "../../../../convex/_generated/dataModel";

/** Make an authenticated WP REST API call */
export async function wpFetch(
  baseUrl: string,
  endpoint: string,
  authHeader: string,
  options: { method?: string; body?: unknown } = {},
): Promise<{ ok: boolean; status: number; data: unknown }> {
  // Strip trailing slashes and /wp-json suffix if present (stored URL may include it)
  const siteRoot = baseUrl.replace(/\/+$/, "").replace(/\/wp-json\/?$/, "");
  const url = `${siteRoot}/wp-json/wp/v2${endpoint}`;
  const headers: Record<string, string> = {
    Authorization: authHeader,
    "Content-Type": "application/json",
  };

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, data };
}

/** Validated WP context (site + credentials + auth header) */
export type WpContext = {
  site: NonNullable<Awaited<ReturnType<typeof getSiteRecord>>>;
  creds: NonNullable<ReturnType<typeof getWpRestCredentials>>;
  authHeader: string;
};

/** Validate WP REST connection before tool use */
export async function getWpContext(
  ctx: ToolContext,
): Promise<WpContext | { error: string }> {
  if (!ctx.siteId || !ctx.convexToken) {
    return { error: "Missing site context or authentication." };
  }
  const site = await getSiteRecord(ctx.siteId as Id<"sites">, ctx.convexToken);
  if (!site) return { error: "Site not found." };

  const creds = getWpRestCredentials(site);
  if (!creds) {
    return { error: "WP REST API not connected. Ask the user to configure WordPress credentials first." };
  }

  return { site, creds, authHeader: buildWpAuthHeader(creds) };
}
