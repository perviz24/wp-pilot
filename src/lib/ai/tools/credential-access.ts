/**
 * Credential access utility for AI tools.
 * Fetches site record from Convex and extracts typed credentials.
 */

import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { SiteRecord, WpRestCredentials, CpanelCredentials } from "./types";

/** Fetch the full site record from Convex (authenticated) */
export async function getSiteRecord(
  siteId: Id<"sites">,
  token: string,
): Promise<SiteRecord | null> {
  const site = await fetchQuery(
    api.sites.getById,
    { siteId },
    { token },
  );
  return site as SiteRecord | null;
}

/** Extract WP REST credentials from a site record */
export function getWpRestCredentials(
  site: SiteRecord,
): WpRestCredentials | null {
  if (!site.wpRestConnected || !site.wpRestUrl || !site.wpUsername || !site.wpAppPassword) {
    return null;
  }
  return {
    url: site.wpRestUrl,
    username: site.wpUsername,
    appPassword: site.wpAppPassword,
  };
}

/** Extract cPanel credentials from a site record */
export function getCpanelCredentials(
  site: SiteRecord,
): CpanelCredentials | null {
  if (!site.cpanelConnected || !site.cpanelHost || !site.cpanelUsername || !site.cpanelToken) {
    return null;
  }
  return {
    host: site.cpanelHost,
    port: site.cpanelPort ?? 2083,
    username: site.cpanelUsername,
    token: site.cpanelToken,
  };
}

/** Build Basic Auth header for WP REST API */
export function buildWpAuthHeader(creds: WpRestCredentials): string {
  const encoded = Buffer.from(`${creds.username}:${creds.appPassword}`).toString("base64");
  return `Basic ${encoded}`;
}

/** Build cPanel auth header */
export function buildCpanelAuthHeader(creds: CpanelCredentials): string {
  return `cpanel ${creds.username}:${creds.token}`;
}
