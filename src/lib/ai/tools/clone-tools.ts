/**
 * AI tools for the "clone → audit → improve → preview" workflow.
 *
 * wp_clone_page — Clone any page as a draft, preserving all Elementor data.
 *   Live page stays untouched. Returns preview URL for the draft.
 *
 * wp_get_page_structure — Hierarchical page layout for design audits.
 *   Returns sections > columns > widgets tree with design-relevant settings.
 *
 * Both tools require the WP Pilot REST API v2 snippet on the WordPress site.
 */

import { tool } from "ai";
import { z } from "zod";
import type { ToolContext } from "./types";
import { wpFetchCustom, getWpContext } from "./wp-rest-helpers";

export function createCloneTools(ctx: ToolContext) {
  return {
    wp_clone_page: tool({
      description: `Clone a WordPress page as a draft, preserving ALL Elementor layout and widget data.
The live page is NEVER modified — all work happens on the new draft copy.

Use this as the FIRST step in the "clone → audit → improve → preview" workflow:
1. Clone the page (this tool) → get a draft copy
2. Audit the draft structure (wp_get_page_structure)
3. Improve widgets on the draft (elementor_update_widget)
4. Share the preview URL with the user

Returns: new page ID, preview URL (for viewing), edit URL (for Elementor editor).
The draft won't appear on the live site until manually published.

REQUIRES: WP Pilot REST API v2 snippet installed on WordPress.
If you get a 404, the clone endpoint is not installed yet.`,
      inputSchema: z.object({
        pageId: z
          .number()
          .describe("WordPress page/post ID to clone (e.g. the homepage ID)"),
        title: z
          .string()
          .optional()
          .describe(
            'Optional title for the clone. Defaults to "[Original Title] (Draft Clone)"',
          ),
      }),
      execute: async ({ pageId, title }) => {
        const wp = await getWpContext(ctx);
        if ("error" in wp) return wp.error;

        const result = await wpFetchCustom(
          wp.creds.url,
          "/wp-pilot/v1/clone-page",
          wp.authHeader,
          {
            method: "POST",
            body: {
              source_post_id: pageId,
              ...(title ? { title } : {}),
            },
          },
        );

        if (!result.ok) {
          if (result.status === 404) {
            return "Clone endpoint not found. The WP Pilot REST API v2 snippet needs to be installed on WordPress. Ask the user to update the Code Snippet.";
          }
          const errData = result.data as { message?: string } | null;
          return `Error cloning page: ${result.status} — ${errData?.message ?? "Unknown error"}`;
        }

        const data = result.data as {
          success: boolean;
          source_id: number;
          source_title: string;
          new_post_id: number;
          new_title: string;
          widget_count: number;
          preview_url: string;
          edit_url: string;
          message: string;
        };

        return {
          success: true,
          sourceId: data.source_id,
          sourceTitle: data.source_title,
          cloneId: data.new_post_id,
          cloneTitle: data.new_title,
          status: "draft",
          widgetCount: data.widget_count,
          previewUrl: data.preview_url,
          editUrl: data.edit_url,
          message: data.message,
          nextSteps: [
            `Use wp_get_page_structure with postId=${data.new_post_id} to audit the layout`,
            `Use elementor_update_widget with postId=${data.new_post_id} to improve widgets`,
            `Share preview URL with user: ${data.preview_url}`,
          ],
        };
      },
    }),

    wp_get_page_structure: tool({
      description: `Get the HIERARCHICAL layout structure of an Elementor page for design audits.
Unlike elementor_get_page_widgets (which returns a flat list), this preserves the full
sections → columns → widgets tree, showing how the page is actually laid out.

Returns for EACH element:
- Sections: background colors, padding, layout type, responsive visibility
- Columns: width ratios, spacing, flex settings
- Widgets: type, text content, colors, typography, sizing

Use this to:
- Audit a page's design (spacing, color consistency, typography hierarchy)
- Plan improvements before modifying widgets
- Compare source vs clone structure
- Identify design issues (inconsistent spacing, missing mobile optimization)

SAFE read-only operation.
REQUIRES: WP Pilot REST API v2 snippet installed on WordPress.`,
      inputSchema: z.object({
        postId: z
          .number()
          .describe("WordPress page/post ID to analyze"),
      }),
      execute: async ({ postId }) => {
        const wp = await getWpContext(ctx);
        if ("error" in wp) return wp.error;

        const result = await wpFetchCustom(
          wp.creds.url,
          `/wp-pilot/v1/page-structure/${postId}`,
          wp.authHeader,
        );

        if (!result.ok) {
          if (result.status === 404) {
            const errData = result.data as { code?: string } | null;
            if (errData?.code === "post_not_found") {
              return `Page #${postId} not found.`;
            }
            if (errData?.code === "no_elementor_data") {
              return `Page #${postId} has no Elementor data — it may not be built with Elementor.`;
            }
            return "Page structure endpoint not found. The WP Pilot REST API v2 snippet needs to be installed.";
          }
          return `Error reading page structure: ${result.status}`;
        }

        const data = result.data as {
          post_id: number;
          title: string;
          status: string;
          sections: number;
          total_widgets: number;
          page_settings: Record<string, unknown>;
          structure: unknown[];
        };

        return {
          postId: data.post_id,
          title: data.title,
          status: data.status,
          sectionCount: data.sections,
          totalWidgets: data.total_widgets,
          pageSettings: data.page_settings,
          structure: data.structure,
        };
      },
    }),
  };
}
