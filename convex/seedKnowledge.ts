/**
 * One-time seed script for the 3-layer knowledge system.
 * Run via: npx convex run seedKnowledge:seedAll
 *
 * Seeds 10 global knowledge entries + 3 cross-site patterns.
 * Selective: only high-value operational knowledge, NOT routing tables
 * (those are already encoded in AI tool descriptions).
 */

import { internalMutation } from "./_generated/server";

export const seedAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let globalCount = 0;
    let patternCount = 0;

    // ============================================
    // LAYER 1: GLOBAL KNOWLEDGE (10 entries)
    // ============================================

    const globalEntries = [
      {
        category: "security" as const,
        key: "risk-classification-system",
        content:
          "Every WordPress write operation must be classified before execution: SAFE (read-only, execute immediately), LOW (reversible writes like creating drafts), MODERATE (modifies existing data with revisions), HIGH (can break site — plugins, themes, widgets), CRITICAL (irreversible — deletes, URL changes, payment settings). Classification determines required user confirmation level.",
        source: "best-practice" as const,
        confidence: 0.95,
      },
      {
        category: "security" as const,
        key: "backup-before-write",
        content:
          "Before ANY write operation: GET the current state of the resource and store the full JSON as a snapshot. For HIGH/CRITICAL risk, require a verified full-site backup. No exceptions.",
        source: "best-practice" as const,
        confidence: 0.95,
      },
      {
        category: "security" as const,
        key: "health-check-after-write",
        content:
          "After ANY write operation, verify: 1) GET /wp-json/ root responds 200 OK, 2) GET homepage renders (not blank), 3) If WooCommerce: GET /wc/v3/products?per_page=1 works. If 3 consecutive 5xx → STOP all operations immediately.",
        source: "best-practice" as const,
        confidence: 0.95,
      },
      {
        category: "wordpress-core" as const,
        key: "draft-first-rule",
        content:
          "New content (posts, pages, products) must ALWAYS be created as 'draft' status first, never directly as 'publish'. Let user review before publishing.",
        source: "best-practice" as const,
        confidence: 0.95,
      },
      {
        category: "wordpress-core" as const,
        key: "one-at-a-time-plugin-updates",
        content:
          "Never batch multiple plugin updates simultaneously. Update one, verify site health (GET /wp-json/ + homepage), then proceed to next. A single bad plugin update can cause WSOD.",
        source: "best-practice" as const,
        confidence: 0.95,
      },
      {
        category: "wordpress-core" as const,
        key: "side-effect-awareness",
        content:
          "Before any write, check: Does this send emails? (WooCommerce order status changes do). Does this affect SEO? (Slug changes break rankings). Does this affect live users? (Price changes affect active carts). Does this affect students? (LearnDash course changes affect enrolled students). If ANY = yes → inform user with specifics BEFORE executing.",
        source: "best-practice" as const,
        confidence: 0.95,
      },
      {
        category: "woocommerce" as const,
        key: "order-status-triggers-emails",
        content:
          "Changing WooCommerce order status triggers automated customer emails. processing→completed sends 'Order Complete' email. cancelled/refunded triggers refund emails. NEVER automate status changes without warning user which emails will be sent.",
        source: "documentation" as const,
        confidence: 0.95,
      },
      {
        category: "woocommerce" as const,
        key: "price-update-timing",
        content:
          "Updating product prices while customers are in active checkout means cart may show old price but order processes at new price. Best practice: update during low-traffic hours (2-4 AM local time) and clear all caches after.",
        source: "best-practice" as const,
        confidence: 0.9,
      },
      {
        category: "hosting" as const,
        key: "shared-hosting-rate-limits",
        content:
          "On shared hosting: max 1-2 requests/second for reads, 1 request every 2-3 seconds for writes. Max 25 items per batch. Never flood the server — can trigger WAF or get IP banned.",
        source: "best-practice" as const,
        confidence: 0.9,
      },
      {
        category: "content" as const,
        key: "never-change-published-slugs",
        content:
          "Modifying published post/page slugs (URLs) breaks existing links and SEO rankings. Never change slugs without user understanding the SEO impact and setting up 301 redirects.",
        source: "best-practice" as const,
        confidence: 0.95,
      },
    ];

    for (const entry of globalEntries) {
      // Check if already exists
      const existing = await ctx.db
        .query("aiGlobalKnowledge")
        .withIndex("by_key", (q) => q.eq("key", entry.key))
        .first();

      if (!existing) {
        await ctx.db.insert("aiGlobalKnowledge", {
          ...entry,
          createdAt: now,
          updatedAt: now,
        });
        globalCount++;
      }
    }

    // ============================================
    // LAYER 2: PATTERNS (3 entries)
    // ============================================

    const patternEntries = [
      {
        category: "hosting" as const,
        key: "imunify360-cpanel-blocked",
        problem:
          "cPanel API calls from cloud IPs (Convex, Vercel) blocked by Imunify360 bot-protection. Returns 200 OK but body contains 'Access denied by Imunify360' instead of expected JSON data.",
        solution:
          "Use WordPress Code Snippets plugin to deploy PHP code instead of cPanel file operations. Code Snippets REST API and WP Admin are NOT blocked (port 443 vs cPanel port 2083). For cPanel access, user must contact hosting support to whitelist specific IPs.",
        source: "ai-discovery" as const,
        appliesWhen: ["shared-hosting", "imunify360", "misshosting"],
        testedOn: [
          {
            siteId: "placeholder",
            siteName: "academy.geniusmotion.se",
            date: now,
            success: true,
            notes:
              "Confirmed: cPanel blocked, Code Snippets workaround successful for Elementor API installation",
          },
        ],
        successRate: 1.0,
        confidence: 0.8,
      },
      {
        category: "hosting" as const,
        key: "cpanel-token-name-vs-value",
        problem:
          "Users often enter the cPanel API token NAME (user-chosen label like 'Claude123') instead of the actual token VALUE (long hex string). Token name gives 'Access denied' 403 from any IP.",
        solution:
          "Add hint text to token input field explaining the difference. Token VALUE is shown ONCE at creation (e.g., 'YPXAZ02XDFKNG741D8X6SBJEZQF5UHZ3'). Guide user to cPanel → Manage API Tokens to find/create token and copy the VALUE.",
        source: "ai-discovery" as const,
        appliesWhen: ["cpanel"],
        testedOn: [
          {
            siteId: "placeholder",
            siteName: "academy.geniusmotion.se",
            date: now,
            success: true,
            notes:
              "User initially entered token name, corrected to token value, authentication succeeded",
          },
        ],
        successRate: 1.0,
        confidence: 0.8,
      },
      {
        category: "elementor" as const,
        key: "elementor-api-via-code-snippets",
        problem:
          "Need to install custom REST API endpoint for Elementor widget reading/writing, but cPanel file operations are blocked by hosting WAF.",
        solution:
          "Install the PHP endpoint via WordPress Code Snippets plugin instead of writing to mu-plugins via cPanel. Create snippet named 'WP Pilot Elementor API' with scope 'Run everywhere'. The snippet registers REST routes at /wp-json/wp-pilot/v1/elementor/{post_id} for GET (read widgets) and POST (update widget settings). Requires edit_posts capability.",
        source: "ai-discovery" as const,
        appliesWhen: ["elementor", "shared-hosting"],
        testedOn: [
          {
            siteId: "placeholder",
            siteName: "academy.geniusmotion.se",
            date: now,
            success: true,
            notes:
              "Successfully read 55 widgets, changed button color, reverted — site survived intact",
          },
        ],
        successRate: 1.0,
        confidence: 0.8,
      },
    ];

    for (const entry of patternEntries) {
      const existing = await ctx.db
        .query("aiPatternLibrary")
        .withIndex("by_key", (q) => q.eq("key", entry.key))
        .first();

      if (!existing) {
        await ctx.db.insert("aiPatternLibrary", {
          ...entry,
          promotedToGlobal: false,
          createdAt: now,
          updatedAt: now,
        });
        patternCount++;
      }
    }

    return `Seeded ${globalCount} global knowledge entries and ${patternCount} patterns.`;
  },
});
