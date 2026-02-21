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
  v.literal("ai-discovery"),
  v.literal("user-feedback"),
  v.literal("audit-finding"),
  v.literal("documentation"),
);

const testedOnEntry = v.object({
  siteId: v.string(),
  siteName: v.string(),
  date: v.number(),
  success: v.boolean(),
  notes: v.optional(v.string()),
});

/**
 * Upsert a pattern. If key exists, append to testedOn and recalculate confidence.
 * Auto-promotes to global knowledge when thresholds met.
 */
export const upsert = mutation({
  args: {
    category: categoryValidator,
    key: v.string(),
    problem: v.string(),
    solution: v.string(),
    source: sourceValidator,
    siteId: v.string(),
    siteName: v.string(),
    success: v.boolean(),
    notes: v.optional(v.string()),
    appliesWhen: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const now = Date.now();
    const newTestEntry = {
      siteId: args.siteId,
      siteName: args.siteName,
      date: now,
      success: args.success,
      notes: args.notes,
    };

    const existing = await ctx.db
      .query("aiPatternLibrary")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (existing) {
      const updatedTestedOn = [...existing.testedOn, newTestEntry];
      const { successRate, confidence } = computeConfidence(updatedTestedOn);

      await ctx.db.patch(existing._id, {
        problem: args.problem,
        solution: args.solution,
        testedOn: updatedTestedOn,
        successRate,
        confidence,
        appliesWhen: args.appliesWhen ?? existing.appliesWhen,
        updatedAt: now,
      });

      // Auto-promote if thresholds met and not already promoted
      if (!existing.promotedToGlobal && shouldPromote(confidence, updatedTestedOn, args.source)) {
        await ctx.db.patch(existing._id, { promotedToGlobal: true });
        await promoteToGlobal(ctx, {
          category: args.category,
          key: args.key,
          content: `${args.problem} → ${args.solution}`,
          confidence,
        });
      }

      return existing._id;
    }

    // New pattern
    const testedOn = [newTestEntry];
    const { successRate, confidence } = computeConfidence(testedOn);

    // Documentation-sourced patterns auto-promote immediately
    const isDocSource = args.source === "documentation";
    const promoted = isDocSource;

    const patternId = await ctx.db.insert("aiPatternLibrary", {
      category: args.category,
      key: args.key,
      problem: args.problem,
      solution: args.solution,
      testedOn,
      successRate,
      confidence: isDocSource ? 0.95 : confidence,
      appliesWhen: args.appliesWhen,
      promotedToGlobal: promoted,
      source: args.source,
      createdAt: now,
      updatedAt: now,
    });

    if (promoted) {
      await promoteToGlobal(ctx, {
        category: args.category,
        key: args.key,
        content: `${args.problem} → ${args.solution}`,
        confidence: 0.95,
      });
    }

    return patternId;
  },
});

/** List all patterns, optionally filtered by category. */
export const listAll = query({
  args: {
    category: v.optional(categoryValidator),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    if (args.category) {
      return await ctx.db
        .query("aiPatternLibrary")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .collect();
    }

    return await ctx.db.query("aiPatternLibrary").collect();
  },
});

/** List patterns applicable to a site based on its plugin tags. */
export const listApplicable = query({
  args: {
    detectedPlugins: v.optional(v.array(v.string())),
    minConfidence: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const all = await ctx.db.query("aiPatternLibrary").collect();
    const minConf = args.minConfidence ?? 0.5;

    return all.filter((pattern) => {
      if (pattern.confidence < minConf) return false;
      if (!pattern.appliesWhen || pattern.appliesWhen.length === 0) return true;
      if (!args.detectedPlugins) return true;
      // At least one tag must match detected plugins
      return pattern.appliesWhen.some((tag) =>
        args.detectedPlugins!.some((p) =>
          p.toLowerCase().includes(tag.toLowerCase()),
        ),
      );
    });
  },
});

// --- Internal helpers ---

function computeConfidence(testedOn: { success: boolean }[]): {
  successRate: number;
  confidence: number;
} {
  if (testedOn.length === 0) return { successRate: 0, confidence: 0 };

  const successes = testedOn.filter((t) => t.success).length;
  const successRate = successes / testedOn.length;

  // Unique sites bonus: +0.1 per unique site, capped at +0.3
  const uniqueSites = new Set(
    (testedOn as { siteId?: string }[]).map((t) => t.siteId).filter(Boolean),
  );
  const siteBonus = Math.min(uniqueSites.size * 0.1, 0.3);

  const confidence = Math.min(successRate + siteBonus, 1.0);
  return { successRate, confidence };
}

function shouldPromote(
  confidence: number,
  testedOn: { siteId?: string }[],
  source: string,
): boolean {
  if (source === "documentation") return true;
  const uniqueSites = new Set(testedOn.map((t) => t.siteId).filter(Boolean));
  return confidence >= 0.8 && uniqueSites.size >= 3;
}

async function promoteToGlobal(
  ctx: { db: { query: Function; insert: Function } },
  entry: {
    category: string;
    key: string;
    content: string;
    confidence: number;
  },
) {
  // Check if already exists in global knowledge
  const existing = await (ctx.db as any)
    .query("aiGlobalKnowledge")
    .withIndex("by_key", (q: any) => q.eq("key", entry.key))
    .first();

  if (existing) return; // Don't duplicate

  const now = Date.now();
  await (ctx.db as any).insert("aiGlobalKnowledge", {
    category: entry.category,
    key: `pattern:${entry.key}`,
    content: entry.content,
    source: "learned",
    confidence: entry.confidence,
    createdAt: now,
    updatedAt: now,
  });
}
