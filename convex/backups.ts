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

/**
 * Try to trigger a cPanel backup via the WP PHP bridge.
 * PHP runs on the same hosting server, so requests to cPanel come from
 * a local IP that Imunify360 trusts — bypassing cloud IP blocks.
 * Returns the parsed cPanel response, or null if bridge is unavailable.
 */
async function attemptWpBackupBridge(
  wpRestUrl: string,
  wpUsername: string,
  wpAppPassword: string,
  cpanelHost: string,
  cpanelPort: number,
  cpanelUsername: string,
  cpanelToken: string,
): Promise<{ ok: boolean; pid?: string; error?: string } | null> {
  const base = wpRestUrl.replace(/\/wp-json\/?$/, "").replace(/\/$/, "");
  const url = `${base}/wp-json/wp-pilot/v1/backup`;
  const credentials = btoa(`${wpUsername}:${wpAppPassword}`);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        cpanel_host: cpanelHost,
        cpanel_port: cpanelPort,
        cpanel_username: cpanelUsername,
        cpanel_token: cpanelToken,
      }),
    });
  } catch {
    return null; // Network error — bridge unavailable
  }

  if (!response.ok) {
    // Bridge returned an error — try to parse it
    let errBody = "";
    try { errBody = await response.text(); } catch { /* ignore */ }
    // If 404, endpoint not installed — return null to fall through
    if (response.status === 404) return null;
    return { ok: false, error: `WP bridge HTTP ${response.status}: ${errBody.slice(0, 200)}` };
  }

  let data: Record<string, unknown>;
  try { data = await response.json(); } catch { return null; }

  if (!data?.ok) {
    return { ok: false, error: String(data?.message ?? "Bridge returned not ok") };
  }

  // Parse the nested cPanel result from the bridge response
  const cpResult = data.result as Record<string, unknown> | undefined;
  if (cpResult?.result === 1 || cpResult?.status === 1) {
    const pid = (cpResult?.data as Record<string, unknown>)?.pid;
    return { ok: true, pid: pid ? String(pid) : undefined };
  }

  // cPanel reported failure through the bridge
  const cpErrors = cpResult?.errors as string[] | undefined;
  const cpMessages = cpResult?.messages as string[] | undefined;
  const errMsg = cpErrors?.join(", ") ?? cpMessages?.join(", ") ?? "Backup request failed via bridge";
  return { ok: false, error: errMsg };
}

// Action: call cPanel UAPI to trigger full backup
// Priority: WP PHP bridge first (bypasses Imunify360), then cPanel direct
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

    try {
      // ── Priority 1: WP PHP bridge (bypasses Imunify360) ──
      if (site.wpRestUrl && site.wpUsername && site.wpAppPassword) {
        const bridgeResult = await attemptWpBackupBridge(
          site.wpRestUrl,
          site.wpUsername,
          site.wpAppPassword,
          site.cpanelHost,
          port,
          site.cpanelUsername,
          site.cpanelToken,
        );

        if (bridgeResult !== null) {
          if (bridgeResult.ok) {
            await ctx.runMutation(api.backups.updateBackupStatus, {
              backupId,
              status: "completed",
              filename: bridgeResult.pid
                ? `backup-pid-${bridgeResult.pid}`
                : "backup-pending",
            });
            await ctx.runMutation(api.backups.logAudit, {
              siteId: args.siteId,
              action: "Create full backup",
              layer: "wp-rest",
              riskLevel: "medium",
              details: `Backup triggered via WP bridge, PID: ${bridgeResult.pid ?? "unknown"}`,
              success: true,
            });
            return { success: true, backupId };
          }
          // Bridge returned an error (not null = bridge is installed but cPanel failed)
          throw new Error(bridgeResult.error ?? "Backup failed via WP bridge");
        }
        // bridgeResult === null → bridge not available, fall through to direct
      }

      // ── Priority 2: cPanel direct (fallback) ──
      const url = `https://${site.cpanelHost}:${port}/execute/Backup/fullbackup_to_homedir`;

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
        details: `Backup triggered via UAPI direct, PID: ${data?.data?.pid ?? "unknown"}`,
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
