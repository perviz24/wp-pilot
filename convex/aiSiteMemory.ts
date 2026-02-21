import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const categoryValidator = v.union(
  v.literal("site_dna"),
  v.literal("action_result"),
  v.literal("user_preference"),
  v.literal("warning"),
);

export const upsert = mutation({
  args: {
    siteId: v.id("sites"),
    category: categoryValidator,
    key: v.string(),
    content: v.string(),
    confidence: v.number(),
    source: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Check if memory with this key already exists for this site
    const existing = await ctx.db
      .query("aiSiteMemory")
      .withIndex("by_siteId_key", (q) =>
        q.eq("siteId", args.siteId).eq("key", args.key),
      )
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        content: args.content,
        confidence: args.confidence,
        source: args.source,
        category: args.category,
        lastVerifiedAt: now,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("aiSiteMemory", {
      siteId: args.siteId,
      category: args.category,
      key: args.key,
      content: args.content,
      confidence: args.confidence,
      source: args.source,
      lastVerifiedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const listBySite = query({
  args: {
    siteId: v.id("sites"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("aiSiteMemory")
      .withIndex("by_siteId", (q) => q.eq("siteId", args.siteId))
      .collect();
  },
});

export const listByCategory = query({
  args: {
    siteId: v.id("sites"),
    category: categoryValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("aiSiteMemory")
      .withIndex("by_siteId_category", (q) =>
        q.eq("siteId", args.siteId).eq("category", args.category),
      )
      .collect();
  },
});

export const remove = mutation({
  args: {
    memoryId: v.id("aiSiteMemory"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const memory = await ctx.db.get(args.memoryId);
    if (!memory) throw new Error("Memory not found");

    await ctx.db.delete(args.memoryId);
  },
});
