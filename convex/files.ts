import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export interface CpanelFile {
  name: string;
  fullpath: string;
  type: "dir" | "file" | "link";
  size: number;
  mtime: number;
  humansize: string;
}

// Return type — errors are returned as data (Convex actions sanitize thrown errors)
export type ListDirectoryResult =
  | { ok: true; files: CpanelFile[]; currentDir: string }
  | { ok: false; error: string; errorType: "auth" | "firewall" | "connection" | "api" };

// Result from a single cPanel fetch attempt
type FetchAttemptResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string; errorType: "auth" | "firewall" | "connection" | "api"; isImunify?: boolean };

// Extract root domain from a URL (e.g. "https://academy.geniusmotion.se" → "geniusmotion.se")
function extractDomain(siteUrl: string): string | null {
  try {
    const hostname = new URL(siteUrl).hostname; // "academy.geniusmotion.se"
    const parts = hostname.split(".");
    if (parts.length < 2) return null;
    // Return last two parts as root domain (handles .se, .com, etc.)
    return parts.slice(-2).join(".");
  } catch {
    return null;
  }
}

// Build list of URLs to try, in priority order
function buildCpanelUrls(
  cpanelHost: string,
  port: number,
  siteUrl: string | undefined,
  apiPath: string,
): string[] {
  const urls: string[] = [];

  // 1. Standard: direct cPanel host on configured port (usually 2083)
  urls.push(`https://${cpanelHost}:${port}${apiPath}`);

  // 2. Fallback: service subdomain via port 443 (routes through Apache, may bypass Imunify360)
  if (siteUrl) {
    const domain = extractDomain(siteUrl);
    if (domain) {
      urls.push(`https://cpanel.${domain}${apiPath}`);
    }
  }

  // 3. Fallback: HTTP on port 2082 (some bot-protection only on HTTPS)
  urls.push(`http://${cpanelHost}:2082${apiPath}`);

  return urls;
}

// Try a single cPanel API fetch — returns structured result, never throws
async function attemptCpanelFetch(
  url: string,
  username: string,
  token: string,
): Promise<FetchAttemptResult> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `cpanel ${username}:${token}`,
        Accept: "application/json",
      },
    });
  } catch (fetchError) {
    const msg = fetchError instanceof Error ? fetchError.message : String(fetchError);
    return { ok: false, error: `Connection failed: ${msg}`, errorType: "connection" };
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    // Check if the HTML body contains Imunify360 / bot-protection markers
    const isImunify = body.includes("Imunify360") || body.includes("bot-protection")
      || body.includes("anti-bot") || body.includes("imunify360");
    return {
      ok: false,
      error: `HTTP ${response.status}: ${body.slice(0, 200)}`,
      errorType: isImunify ? "firewall" : "api",
      isImunify,
    };
  }

  let data: Record<string, unknown>;
  try {
    data = await response.json();
  } catch {
    return { ok: false, error: "Non-JSON response", errorType: "api" };
  }

  // cPanel returns { message: "..." } without data on auth/firewall errors
  if (data?.message && !data?.data) {
    const msg = String(data.message);
    const isImunify = msg.includes("Imunify360") || msg.includes("bot-protection");
    return {
      ok: false,
      error: msg.slice(0, 300),
      errorType: isImunify ? "firewall" : "api",
      isImunify,
    };
  }

  if ((data?.errors as string[] | undefined)?.length) {
    return { ok: false, error: (data.errors as string[]).join(", "), errorType: "api" };
  }

  return { ok: true, data };
}

// List directory contents via cPanel UAPI Fileman::list_files
// Tries multiple connection methods if Imunify360 blocks the primary one
export const listDirectory = action({
  args: {
    siteId: v.id("sites"),
    dir: v.string(),
  },
  handler: async (ctx, args): Promise<ListDirectoryResult> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const site = await ctx.runQuery(api.sites.getById, { siteId: args.siteId });

    if (!site || !site.cpanelHost || !site.cpanelToken || !site.cpanelUsername) {
      return {
        ok: false,
        error: "Missing cPanel credentials. Go to Settings to add them.",
        errorType: "auth",
      };
    }

    const port = site.cpanelPort ?? 2083;
    const params = new URLSearchParams({
      dir: args.dir,
      include_mime: "0",
      include_hash: "0",
      include_permissions: "0",
    });
    const apiPath = `/execute/Fileman/list_files?${params}`;

    // Build URLs to try (standard port → service subdomain → HTTP fallback)
    const urls = buildCpanelUrls(site.cpanelHost, port, site.url, apiPath);

    let lastError: FetchAttemptResult | null = null;

    for (const url of urls) {
      const result = await attemptCpanelFetch(url, site.cpanelUsername, site.cpanelToken);

      if (result.ok) {
        // Success — parse files from data
        const files = parseFiles(result.data, args.dir);

        await ctx.runMutation(api.backups.logAudit, {
          siteId: args.siteId,
          action: `Browse files: ${args.dir} (via ${new URL(url).host})`,
          layer: "cpanel",
          riskLevel: "safe",
          success: true,
        });

        return { ok: true, files, currentDir: args.dir };
      }

      lastError = result;

      // Only retry on Imunify360/firewall blocks or connection errors
      // Auth errors or API errors (wrong credentials, bad path) won't be fixed by retrying
      if (!result.isImunify && result.errorType !== "connection") {
        break; // No point trying other URLs for auth/API errors
      }
    }

    // All attempts failed — return the most relevant error
    if (lastError?.isImunify) {
      return {
        ok: false,
        error:
          "Blocked by server firewall (Imunify360) on all connection methods. " +
          "Tried: direct port, service subdomain (port 443), and HTTP fallback. " +
          "Contact your hosting provider (MissHosting) to whitelist API access, " +
          "or disable Imunify360 anti-bot protection for API endpoints.",
        errorType: "firewall",
      };
    }

    return {
      ok: false,
      error: `cPanel API error: ${lastError?.error ?? "Unknown error"}`,
      errorType: lastError?.errorType ?? "api",
    };
  },
});

// Parse raw cPanel file data into typed CpanelFile array, sorted dirs-first
function parseFiles(data: Record<string, unknown>, dir: string): CpanelFile[] {
  const rawFiles = Array.isArray(data?.data) ? (data.data as Record<string, unknown>[]) : [];
  const files: CpanelFile[] = rawFiles.map((f: Record<string, unknown>) => ({
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
