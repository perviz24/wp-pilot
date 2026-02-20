import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Create a backup record in pending state
export const createBackup = mutation({
  args: {
    siteId: v.id("sites"),
    type: v.union(v.literal("full"), v.literal("database"), v.literal("files")),
    triggeredBy: v.union(v.literal("manual"), v.literal("auto-safety")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const site = await ctx.db.get(args.siteId);
    if (!site || site.userId !== identity.subject) {
      throw new Error("Site not found");
    }
    if (!site.cpanelConnected) {
      throw new Error("cPanel not connected for this site");
    }
    const backupId = await ctx.db.insert("backups", {
      siteId: args.siteId,
      userId: identity.subject,
      status: "pending",
      type: args.type,
      triggeredBy: args.triggeredBy,
      startedAt: Date.now(),
    });
    return backupId;
  },
});

// Update backup status after cPanel API call
export const updateBackupStatus = mutation({
  args: {
    backupId: v.id("backups"),
    status: v.union(
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    filename: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const backup = await ctx.db.get(args.backupId);
    if (!backup || backup.userId !== identity.subject) {
      throw new Error("Backup not found");
    }
    const updates: Record<string, unknown> = { status: args.status };
    if (args.filename) updates.filename = args.filename;
    if (args.errorMessage) updates.errorMessage = args.errorMessage;
    if (args.status === "completed" || args.status === "failed") {
      updates.completedAt = Date.now();
    }
    await ctx.db.patch(args.backupId, updates);

    // Update site's lastBackupAt on success
    if (args.status === "completed") {
      await ctx.db.patch(backup.siteId, { lastBackupAt: Date.now() });
    }
  },
});

// Log audit entry for backup actions
export const logAudit = mutation({
  args: {
    siteId: v.id("sites"),
    action: v.string(),
    layer: v.union(
      v.literal("cpanel"),
      v.literal("wp-rest"),
      v.literal("wpcode"),
      v.literal("angie"),
      v.literal("playwright"),
    ),
    riskLevel: v.union(
      v.literal("safe"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("blocked"),
      v.literal("critical"),
    ),
    details: v.optional(v.string()),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    await ctx.db.insert("auditLogs", {
      ...args,
      userId: identity.subject,
      timestamp: Date.now(),
    });
  },
});

// Action: call cPanel UAPI to trigger full backup
export const triggerCpanelBackup = action({
  args: { siteId: v.id("sites") },
  handler: async (ctx, args): Promise<{ success: boolean; backupId: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Create backup record first
    const backupId = await ctx.runMutation(api.backups.createBackup, {
      siteId: args.siteId,
      type: "full",
      triggeredBy: "manual",
    });

    // Get site credentials
    const site = await ctx.runQuery(api.sites.getById, {
      siteId: args.siteId,
    });

    if (!site || !site.cpanelHost || !site.cpanelToken || !site.cpanelUsername) {
      await ctx.runMutation(api.backups.updateBackupStatus, {
        backupId,
        status: "failed",
        errorMessage: "Missing cPanel credentials",
      });
      await ctx.runMutation(api.backups.logAudit, {
        siteId: args.siteId,
        action: "Create full backup",
        layer: "cpanel",
        riskLevel: "medium",
        success: false,
        errorMessage: "Missing cPanel credentials",
      });
      throw new Error("Missing cPanel credentials");
    }

    // Mark as in-progress
    await ctx.runMutation(api.backups.updateBackupStatus, {
      backupId,
      status: "in_progress",
    });

    const port = site.cpanelPort ?? 2083;
    const url = `https://${site.cpanelHost}:${port}/execute/Backup/fullbackup_to_homedir`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `cpanel ${site.cpanelUsername}:${site.cpanelToken}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "",
      });

      if (!response.ok) {
        throw new Error(`cPanel API returned ${response.status}`);
      }

      const data = await response.json();

      if (data?.result !== 1 && data?.status !== 1) {
        const errMsg =
          data?.errors?.join(", ") ??
          data?.messages?.join(", ") ??
          "Backup request failed";
        throw new Error(errMsg);
      }

      // Backup started successfully (runs async on cPanel server)
      await ctx.runMutation(api.backups.updateBackupStatus, {
        backupId,
        status: "completed",
        filename: data?.data?.pid
          ? `backup-pid-${data.data.pid}`
          : "backup-pending",
      });

      await ctx.runMutation(api.backups.logAudit, {
        siteId: args.siteId,
        action: "Create full backup",
        layer: "cpanel",
        riskLevel: "medium",
        details: `Backup triggered via UAPI, PID: ${data?.data?.pid ?? "unknown"}`,
        success: true,
      });

      return { success: true, backupId };
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Unknown error";
      await ctx.runMutation(api.backups.updateBackupStatus, {
        backupId,
        status: "failed",
        errorMessage: errorMsg,
      });

      await ctx.runMutation(api.backups.logAudit, {
        siteId: args.siteId,
        action: "Create full backup",
        layer: "cpanel",
        riskLevel: "medium",
        success: false,
        errorMessage: errorMsg,
      });

      throw new Error(`Backup failed: ${errorMsg}`);
    }
  },
});

// List backups for a site
export const listBySite = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const site = await ctx.db.get(args.siteId);
    if (!site || site.userId !== identity.subject) return [];
    return await ctx.db
      .query("backups")
      .withIndex("by_siteId_startedAt", (q) => q.eq("siteId", args.siteId))
      .order("desc")
      .take(20);
  },
});
