import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    siteId: v.id("sites"),
    mode: v.union(v.literal("builder"), v.literal("doctor")),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject;

    const now = Date.now();
    return await ctx.db.insert("aiSessions", {
      siteId: args.siteId,
      userId,
      mode: args.mode,
      title: args.title,
      status: "active",
      messageCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getLatestActive = query({
  args: {
    siteId: v.id("sites"),
    mode: v.union(v.literal("builder"), v.literal("doctor")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const sessions = await ctx.db
      .query("aiSessions")
      .withIndex("by_siteId_mode", (q) =>
        q.eq("siteId", args.siteId).eq("mode", args.mode),
      )
      .order("desc")
      .take(10);

    // Find the latest active session owned by this user
    return (
      sessions.find(
        (s) => s.status === "active" && s.userId === identity.subject,
      ) ?? null
    );
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
      .query("aiSessions")
      .withIndex("by_siteId_updatedAt", (q) => q.eq("siteId", args.siteId))
      .order("desc")
      .take(20);
  },
});

export const getById = query({
  args: {
    sessionId: v.id("aiSessions"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== identity.subject) return null;
    return session;
  },
});

export const updateTitle = mutation({
  args: {
    sessionId: v.id("aiSessions"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== identity.subject) {
      throw new Error("Session not found");
    }

    await ctx.db.patch(args.sessionId, {
      title: args.title,
      updatedAt: Date.now(),
    });
  },
});

export const archive = mutation({
  args: {
    sessionId: v.id("aiSessions"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== identity.subject) {
      throw new Error("Session not found");
    }

    await ctx.db.patch(args.sessionId, {
      status: "archived",
      updatedAt: Date.now(),
    });
  },
});

export const incrementMessageCount = mutation({
  args: {
    sessionId: v.id("aiSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    await ctx.db.patch(args.sessionId, {
      messageCount: session.messageCount + 1,
      updatedAt: Date.now(),
    });
  },
});
