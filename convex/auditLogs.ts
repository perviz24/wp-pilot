import { query } from "./_generated/server";
import { v } from "convex/values";

// List audit logs for a site, most recent first
export const listBySite = query({
  args: {
    siteId: v.id("sites"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const site = await ctx.db.get(args.siteId);
    if (!site || site.userId !== identity.subject) return [];

    return await ctx.db
      .query("auditLogs")
      .withIndex("by_siteId_timestamp", (q) => q.eq("siteId", args.siteId))
      .order("desc")
      .take(args.limit ?? 50);
  },
});
