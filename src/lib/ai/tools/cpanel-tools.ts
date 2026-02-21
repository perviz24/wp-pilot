/**
 * AI tools for cPanel API interactions.
 * File management and backup operations.
 */

import { tool } from "ai";
import { z } from "zod";
import type { ToolContext } from "./types";
import { getSiteRecord, getCpanelCredentials, buildCpanelAuthHeader } from "./credential-access";
import type { Id } from "../../../../convex/_generated/dataModel";

/** Helper: make an authenticated cPanel UAPI call */
async function cpanelFetch(
  host: string,
  port: number,
  endpoint: string,
  authHeader: string,
): Promise<{ ok: boolean; data: unknown }> {
  const url = `https://${host}:${port}${endpoint}`;
  const response = await fetch(url, {
    headers: { Authorization: authHeader },
  });
  const data = await response.json().catch(() => null);
  return { ok: response.ok, data };
}

/** Validate cPanel connection before tool use */
async function getCpanelContext(ctx: ToolContext) {
  if (!ctx.siteId || !ctx.convexToken) {
    return { error: "Missing site context or authentication." };
  }
  const site = await getSiteRecord(ctx.siteId as Id<"sites">, ctx.convexToken);
  if (!site) return { error: "Site not found." };

  const creds = getCpanelCredentials(site);
  if (!creds) {
    return { error: "cPanel not connected. Ask the user to configure cPanel credentials first." };
  }

  return { site, creds, authHeader: buildCpanelAuthHeader(creds) };
}

export function createCpanelTools(ctx: ToolContext) {
  return {
    cpanel_list_files: tool({
      description: `List files and directories in a cPanel hosting directory.
Use this to explore the site's file structure. SAFE read-only operation.
Common paths: /public_html (site root), /public_html/wp-content/themes, /public_html/wp-content/plugins`,
      inputSchema: z.object({
        path: z.string().default("/public_html").describe("Directory path to list (default: /public_html)"),
      }),
      execute: async ({ path }) => {
        const cp = await getCpanelContext(ctx);
        if ("error" in cp) return cp.error;

        const endpoint = `/execute/Fileman/list_files?dir=${encodeURIComponent(path)}&include_mime=1&include_hash=0&include_permissions=1`;
        const result = await cpanelFetch(cp.creds.host, cp.creds.port, endpoint, cp.authHeader);

        if (!result.ok) return "cPanel error: Could not list files.";

        const response = result.data as { data?: Array<{
          file: string; type: string; size: number; mtime: number; humansize: string;
        }> };
        const files = response?.data ?? [];
        if (!files.length) return `Directory "${path}" is empty or does not exist.`;

        return files.map((f) => ({
          name: f.file,
          type: f.type === "dir" ? "directory" : "file",
          size: f.humansize ?? `${f.size} bytes`,
        }));
      },
    }),

    cpanel_read_file: tool({
      description: `Read the contents of a file via cPanel. SAFE read-only operation.
Use this to inspect WordPress config files, .htaccess, or theme files.
WARNING: Only read text files. Do not read binary files (images, zips).`,
      inputSchema: z.object({
        path: z.string().describe("Full path to the file (e.g. /public_html/wp-config.php)"),
      }),
      execute: async ({ path }) => {
        const cp = await getCpanelContext(ctx);
        if ("error" in cp) return cp.error;

        // Security: block reading sensitive credential files
        const blocked = ["wp-config.php", ".env", "config.php"];
        const fileName = path.split("/").pop() ?? "";
        if (blocked.some((b) => fileName.toLowerCase() === b)) {
          return `Blocked: Reading ${fileName} is not allowed — it contains database credentials and security keys.`;
        }

        const endpoint = `/execute/Fileman/get_file_content?dir=${encodeURIComponent(path.substring(0, path.lastIndexOf("/")))}&file=${encodeURIComponent(fileName)}`;
        const result = await cpanelFetch(cp.creds.host, cp.creds.port, endpoint, cp.authHeader);

        if (!result.ok) return `cPanel error: Could not read file "${path}".`;

        const response = result.data as { data?: { content: string } };
        const content = response?.data?.content;
        if (content === undefined) return `File "${path}" not found or empty.`;

        // Truncate very large files
        if (content.length > 5000) {
          return `File content (truncated to 5000 chars):\n\n${content.slice(0, 5000)}\n\n... (${content.length} total characters)`;
        }
        return content;
      },
    }),

    cpanel_create_backup: tool({
      description: `Trigger a full cPanel backup. CAUTION: Creates a server-side backup which uses storage space.
The AI should inform the user that a backup is being created and explain it may take a few minutes.`,
      inputSchema: z.object({}),
      execute: async () => {
        const cp = await getCpanelContext(ctx);
        if ("error" in cp) return cp.error;

        const endpoint = "/execute/Backup/fullbackup_to_homedir";
        const result = await cpanelFetch(cp.creds.host, cp.creds.port, endpoint, cp.authHeader);

        if (!result.ok) return "cPanel error: Could not trigger backup.";

        const response = result.data as { data?: { pid: string } };
        return {
          success: true,
          message: "Full backup triggered. It will be saved to your home directory.",
          pid: response?.data?.pid ?? "unknown",
        };
      },
    }),
  };
}
