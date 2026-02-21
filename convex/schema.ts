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
    .index("by_siteId_updatedAt", ["siteId", "updatedAt"])
    .index("by_siteId_mode", ["siteId", "mode"]),

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

  // AI Knowledge Layer 1 — Global knowledge (applies to ALL sites)
  aiGlobalKnowledge: defineTable({
    category: v.union(
      v.literal("security"),         // safety rules, risk classification
      v.literal("seo"),              // search engine best practices
      v.literal("speed"),            // performance optimization
      v.literal("design"),           // design patterns
      v.literal("conversion"),       // conversion optimization
      v.literal("accessibility"),    // a11y rules
      v.literal("woocommerce"),      // WooCommerce-specific knowledge
      v.literal("learndash"),        // LearnDash-specific knowledge
      v.literal("elementor"),        // Elementor-specific knowledge
      v.literal("wordpress-core"),   // core WP best practices
      v.literal("hosting"),          // hosting provider knowledge
      v.literal("content"),          // content management rules
    ),
    key: v.string(),                 // unique identifier within category
    content: v.string(),             // the knowledge itself
    source: v.union(
      v.literal("best-practice"),    // known universal truth
      v.literal("documentation"),    // from official docs
      v.literal("learned"),          // promoted from pattern library
    ),
    confidence: v.number(),          // 0-1
    appliesWhen: v.optional(v.string()), // conditional tag, e.g. "plugin:woocommerce"
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_key", ["key"]),

  // AI Knowledge Layer 2 — Pattern library (cross-site learned patterns)
  aiPatternLibrary: defineTable({
    category: v.union(
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
    ),
    key: v.string(),                 // unique pattern identifier
    problem: v.string(),             // what problem this solves
    solution: v.string(),            // how to solve it
    testedOn: v.array(v.object({     // which sites this was tested on
      siteId: v.string(),            // stored as string for flexibility
      siteName: v.string(),
      date: v.number(),
      success: v.boolean(),
      notes: v.optional(v.string()),
    })),
    successRate: v.number(),         // computed: successes / total tests
    confidence: v.number(),          // successRate + site bonus (capped)
    appliesWhen: v.optional(v.array(v.string())), // tags: ["woocommerce", "elementor"]
    promotedToGlobal: v.boolean(),   // true if promoted to global knowledge
    source: v.union(
      v.literal("ai-discovery"),     // AI discovered during conversation
      v.literal("user-feedback"),    // user confirmed this works
      v.literal("audit-finding"),    // found during site audit
      v.literal("documentation"),    // from official docs (auto-promotes)
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_key", ["key"])
    .index("by_confidence", ["confidence"])
    .index("by_promotedToGlobal", ["promotedToGlobal"]),

  // AI Knowledge Layer 3 — Per-site memory (existing, unchanged)
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
