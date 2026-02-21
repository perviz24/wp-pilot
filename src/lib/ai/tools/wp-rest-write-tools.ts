/**
 * AI tools for writing/modifying WordPress data via REST API.
 * All tools are CAUTION or CRITICAL — require user confirmation.
 */

import { tool } from "ai";
import { z } from "zod";
import type { ToolContext } from "./types";
import { wpFetch, getWpContext } from "./wp-rest-helpers";

export function createWpRestWriteTools(ctx: ToolContext) {
  return {
    wp_create_post: tool({
      description: `Create a new WordPress post or page. CAUTION: This creates visible content on the site.
The AI should explain what will be created and ask for user confirmation before calling this tool.
Posts are created as drafts by default for safety.`,
      inputSchema: z.object({
        title: z.string().describe("Post title"),
        content: z.string().describe("Post content (HTML supported)"),
        status: z.enum(["draft", "publish"]).default("draft").describe("Post status (default: draft)"),
        type: z.enum(["post", "page"]).default("post").describe("Content type"),
      }),
      execute: async ({ title, content, status, type }) => {
        const wp = await getWpContext(ctx);
        if ("error" in wp) return wp.error;

        const endpoint = type === "page" ? "/pages" : "/posts";
        const result = await wpFetch(wp.creds.url, endpoint, wp.authHeader, {
          method: "POST",
          body: { title, content, status },
        });

        if (!result.ok) return `WP REST error ${result.status}: Could not create ${type}.`;

        const created = result.data as { id: number; link: string; status: string };
        return {
          success: true,
          id: created?.id,
          link: created?.link,
          status: created?.status,
          message: `${type === "page" ? "Page" : "Post"} "${title}" created as ${status}.`,
        };
      },
    }),

    wp_update_post: tool({
      description: `Update an existing WordPress post or page. CAUTION: This modifies existing content.
The AI should show what will change and ask for user confirmation before calling this tool.`,
      inputSchema: z.object({
        id: z.number().describe("Post/page ID to update"),
        title: z.string().optional().describe("New title (leave empty to keep current)"),
        content: z.string().optional().describe("New content (leave empty to keep current)"),
        status: z.enum(["draft", "publish", "private"]).optional().describe("New status"),
        type: z.enum(["post", "page"]).default("post").describe("Content type"),
      }),
      execute: async ({ id, title, content, status, type }) => {
        const wp = await getWpContext(ctx);
        if ("error" in wp) return wp.error;

        const body: Record<string, unknown> = {};
        if (title !== undefined) body.title = title;
        if (content !== undefined) body.content = content;
        if (status !== undefined) body.status = status;

        const endpoint = type === "page" ? `/pages/${id}` : `/posts/${id}`;
        const result = await wpFetch(wp.creds.url, endpoint, wp.authHeader, {
          method: "POST", // WP REST uses POST for updates
          body,
        });

        if (!result.ok) return `WP REST error ${result.status}: Could not update ${type} #${id}.`;

        const updated = result.data as { id: number; link: string; status: string };
        return {
          success: true,
          id: updated?.id,
          link: updated?.link,
          status: updated?.status,
          message: `${type === "page" ? "Page" : "Post"} #${id} updated.`,
        };
      },
    }),

    wp_manage_plugin: tool({
      description: `Install, activate, or deactivate a WordPress plugin. CAUTION/CRITICAL action.
- Activate/Deactivate: CAUTION — reversible, but may affect site functionality
- Install: CRITICAL — adds new code to the site
The AI should explain the impact and ask for user confirmation before calling this tool.`,
      inputSchema: z.object({
        action: z.enum(["activate", "deactivate", "install"]).describe("What to do with the plugin"),
        slug: z.string().describe("Plugin slug (e.g. 'woocommerce', 'yoast-seo', 'contact-form-7')"),
      }),
      execute: async ({ action, slug }) => {
        const wp = await getWpContext(ctx);
        if ("error" in wp) return wp.error;

        if (action === "install") {
          const result = await wpFetch(wp.creds.url, "/plugins", wp.authHeader, {
            method: "POST",
            body: { slug, status: "inactive" },
          });
          if (!result.ok) return `WP REST error ${result.status}: Could not install plugin "${slug}".`;
          const plugin = result.data as { name: string; version: string };
          return { success: true, message: `Plugin "${plugin?.name ?? slug}" v${plugin?.version ?? "?"} installed (inactive).` };
        }

        // Activate or deactivate
        const newStatus = action === "activate" ? "active" : "inactive";
        const result = await wpFetch(wp.creds.url, `/plugins/${slug}`, wp.authHeader, {
          method: "POST",
          body: { status: newStatus },
        });
        if (!result.ok) return `WP REST error ${result.status}: Could not ${action} plugin "${slug}".`;

        const plugin = result.data as { name: string; status: string };
        return { success: true, message: `Plugin "${plugin?.name ?? slug}" is now ${plugin?.status ?? newStatus}.` };
      },
    }),
  };
}
