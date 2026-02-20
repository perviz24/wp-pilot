import { query } from "./_generated/server";

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
