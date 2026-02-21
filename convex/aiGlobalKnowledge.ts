import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const categoryValidator = v.union(
  v.literal("security"),
  v.literal("seo"),
  v.literal("speed"),
  v.literal("design"),
  v.literal("conversion"),
  v.literal("accessibility"),
  v.literal("woocommerce"),
  v.literal("learndash"),
  v.literal("elementor"),
  v.literal("wordpress-core"),
  v.literal("hosting"),
  v.literal("content"),
);

const sourceValidator = v.union(
  v.literal("best-practice"),
  v.literal("documentation"),
  v.literal("learned"),
);

/** Upsert a global knowledge entry (by key). */
export const upsert = mutation({
  args: {
    category: categoryValidator,
    key: v.string(),
    content: v.string(),
    source: sourceValidator,
    confidence: v.number(),
    appliesWhen: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("aiGlobalKnowledge")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        content: args.content,
        confidence: args.confidence,
        source: args.source,
        category: args.category,
        appliesWhen: args.appliesWhen,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("aiGlobalKnowledge", {
      category: args.category,
      key: args.key,
      content: args.content,
      source: args.source,
      confidence: args.confidence,
      appliesWhen: args.appliesWhen,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/** List all global knowledge entries. */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db.query("aiGlobalKnowledge").collect();
  },
});

/** List global knowledge by category. */
export const listByCategory = query({
  args: { category: categoryValidator },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("aiGlobalKnowledge")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .collect();
  },
});

/** List applicable global knowledge for a site (filters by appliesWhen tags). */
export const listApplicable = query({
  args: {
    detectedPlugins: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const all = await ctx.db.query("aiGlobalKnowledge").collect();

    // Return entries that either have no condition OR match detected plugins
    return all.filter((entry) => {
      if (!entry.appliesWhen) return true;
      if (!args.detectedPlugins) return true;
      // appliesWhen is "plugin:woocommerce" — check if plugin is detected
      const condition = entry.appliesWhen.replace("plugin:", "");
      return args.detectedPlugins.some(
        (p) => p.toLowerCase().includes(condition.toLowerCase()),
      );
    });
  },
});
