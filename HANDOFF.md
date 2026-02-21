# HANDOFF — WP Pilot
Generated: 2026-02-21 (Session 8 — 3-Layer Cross-Site Knowledge System)

## What Was Built This Session
- **3-layer cross-site knowledge architecture**: Global knowledge (Layer 1), Pattern library (Layer 2), Site memory (Layer 3)
- New Convex tables: `aiGlobalKnowledge` + `aiPatternLibrary` with indexes
- New Convex functions: upsert, listAll, listApplicable, listByCategory for both tables
- Auto-promotion logic: patterns with confidence >= 0.8 AND testedOn >= 3 sites promote to global
- 3 new AI tools: `save_global_knowledge`, `save_pattern`, `read_knowledge` (merges all 3 layers)
- System prompt builder updated to inject all 3 layers with token budget caps
- Page.tsx wired to fetch and pass global knowledge + patterns to system prompt
- Seed script with 10 global entries + 3 cross-site patterns (from Memory MCP analysis)
- Seeded both dev and prod Convex deployments

## Current State
- Live URL: https://wp-pilot-one.vercel.app
- Last commit: db8072a feat: seed 10 global knowledge entries + 3 cross-site patterns
- Git: all committed and pushed, branch up to date
- Known issues: cPanel API blocked by hosting WAF (Imunify360) — unchanged from last session
- AI Brain: All 18 tools working (15 original + 3 knowledge tools)
- Knowledge system: 10 global entries + 3 patterns seeded in production
- Zero console errors on live URL

## Next Steps (priority order)
1. **Test knowledge tools live** — ask AI to use `read_knowledge` and `save_pattern` in a real conversation
2. **Polish UI** — improve chat experience, add markdown rendering, better tool result display
3. **Add more sites** — knowledge system becomes more valuable with each site added
4. **Await hosting response** — cPanel API whitelist for Vercel IPs
5. **Upgrade to Clerk production** when ready for real users

## All Features (18 AI tools + app features)
- Feature 1: Clerk auth + Convex integration + dashboard layout
- Feature 2: Site wizard with 3 credential types (cPanel, WP REST, WP Admin)
- Feature 3: cPanel backup trigger via UAPI
- Feature 4: Backup history list on site detail page
- Feature 5: Site health dashboard cards with layer counts
- Feature 6: Read-only file browser with risk colors (critical/caution/safe)
- Feature 7: Audit log viewer with layer icons and risk badges
- Feature 8: REST API namespace discovery via /wp-json/
- AI Brain #1-6: Schema, Convex functions, system prompt, API route, chat UI, Builder/Doctor tabs
- AI Brain #7: Message persistence (messages saved to Convex, reloaded on session resume)
- AI Brain #8: Session history sidebar (list sessions, switch, new chat, archive)
- AI Brain #9: Memory upsert tool — AI saves site learnings during conversations
- Feature #10-12: Modular AI tools — memory, WP REST read, WP REST write, cPanel
- Feature #13: Session title auto-generation — Sonnet 4 generates 3-6 word titles
- Feature #14-16: Elementor tools — read widgets, update widget settings, setup API endpoint (with WAF fallback)
- **Feature #17: 3-layer knowledge system** — global knowledge + pattern library + knowledge tools

## Key Architecture Decisions
- **3-layer knowledge architecture**: Layer 1 (aiGlobalKnowledge = universal truths), Layer 2 (aiPatternLibrary = cross-site patterns with confidence scoring), Layer 3 (aiSiteMemory = per-site memories)
- **Auto-promotion**: confidence >= 0.8 AND testedOn >= 3 unique sites → auto-promotes pattern to global knowledge
- **Confidence formula**: successRate + unique-site bonus (+0.1 per site, cap +0.3), max 1.0
- **Token budget**: Global knowledge 5 per category, patterns 15 max, site memories uncapped
- **Selective seeding**: Only high-value operational knowledge from Memory MCP — excluded routing tables (already in tool descriptions), URLs, implementation details
- **Seed script**: convex/seedKnowledge.ts is an internalMutation (no auth), idempotent (checks before insert)
- **3-layer architecture**: Layer 1 (WP REST API for content), Layer 2 (cPanel UAPI for server — blocked), Layer 3 (Custom Elementor REST API for design)
- Encrypted credentials: AES-256-GCM in Convex (src/lib/crypto.ts), NOT env vars per-site
- File risk classification: src/lib/file-risk.ts maps WordPress files to risk levels
- Audit logging: all actions across all layers log to auditLogs table with risk levels
- API discovery: fetches /wp-json/ root, maps namespaces to friendly labels + categories
- Convex actions for external API calls (cPanel, WP REST), mutations for DB writes
- AI Brain uses Vercel AI SDK v6 with `streamText` + `toUIMessageStreamResponse()`
- System prompt dynamically built from site context + persistent memories + global knowledge + patterns
- AI tools: Vercel AI SDK `tool()` uses `inputSchema` (Zod), NOT `parameters`
- Modular tools: src/lib/ai/tools/index.ts assembles 6 modules (memory, knowledge, wp-rest-read, wp-rest-write, cpanel, elementor)
- **Elementor approach**: Custom REST endpoints via Code Snippets plugin (not mu-plugins), reads/writes _elementor_data post_meta
- Title generation: separate /api/ai/title endpoint using Sonnet 4 (not Haiku — user preference)
- Multi-step tool calling: `stopWhen: stepCountIs(5)` lets AI continue text after tool use

## Environment & Credentials
- Convex dev: precious-perch-420 (local dev)
- Convex prod: outgoing-herring-453 (Vercel production)
- Clerk: maximum-labrador-43.clerk.accounts.dev
- Vercel env vars: NEXT_PUBLIC_CONVEX_URL, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY, ENCRYPTION_SECRET, ANTHROPIC_API_KEY — all set for production
- JWT template "convex" verified in Clerk dashboard
- Anthropic API key name: "WP Pilot"
- WP Pilot runs on port 3001 (port 3000 used by expense-tracker)
- WordPress site: academy.geniusmotion.se
- cPanel host: cpsrv50.misshosting.com:2083 (BLOCKED by WAF — Imunify360)
- Code Snippet: "WP Pilot Elementor API", priority 10, scope "Run everywhere"
