/**
 * AI tools for reading and modifying Elementor page designs.
 *
 * Architecture:
 * - A mu-plugin (wp-pilot-elementor-api.php) exposes custom REST endpoints
 *   under /wp-json/wp-pilot/v1/elementor/* that read/write _elementor_data.
 * - These tools call those endpoints through the standard WP REST auth.
 * - A setup tool deploys the mu-plugin via cPanel if it's not installed yet.
 *
 * Safety: Every write operation backs up the original _elementor_data first.
 */

import { tool } from "ai";
import { z } from "zod";
import type { ToolContext } from "./types";
import { wpFetchCustom, getWpContext } from "./wp-rest-helpers";
import { getSiteRecord, getCpanelCredentials, buildCpanelAuthHeader } from "./credential-access";
import type { Id } from "../../../../convex/_generated/dataModel";
import { getMuPluginContent } from "./elementor-mu-plugin";

// ─── Types ───────────────────────────────────────────────────────────────

/** Minimal Elementor widget shape returned by our mu-plugin REST API */
interface ElementorWidget {
  id: string;
  elType: string;
  widgetType?: string;
  settings: Record<string, unknown>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────

/** Summarize a widget for display (truncate long text settings) */
function summarizeWidget(w: ElementorWidget) {
  const summary: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(w.settings)) {
    if (typeof val === "string" && val.length > 100) {
      summary[key] = val.slice(0, 100) + "...";
    } else if (val !== "" && val !== null && val !== undefined) {
      summary[key] = val;
    }
  }
  return {
    id: w.id,
    type: w.widgetType,
    settings: summary,
  };
}

// ─── Tools ───────────────────────────────────────────────────────────────

