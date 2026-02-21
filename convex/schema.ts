import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  sites: defineTable({
    userId: v.string(),
    name: v.string(),
    url: v.string(),

    // cPanel credentials (AES-256-GCM encrypted)
    cpanelHost: v.optional(v.string()),
    cpanelPort: v.optional(v.number()),
    cpanelUsername: v.optional(v.string()),
    cpanelToken: v.optional(v.string()),
    cpanelTokenIv: v.optional(v.string()),

    // WordPress REST API credentials (encrypted)
    wpRestUrl: v.optional(v.string()),
    wpUsername: v.optional(v.string()),
    wpAppPassword: v.optional(v.string()),
    wpAppPasswordIv: v.optional(v.string()),

    // WordPress Admin credentials (encrypted, for Playwright/Angie)
    wpAdminUser: v.optional(v.string()),
    wpAdminPassword: v.optional(v.string()),
    wpAdminPasswordIv: v.optional(v.string()),

    // Connection status
    cpanelConnected: v.boolean(),
    wpRestConnected: v.boolean(),
    wpAdminConnected: v.boolean(),

    // Discovered plugin APIs (namespaces from /wp-json/)
    discoveredApis: v.optional(v.array(v.object({
      namespace: v.string(),
      label: v.string(),
    }))),

    lastCheckedAt: v.optional(v.number()),
    lastBackupAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),

  auditLogs: defineTable({
    siteId: v.id("sites"),
    userId: v.string(),
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
    timestamp: v.number(),
  })
    .index("by_siteId", ["siteId"])
    .index("by_userId", ["userId"])
    .index("by_siteId_timestamp", ["siteId", "timestamp"]),

  backups: defineTable({
    siteId: v.id("sites"),
    userId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    type: v.union(
      v.literal("full"),
      v.literal("database"),
      v.literal("files"),
    ),
    size: v.optional(v.number()),
    filename: v.optional(v.string()),
    triggeredBy: v.union(
      v.literal("manual"),
      v.literal("auto-safety"),
    ),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  })
    .index("by_siteId", ["siteId"])
    .index("by_siteId_startedAt", ["siteId", "startedAt"]),

  // AI Brain — chat sessions per site
  aiSessions: defineTable({
    siteId: v.id("sites"),
    userId: v.string(),
    mode: v.union(v.literal("builder"), v.literal("doctor")),
    title: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("completed"),
      v.literal("archived"),
    ),
    messageCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_siteId", ["siteId"])
    .index("by_userId", ["userId"])
    .index("by_siteId_updatedAt", ["siteId", "updatedAt"]),

  // AI Brain — messages within a session
  aiMessages: defineTable({
    sessionId: v.id("aiSessions"),
    role: v.union(
      v.literal("user"),
      v.literal("assistant"),
      v.literal("system"),
      v.literal("tool"),
    ),
    content: v.string(),
    // Tool call data (stored as JSON string for flexibility)
    toolCalls: v.optional(v.string()),
    // Tool result data
    toolResults: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_sessionId", ["sessionId"])
    .index("by_sessionId_timestamp", ["sessionId", "timestamp"]),

  // AI Brain — persistent per-site memory
  aiSiteMemory: defineTable({
    siteId: v.id("sites"),
    category: v.union(
      v.literal("site_dna"),        // theme, plugins, structure
      v.literal("action_result"),    // what worked / what failed
      v.literal("user_preference"),  // user's style, recurring requests
      v.literal("warning"),          // things to avoid on this site
    ),
    key: v.string(),                 // e.g. "active_theme", "plugin:woocommerce"
    content: v.string(),             // the actual memory content
    confidence: v.number(),          // 0-1, higher = more reliable
    source: v.string(),              // "scan", "user_feedback", "action_outcome"
    lastVerifiedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_siteId", ["siteId"])
    .index("by_siteId_category", ["siteId", "category"])
    .index("by_siteId_key", ["siteId", "key"]),
});
