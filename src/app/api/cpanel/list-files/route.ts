/**
 * Vercel API route proxy for cPanel file listing.
 * cPanel UAPI requires POST with Content-Type: application/x-www-form-urlencoded.
 * Auth format: "cpanel username:APITOKEN" (not Basic auth).
 * CRITICAL: Must include "Accept: text/html" — the OpenResty reverse proxy
 * in front of cPanel returns HTTP 415 for ALL requests without this header,
 * regardless of Content-Type or HTTP method. Confirmed via curl testing.
 */

import { auth } from "@clerk/nextjs/server";
import { getConvexToken } from "@/lib/convex-auth";
import { getSiteRecord, getCpanelCredentials } from "@/lib/ai/tools/credential-access";
import type { Id } from "../../../../../convex/_generated/dataModel";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ ok: false, error: "Unauthorized", errorType: "auth" }, { status: 401 });
  }

  const convexToken = await getConvexToken();
  if (!convexToken) {
    return Response.json(
      { ok: false, error: "Auth token unavailable", errorType: "auth" },
      { status: 401 },
    );
  }

  let body: { siteId: string; dir: string };
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { ok: false, error: "Invalid request body", errorType: "api" },
      { status: 400 },
    );
  }

  const { siteId, dir } = body;
  if (!siteId || !dir) {
    return Response.json(
      { ok: false, error: "Missing siteId or dir", errorType: "api" },
      { status: 400 },
    );
  }

  // Fetch site record from Convex (validates ownership via Clerk JWT)
  const site = await getSiteRecord(siteId as Id<"sites">, convexToken);
  if (!site) {
    return Response.json(
      { ok: false, error: "Site not found or access denied", errorType: "auth" },
      { status: 404 },
    );
  }

  // Verify user owns this site
  if (site.userId !== userId) {
    return Response.json(
      { ok: false, error: "Access denied", errorType: "auth" },
      { status: 403 },
    );
  }

  const creds = getCpanelCredentials(site);
  if (!creds) {
    return Response.json(
      { ok: false, error: "Missing cPanel credentials", errorType: "auth" },
      { status: 400 },
    );
  }

  // cPanel UAPI: POST with form-urlencoded body (NOT GET with query params)
  const uapiPath = "/execute/Fileman/list_files";
  const formParams = new URLSearchParams({
    dir,
    include_mime: "0",
    include_hash: "0",
    include_permissions: "0",
  });
  const authHeader = `cpanel ${creds.username}:${creds.token}`;

  // Build list of base URLs to try (path only, no query string)
  const urls = buildUrls(creds.host, creds.port, site.url, uapiPath);

  for (const url of urls) {
    const result = await tryCpanelFetch(url, authHeader, formParams);

    if (result.ok) {
      const files = parseFiles(result.data, dir);
      return Response.json({ ok: true, files, currentDir: dir, via: "vercel-proxy" });
    }

    // Only retry on firewall/connection errors, not auth/API errors
    if (!result.isFirewall && result.errorType !== "connection") {
      return Response.json({
        ok: false,
        error: `cPanel API error: ${result.error}`,
        errorType: result.errorType,
      });
    }
  }

  // All URLs failed
  return Response.json({
    ok: false,
    error:
      "cPanel API blocked on all connection methods (via Vercel proxy). " +
      "Contact your hosting provider to whitelist API access.",
    errorType: "firewall",
  });
}

// --- Helpers ---

function buildUrls(host: string, port: number, siteUrl: string | undefined, apiPath: string) {
  const urls: string[] = [];
  urls.push(`https://${host}:${port}${apiPath}`);

  if (siteUrl) {
    const domain = extractDomain(siteUrl);
    if (domain) urls.push(`https://cpanel.${domain}${apiPath}`);
  }

  urls.push(`http://${host}:2082${apiPath}`);
  return urls;
}

function extractDomain(siteUrl: string): string | null {
  try {
    const parts = new URL(siteUrl).hostname.split(".");
    return parts.length >= 2 ? parts.slice(-2).join(".") : null;
  } catch {
    return null;
  }
}

type FetchResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string; errorType: "auth" | "firewall" | "connection" | "api"; isFirewall: boolean };

async function tryCpanelFetch(
  url: string,
  authHeader: string,
  formParams: URLSearchParams,
): Promise<FetchResult> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "text/html",
      },
      body: formParams.toString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg, errorType: "connection", isFirewall: false };
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const isFirewall =
      body.includes("Imunify360") ||
      body.includes("bot-protection") ||
      body.includes("anti-bot") ||
      body.includes("imunify360");
    return {
      ok: false,
      error: `HTTP ${response.status}: ${body.slice(0, 200)}`,
      errorType: isFirewall ? "firewall" : "api",
      isFirewall,
    };
  }

  let data: Record<string, unknown>;
  try {
    data = await response.json();
  } catch {
    return { ok: false, error: "Non-JSON response", errorType: "api", isFirewall: false };
  }

  if (data?.message && !data?.data) {
    const msg = String(data.message);
    const isFirewall = msg.includes("Imunify360") || msg.includes("bot-protection");
    return { ok: false, error: msg.slice(0, 300), errorType: isFirewall ? "firewall" : "api", isFirewall };
  }

  if ((data?.errors as string[] | undefined)?.length) {
    return { ok: false, error: (data.errors as string[]).join(", "), errorType: "api", isFirewall: false };
  }

  return { ok: true, data };
}

function parseFiles(data: Record<string, unknown>, dir: string) {
  const rawFiles = Array.isArray(data?.data) ? (data.data as Record<string, unknown>[]) : [];
  const files = rawFiles.map((f: Record<string, unknown>) => ({
    name: String(f.file ?? f.name ?? ""),
    fullpath: String(f.fullpath ?? `${dir}/${f.file ?? f.name ?? ""}`),
    type: f.type === "dir" ? "dir" : f.type === "link" ? "link" : "file",
    size: Number(f.size ?? 0),
    mtime: Number(f.mtime ?? 0),
    humansize: String(f.humansize ?? formatBytes(Number(f.size ?? 0))),
  }));

  files.sort((a, b) => {
    if (a.type === "dir" && b.type !== "dir") return -1;
    if (a.type !== "dir" && b.type === "dir") return 1;
    return a.name.localeCompare(b.name);
  });

  return files;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