export function createElementorTools(ctx: ToolContext) {
  return {
    elementor_get_page_widgets: tool({
      description: `Read all Elementor widgets from a WordPress page or post.
Returns a flat list of widgets with their types, IDs, and key settings.
Use this to discover what's on a page before making changes.
SAFE read-only operation. Requires the WP Pilot Elementor API mu-plugin.

Common widget types: heading, text-editor, button, image, icon, spacer,
divider, icon-box, image-box, counter, progress, testimonial, video,
google_maps, form, nav-menu, sidebar, shortcode.

If you get a 404 error, run elementor_setup_api first to install the endpoint.`,
      inputSchema: z.object({
        postId: z
          .number()
          .describe("WordPress post/page ID to read Elementor data from"),
        widgetType: z
          .string()
          .optional()
          .describe(
            "Optional: filter by widget type (e.g. 'button', 'heading', 'text-editor')",
          ),
      }),
      execute: async ({ postId, widgetType }) => {
        const wp = await getWpContext(ctx);
        if ("error" in wp) return wp.error;

        const result = await wpFetchCustom(
          wp.creds.url,
          `/wp-pilot/v1/elementor/${postId}`,
          wp.authHeader,
        );

        if (!result.ok) {
          if (result.status === 404) {
            return "Elementor API endpoint not found. Run elementor_setup_api to install it.";
          }
          return `Error reading Elementor data: ${result.status}`;
        }

        const response = result.data as {
          post_id: number;
          title: string;
          widget_count: number;
          widgets: ElementorWidget[];
        };

        if (!response?.widgets?.length) {
          return `Page #${postId} has no Elementor widgets, or is not built with Elementor.`;
        }

        let widgets = response.widgets;
        if (widgetType) {
          widgets = widgets.filter((w) => w.widgetType === widgetType);
          if (!widgets.length) {
            return `No "${widgetType}" widgets found on page #${postId}. Available types: ${[...new Set(response.widgets.map((w) => w.widgetType))].join(", ")}`;
          }
        }

        return {
          postId: response.post_id,
          title: response.title,
          totalWidgets: response.widget_count,
          showing: widgets.length,
          widgets: widgets.map(summarizeWidget),
        };
      },
    }),

    elementor_update_widget: tool({
      description: `Update settings on an Elementor widget. CAUTION: This modifies the live page design.
Always use elementor_get_page_widgets first to find the widget ID and current settings.
The AI should show the user what will change and ask for confirmation before calling this.

Common settings you can change:
- Button: background_color, text, size, link.url, border_radius
- Heading: title, header_size (h1-h6), title_color, typography_font_size
- Text Editor: editor (HTML content)
- Image: image.url, image_size
- Section/Column: background_color, padding, margin

Color values should be hex format: "#FF0000" for red, "#00FF00" for green, etc.
The tool creates a backup before making changes. If something goes wrong, the backup can be restored.`,
      inputSchema: z.object({
        postId: z
          .number()
          .describe("WordPress post/page ID containing the widget"),
        widgetId: z
          .string()
          .describe("Elementor widget ID (from elementor_get_page_widgets)"),
        settings: z
          .record(z.string(), z.unknown())
          .describe(
            'Settings to update as key-value pairs. Example: {"background_color": "#00FF00", "text": "Click Here"}',
          ),
      }),
      execute: async ({ postId, widgetId, settings }) => {
        const wp = await getWpContext(ctx);
        if ("error" in wp) return wp.error;

        const result = await wpFetchCustom(
          wp.creds.url,
          `/wp-pilot/v1/elementor/${postId}/widget/${widgetId}`,
          wp.authHeader,
          {
            method: "POST",
            body: { settings },
          },
        );

        if (!result.ok) {
          if (result.status === 404) {
            const errData = result.data as { code?: string } | null;
            if (errData?.code === "widget_not_found") {
              return `Widget "${widgetId}" not found on page #${postId}. Use elementor_get_page_widgets to find valid widget IDs.`;
            }
            return "Elementor API endpoint not found. Run elementor_setup_api to install it.";
          }
          return `Error updating widget: ${result.status}`;
        }

        const response = result.data as {
          success: boolean;
          widget_id: string;
          updated_settings: Record<string, unknown>;
          backup_key: string;
        };

        return {
          success: true,
          widgetId: response?.widget_id,
          updatedSettings: response?.updated_settings,
          backupKey: response?.backup_key,
          message: `Widget "${widgetId}" updated on page #${postId}. Backup saved as "${response?.backup_key}". Changes are live — refresh the page to see them.`,
        };
      },
    }),

    elementor_setup_api: tool({
      description: `Install the WP Pilot Elementor API mu-plugin on the WordPress site.
This creates a small PHP file in wp-content/mu-plugins/ that registers custom REST endpoints
for reading and modifying Elementor page data.

REQUIRES: cPanel connection (uses cPanel file API to write the plugin file).
Run this ONCE when the user first wants to make Elementor design changes.
The mu-plugin auto-loads on every WordPress request — no activation needed.

CAUTION: Creates a file on the server. Explain to the user what this does before running.`,
      inputSchema: z.object({}),
      execute: async () => {
        if (!ctx.siteId || !ctx.convexToken) {
          return "Missing site context or authentication.";
        }

        const site = await getSiteRecord(
          ctx.siteId as Id<"sites">,
          ctx.convexToken,
        );
        if (!site) return "Site not found.";

        const creds = getCpanelCredentials(site);
        if (!creds) {
          return "cPanel not connected. Need cPanel access to install the mu-plugin.";
        }

        const authHeader = buildCpanelAuthHeader(creds);
        const phpContent = getMuPluginContent();
        const cpanelBase = `https://${creds.host}:${creds.port}`;

        // First ensure mu-plugins directory exists
        const mkdirBody = new URLSearchParams({
          dir: "public_html/wp-content",
          name: "mu-plugins",
        });
        await fetch(`${cpanelBase}/execute/Fileman/mkdir`, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: mkdirBody.toString(),
        }).catch(() => null); // Ignore if already exists

        // Write the mu-plugin file (POST with form body — required by cPanel UAPI)
        const writeBody = new URLSearchParams({
          dir: "public_html/wp-content/mu-plugins",
          file: "wp-pilot-elementor-api.php",
          content: phpContent,
          charset: "utf-8",
        });
        const response = await fetch(
          `${cpanelBase}/execute/Fileman/save_file_content`,
          {
            method: "POST",
            headers: {
              Authorization: authHeader,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: writeBody.toString(),
          },
        );

        if (!response.ok) {
          const isWafBlock =
            response.status === 415 ||
            response.status === 403 ||
            response.status === 406;
          if (isWafBlock) {
            return {
              success: false,
              error: `cPanel API blocked (HTTP ${response.status}). The hosting firewall (Imunify360/ModSecurity) is blocking API calls from external servers.`,
              manualInstallation: {
                instructions:
                  "The user needs to install the file manually via cPanel File Manager:",
                steps: [
                  "1. Log into cPanel at your hosting provider",
                  "2. Open 'File Manager'",
                  "3. Navigate to public_html/wp-content/",
                  "4. Create a folder called 'mu-plugins' (if it doesn't exist)",
                  "5. Inside mu-plugins, create a new file called 'wp-pilot-elementor-api.php'",
                  "6. Paste the PHP code I'll provide, then Save",
                ],
                note: "After installation, the Elementor read/update tools will work normally through the WP REST API (which is not blocked).",
              },
            };
          }
          return `cPanel error ${response.status}: Could not write mu-plugin file.`;
        }

        const data = (await response.json().catch(() => null)) as {
          errors?: string[] | null;
        } | null;
        if (data?.errors?.length) {
          return `cPanel error: ${data.errors.join(", ")}`;
        }

        return {
          success: true,
          message:
            "WP Pilot Elementor API installed. The endpoint is now available at /wp-json/wp-pilot/v1/elementor/. You can now use elementor_get_page_widgets and elementor_update_widget.",
          file: "wp-content/mu-plugins/wp-pilot-elementor-api.php",
        };
      },
    }),
  };
}

