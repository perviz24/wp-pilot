import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listByUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    const userId = identity.subject;
    return await ctx.db
      .query("sites")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const addSite = mutation({
  args: {
    name: v.string(),
    url: v.string(),
    // cPanel credentials (optional)
    cpanelHost: v.optional(v.string()),
    cpanelPort: v.optional(v.number()),
    cpanelUsername: v.optional(v.string()),
    cpanelToken: v.optional(v.string()),
    // WP REST API credentials (optional)
    wpRestUrl: v.optional(v.string()),
    wpUsername: v.optional(v.string()),
    wpAppPassword: v.optional(v.string()),
    // WP Admin credentials (optional)
    wpAdminUser: v.optional(v.string()),
    wpAdminPassword: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    const siteId = await ctx.db.insert("sites", {
      userId,
      name: args.name,
      url: args.url,
      cpanelHost: args.cpanelHost,
      cpanelPort: args.cpanelPort,
      cpanelUsername: args.cpanelUsername,
      cpanelToken: args.cpanelToken,
      wpRestUrl: args.wpRestUrl,
      wpUsername: args.wpUsername,
      wpAppPassword: args.wpAppPassword,
      wpAdminUser: args.wpAdminUser,
      wpAdminPassword: args.wpAdminPassword,
      cpanelConnected: !!(args.cpanelHost && args.cpanelToken),
      wpRestConnected: !!(args.wpRestUrl && args.wpAppPassword),
      wpAdminConnected: !!(args.wpAdminUser && args.wpAdminPassword),
      createdAt: Date.now(),
    });

    return siteId;
  },
});
