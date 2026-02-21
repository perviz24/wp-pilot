/**
 * AI tools for external knowledge fetching.
 * WordPress.org APIs — free, no auth needed.
 * Enables the AI to research plugins, themes, and best practices
 * before recommending them to users.
 */

import { tool } from "ai";
import { z } from "zod";

export function createResearchTools() {
  return {
    wp_search_plugins: tool({
      description: `Search the WordPress.org plugin directory for plugins by keyword.
Returns name, slug, rating, active installs, version, and description.
Use this to research the BEST plugin for a specific need before recommending installation.
Compare multiple results by rating and active_installs to find the most reliable option.
This is a SAFE read-only external search — does not touch the user's site.`,
      inputSchema: z.object({
        query: z
          .string()
          .describe(
            "Search term (e.g. 'caching', 'seo', 'contact form', 'woocommerce shipping')"
          ),
        count: z
          .number()
          .min(1)
          .max(10)
          .default(5)
          .describe("Number of results (default 5)"),
      }),
      execute: async ({ query, count }) => {
        try {
          const url = new URL(
            "https://api.wordpress.org/plugins/info/1.2/"
          );
          url.searchParams.set("action", "query_plugins");
          url.searchParams.set(
            "request[search]",
            query
          );
          url.searchParams.set(
            "request[per_page]",
            String(count)
          );
          url.searchParams.set(
            "request[fields][description]",
            "1"
          );
          url.searchParams.set(
            "request[fields][short_description]",
            "1"
          );
          url.searchParams.set(
            "request[fields][rating]",
            "1"
          );
          url.searchParams.set(
            "request[fields][active_installs]",
            "1"
          );
          url.searchParams.set(
            "request[fields][tested]",
            "1"
          );
          url.searchParams.set(
            "request[fields][requires]",
            "1"
          );
          url.searchParams.set(
            "request[fields][requires_php]",
            "1"
          );

          const response = await fetch(url.toString(), {
            signal: AbortSignal.timeout(10000),
          });
          if (!response.ok) {
            return `WordPress.org API error: ${response.status}`;
          }

          const data = await response.json();
          const plugins = data?.plugins;
          if (!plugins?.length) {
            return `No plugins found for "${query}".`;
          }

          return plugins.map(
            (p: {
              name: string;
              slug: string;
              version: string;
              rating: number;
              active_installs: number;
              tested: string;
              requires: string;
              requires_php: string;
              short_description: string;
            }) => ({
              name: p.name,
              slug: p.slug,
              version: p.version,
              rating: p.rating,
              activeInstalls: p.active_installs,
              testedUpTo: p.tested,
              requiresWP: p.requires,
              requiresPHP: p.requires_php,
              description: p.short_description,
            })
          );
        } catch (error) {
          const msg =
            error instanceof Error ? error.message : "Unknown error";
          return `Failed to search WordPress.org plugins: ${msg}`;
        }
      },
    }),

    wp_search_themes: tool({
      description: `Search the WordPress.org theme directory for themes by keyword.
Returns name, slug, rating, active installs, and description.
Use this to research themes when the user wants to change their site's look.
This is a SAFE read-only external search — does not touch the user's site.`,
      inputSchema: z.object({
        query: z
          .string()
          .describe(
            "Search term (e.g. 'education', 'restaurant', 'portfolio', 'minimal blog')"
          ),
        count: z
          .number()
          .min(1)
          .max(10)
          .default(5)
          .describe("Number of results (default 5)"),
      }),
      execute: async ({ query, count }) => {
        try {
          const url = new URL(
            "https://api.wordpress.org/themes/info/1.2/"
          );
          url.searchParams.set("action", "query_themes");
          url.searchParams.set(
            "request[search]",
            query
          );
          url.searchParams.set(
            "request[per_page]",
            String(count)
          );
          url.searchParams.set(
            "request[fields][description]",
            "1"
          );
          url.searchParams.set(
            "request[fields][rating]",
            "1"
          );
          url.searchParams.set(
            "request[fields][active_installs]",
            "1"
          );
          url.searchParams.set(
            "request[fields][template]",
            "1"
          );

          const response = await fetch(url.toString(), {
            signal: AbortSignal.timeout(10000),
          });
          if (!response.ok) {
            return `WordPress.org API error: ${response.status}`;
          }

          const data = await response.json();
          const themes = data?.themes;
          if (!themes?.length) {
            return `No themes found for "${query}".`;
          }

          return themes.map(
            (t: {
              name: string;
              slug: string;
              version: string;
              rating: number;
              active_installs: number;
              description: string;
              template: string;
            }) => ({
              name: t.name,
              slug: t.slug,
              version: t.version,
              rating: t.rating,
              activeInstalls: t.active_installs,
              description:
                t.description?.substring(0, 200) +
                (t.description?.length > 200 ? "..." : ""),
              parentTheme: t.template || null,
            })
          );
        } catch (error) {
          const msg =
            error instanceof Error ? error.message : "Unknown error";
          return `Failed to search WordPress.org themes: ${msg}`;
        }
      },
    }),

    wp_plugin_details: tool({
      description: `Get detailed info about a specific WordPress plugin by its slug.
Returns full description, changelog highlights, reviews count, download count, and compatibility.
Use this after wp_search_plugins to get deeper info on a specific plugin before recommending it.
This is a SAFE read-only external lookup.`,
      inputSchema: z.object({
        slug: z
          .string()
          .describe(
            "Plugin slug (e.g. 'woocommerce', 'yoast-seo', 'elementor')"
          ),
      }),
      execute: async ({ slug }) => {
        try {
          const url = new URL(
            "https://api.wordpress.org/plugins/info/1.2/"
          );
          url.searchParams.set("action", "plugin_information");
          url.searchParams.set("request[slug]", slug);
          url.searchParams.set(
            "request[fields][description]",
            "1"
          );
          url.searchParams.set(
            "request[fields][sections]",
            "0"
          );
          url.searchParams.set(
            "request[fields][rating]",
            "1"
          );
          url.searchParams.set(
            "request[fields][ratings]",
            "1"
          );
          url.searchParams.set(
            "request[fields][active_installs]",
            "1"
          );
          url.searchParams.set(
            "request[fields][downloaded]",
            "1"
          );
          url.searchParams.set(
            "request[fields][last_updated]",
            "1"
          );
          url.searchParams.set(
            "request[fields][added]",
            "1"
          );
          url.searchParams.set(
            "request[fields][tested]",
            "1"
          );
          url.searchParams.set(
            "request[fields][requires]",
            "1"
          );
          url.searchParams.set(
            "request[fields][requires_php]",
            "1"
          );
          url.searchParams.set(
            "request[fields][tags]",
            "1"
          );

          const response = await fetch(url.toString(), {
            signal: AbortSignal.timeout(10000),
          });
          if (!response.ok) {
            return `WordPress.org API error: ${response.status}`;
          }

          const p = await response.json();
          if (p?.error) {
            return `Plugin "${slug}" not found on WordPress.org.`;
          }

          return {
            name: p.name,
            slug: p.slug,
            version: p.version,
            rating: p.rating,
            numRatings: p.num_ratings,
            activeInstalls: p.active_installs,
            downloaded: p.downloaded,
            lastUpdated: p.last_updated,
            added: p.added,
            testedUpTo: p.tested,
            requiresWP: p.requires,
            requiresPHP: p.requires_php,
            tags: p.tags ? Object.values(p.tags) : [],
            description:
              p.short_description || p.description?.substring(0, 300),
          };
        } catch (error) {
          const msg =
            error instanceof Error ? error.message : "Unknown error";
          return `Failed to get plugin details: ${msg}`;
        }
      },
    }),
  };
}
