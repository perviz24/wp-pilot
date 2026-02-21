import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const add = mutation({
  args: {
    sessionId: v.id("aiSessions"),
    role: v.union(
      v.literal("user"),
      v.literal("assistant"),
      v.literal("system"),
      v.literal("tool"),
    ),
    content: v.string(),
    toolCalls: v.optional(v.string()),
    toolResults: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db.insert("aiMessages", {
      sessionId: args.sessionId,
      role: args.role,
      content: args.content,
      toolCalls: args.toolCalls,
      toolResults: args.toolResults,
      timestamp: Date.now(),
    });
  },
});

export const listBySession = query({
  args: {
    sessionId: v.id("aiSessions"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // Verify session belongs to user
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== identity.subject) return [];

    return await ctx.db
      .query("aiMessages")
      .withIndex("by_sessionId_timestamp", (q) =>
        q.eq("sessionId", args.sessionId),
      )
      .order("asc")
      .collect();
  },
});
