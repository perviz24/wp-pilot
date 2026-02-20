import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

interface WpNamespace {
  namespace: string;
  label: string;
}

// Discover available REST API namespaces from /wp-json/
export const discoverApis = action({
  args: { siteId: v.id("sites") },
  handler: async (ctx, args): Promise<{ namespaces: WpNamespace[] }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const site = await ctx.runQuery(api.sites.getById, {
      siteId: args.siteId,
    });

    if (!site) throw new Error("Site not found");
    if (!site.wpRestConnected || !site.wpRestUrl) {
      throw new Error("WP REST API not configured");
    }

    // Build auth header if credentials exist
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (site.wpUsername && site.wpAppPassword) {
      const creds = btoa(`${site.wpUsername}:${site.wpAppPassword}`);
      headers.Authorization = `Basic ${creds}`;
    }

    // Fetch /wp-json/ root to get index
    const baseUrl = site.wpRestUrl.replace(/\/+$/, "");
    const url = baseUrl.includes("/wp-json")
      ? baseUrl
      : `${baseUrl}/wp-json`;

    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`WP REST API returned ${response.status}`);
    }

    const data = await response.json();
    const rawNamespaces: string[] = data?.namespaces ?? [];

    // Map namespaces to friendly labels
    const namespaces: WpNamespace[] = rawNamespaces.map((ns: string) => ({
      namespace: ns,
      label: getNamespaceLabel(ns),
    }));

    // Save to site
    await ctx.runMutation(api.discovery.saveDiscoveredApis, {
      siteId: args.siteId,
      apis: namespaces,
    });

    // Audit log
    await ctx.runMutation(api.backups.logAudit, {
      siteId: args.siteId,
      action: "Discover REST API namespaces",
      layer: "wp-rest",
      riskLevel: "safe",
      details: `Found ${namespaces.length} namespaces`,
      success: true,
    });

    return { namespaces };
  },
});

// Save discovered APIs to site record
export const saveDiscoveredApis = mutation({
  args: {
    siteId: v.id("sites"),
    apis: v.array(
      v.object({ namespace: v.string(), label: v.string() }),
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const site = await ctx.db.get(args.siteId);
    if (!site || site.userId !== identity.subject) {
      throw new Error("Site not found");
    }
    await ctx.db.patch(args.siteId, { discoveredApis: args.apis });
  },
});

// Get discovered APIs for a site
export const getDiscoveredApis = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const site = await ctx.db.get(args.siteId);
    if (!site || site.userId !== identity.subject) return [];
    return site.discoveredApis ?? [];
  },
});

// Map common WP namespaces to human-readable labels
function getNamespaceLabel(ns: string): string {
  const LABELS: Record<string, string> = {
    wp: "WordPress Core",
    "wp/v2": "WordPress Core v2",
    oembed: "oEmbed",
    "oembed/1.0": "oEmbed 1.0",
    "wp-site-health": "Site Health",
    "wp-site-health/v1": "Site Health v1",
    "wp-block-editor": "Block Editor",
    "wp-block-editor/v1": "Block Editor v1",
    wc: "WooCommerce",
    "wc/v3": "WooCommerce v3",
    "wc/store": "WooCommerce Store",
    "wc-analytics": "WC Analytics",
    yoast: "Yoast SEO",
    "yoast/v1": "Yoast SEO v1",
    "rankmath/v1": "Rank Math SEO",
    "jetpack/v4": "Jetpack v4",
    "elementor/v1": "Elementor",
    "acf/v3": "ACF v3",
    "wpcode/v1": "WPCode v1",
    "contact-form-7": "Contact Form 7",
    "contact-form-7/v1": "Contact Form 7 v1",
  };
  return LABELS[ns] ?? ns;
}
