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

// List directory contents via cPanel UAPI Fileman::list_files
export const listDirectory = action({
  args: {
    siteId: v.id("sites"),
    dir: v.string(),
  },
  handler: async (ctx, args): Promise<ListDirectoryResult> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const site = await ctx.runQuery(api.sites.getById, {
      siteId: args.siteId,
    });

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
    const url = `https://${site.cpanelHost}:${port}/execute/Fileman/list_files?${params}`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `cpanel ${site.cpanelUsername}:${site.cpanelToken}`,
          Accept: "application/json",
        },
      });
    } catch (fetchError) {
      const msg = fetchError instanceof Error ? fetchError.message : String(fetchError);
      return {
        ok: false,
        error: `cPanel connection failed: ${msg}`,
        errorType: "connection",
      };
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return {
        ok: false,
        error: `cPanel API returned ${response.status}: ${body.slice(0, 200)}`,
        errorType: "api",
      };
    }

    let data: Record<string, unknown>;
    try {
      data = await response.json();
    } catch {
      return {
        ok: false,
        error: "cPanel returned non-JSON response",
        errorType: "api",
      };
    }

    // If cPanel returns a message instead of data (auth/firewall error), surface it
    if (data?.message && !data?.data) {
      const msg = String(data.message);
      if (msg.includes("Imunify360") || msg.includes("bot-protection")) {
        return {
          ok: false,
          error:
            "Blocked by server firewall (Imunify360). " +
            "Your hosting provider's bot protection is blocking API requests. " +
            "Please whitelist the server IP in cPanel → Imunify360 → White List, " +
            "or contact your hosting provider to allow API access.",
          errorType: "firewall",
        };
      }
      return { ok: false, error: `cPanel: ${msg.slice(0, 300)}`, errorType: "api" };
    }

    if ((data?.errors as string[] | undefined)?.length) {
      return {
        ok: false,
        error: (data.errors as string[]).join(", "),
        errorType: "api",
      };
    }

    const rawFiles = Array.isArray(data?.data) ? (data.data as Record<string, unknown>[]) : [];
    const files: CpanelFile[] = rawFiles.map(
      (f: Record<string, unknown>) => ({
        name: String(f.file ?? f.name ?? ""),
        fullpath: String(f.fullpath ?? `${args.dir}/${f.file ?? f.name ?? ""}`),
        type: f.type === "dir" ? "dir" : f.type === "link" ? "link" : "file",
        size: Number(f.size ?? 0),
        mtime: Number(f.mtime ?? 0),
        humansize: String(f.humansize ?? formatBytes(Number(f.size ?? 0))),
      }),
    );

    // Sort: directories first, then files alphabetically
    files.sort((a, b) => {
      if (a.type === "dir" && b.type !== "dir") return -1;
      if (a.type !== "dir" && b.type === "dir") return 1;
      return a.name.localeCompare(b.name);
    });

    // Log audit
    await ctx.runMutation(api.backups.logAudit, {
      siteId: args.siteId,
      action: `Browse files: ${args.dir}`,
      layer: "cpanel",
      riskLevel: "safe",
      success: true,
    });

    return { ok: true, files, currentDir: args.dir };
  },
});

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
