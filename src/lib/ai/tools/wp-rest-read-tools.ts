/**
 * AI tools for reading WordPress data via REST API.
 * All tools are SAFE read-only operations.
 */

import { tool } from "ai";
import { z } from "zod";
import type { ToolContext } from "./types";
import { wpFetch, getWpContext } from "./wp-rest-helpers";

export function createWpRestReadTools(ctx: ToolContext) {
  return {
    wp_list_posts: tool({
      description: `List recent WordPress posts. Returns title, status, date, and excerpt for each post.
Use this to understand the site's content. This is a SAFE read-only operation.`,
      inputSchema: z.object({
        count: z.number().min(1).max(50).default(10).describe("Number of posts to fetch (default 10)"),
        status: z.enum(["publish", "draft", "any"]).default("any").describe("Filter by status"),
      }),
      execute: async ({ count, status }) => {
        const wp = await getWpContext(ctx);
        if ("error" in wp) return wp.error;

        const params = `?per_page=${count}&status=${status}&_fields=id,title,status,date,excerpt,link`;
        const result = await wpFetch(wp.creds.url, `/posts${params}`, wp.authHeader);
        if (!result.ok) return `WP REST error ${result.status}: Could not fetch posts.`;

        const posts = result.data as Array<{
          id: number; title: { rendered: string }; status: string; date: string; link: string;
          excerpt: { rendered: string };
        }>;
        if (!posts?.length) return "No posts found.";

        return posts.map((p) => ({
          id: p.id,
          title: p.title?.rendered ?? "Untitled",
          status: p.status,
          date: p.date,
          link: p.link,
        }));
      },
    }),

    wp_list_pages: tool({
      description: `List WordPress pages. Returns title, status, and URL for each page.
Use this to understand the site structure. SAFE read-only operation.`,
      inputSchema: z.object({
        count: z.number().min(1).max(50).default(20).describe("Number of pages to fetch"),
      }),
      execute: async ({ count }) => {
        const wp = await getWpContext(ctx);
        if ("error" in wp) return wp.error;

        const params = `?per_page=${count}&_fields=id,title,status,date,link,parent`;
        const result = await wpFetch(wp.creds.url, `/pages${params}`, wp.authHeader);
        if (!result.ok) return `WP REST error ${result.status}: Could not fetch pages.`;

        const pages = result.data as Array<{
          id: number; title: { rendered: string }; status: string; link: string; parent: number;
        }>;
        if (!pages?.length) return "No pages found.";

        return pages.map((p) => ({
          id: p.id,
          title: p.title?.rendered ?? "Untitled",
          status: p.status,
          link: p.link,
          parentId: p.parent || null,
        }));
      },
    }),

    wp_list_plugins: tool({
      description: `List installed WordPress plugins with their status (active/inactive).
Use this to understand the site's functionality. SAFE read-only operation.`,
      inputSchema: z.object({}),
      execute: async () => {
        const wp = await getWpContext(ctx);
        if ("error" in wp) return wp.error;

        const result = await wpFetch(wp.creds.url, "/plugins", wp.authHeader);
        if (!result.ok) {
          if (result.status === 401 || result.status === 403) {
            return "Cannot list plugins — Application Password may lack the required permission.";
          }
          return `WP REST error ${result.status}: Could not fetch plugins.`;
        }

        const plugins = result.data as Array<{
          plugin: string; name: string; status: string; version: string;
          description: { raw: string };
        }>;
        if (!plugins?.length) return "No plugins found.";

        return plugins.map((p) => ({
          slug: p.plugin,
          name: p.name,
          status: p.status,
          version: p.version,
        }));
      },
    }),

    wp_list_themes: tool({
      description: `List installed WordPress themes and which one is active.
SAFE read-only operation.`,
      inputSchema: z.object({}),
      execute: async () => {
        const wp = await getWpContext(ctx);
        if ("error" in wp) return wp.error;

        const result = await wpFetch(wp.creds.url, "/themes", wp.authHeader);
        if (!result.ok) return `WP REST error ${result.status}: Could not fetch themes.`;

        const themes = result.data as Array<{
          stylesheet: string; name: { rendered: string }; status: string;
          version: string; author: { rendered: string };
        }>;
        if (!themes?.length) return "No themes found.";

        return themes.map((t) => ({
          slug: t.stylesheet,
          name: t.name?.rendered ?? t.stylesheet,
          status: t.status,
          version: t.version,
          author: t.author?.rendered ?? "Unknown",
        }));
      },
    }),

    wp_site_health: tool({
      description: `Get WordPress site info from the REST API root (/wp-json/).
Returns site name, description, WP version, and available API namespaces.
SAFE read-only operation.`,
      inputSchema: z.object({}),
      execute: async () => {
        const wp = await getWpContext(ctx);
        if ("error" in wp) return wp.error;

        const url = `${wp.creds.url.replace(/\/+$/, "")}/wp-json/`;
        const response = await fetch(url, {
          headers: { Authorization: wp.authHeader },
        });
        if (!response.ok) return `WP REST error ${response.status}: Could not fetch site info.`;

        const data = await response.json();
        return {
          name: data?.name ?? "Unknown",
          description: data?.description ?? "",
          url: data?.url ?? "",
          wpVersion: data?.wp_version ?? "Unknown",
          namespaces: data?.namespaces ?? [],
          timezone: data?.timezone_string ?? data?.gmt_offset ?? "Unknown",
        };
      },
    }),
  };
}
