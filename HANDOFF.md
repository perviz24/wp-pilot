# HANDOFF — WP Pilot
Generated: 2026-02-21 (Session 9 — Research Tools, Knowledge Orchestration, Stream Fixes)

## What Was Built This Session
- **WordPress.org research tools**: `wp_search_plugins`, `wp_search_themes`, `wp_plugin_details` — 3 new AI tools for external plugin/theme research via public WordPress.org APIs
- **Knowledge orchestration system prompt**: Builder 8-step workflow + Doctor 6-step systematic audit, both wired into the system prompt with smart decision logic for when to use internal knowledge vs external research
- **Smart knowledge decision system**: Situational analysis table — AI evaluates each question to decide whether site memory, global knowledge, patterns, or external WordPress.org APIs are most valuable
- **Stream reliability fixes** (3 bugs found and fixed during live testing):
  - `maxDuration` increased 60→120s for multi-tool Doctor audits
  - `stepCountIs` increased 5→8 so AI has room for tool calls + final text response
  - Try/catch wrapper on `handleFinish` callback — Convex mutation errors were preventing useChat status from transitioning to "ready", leaving send button permanently disabled
  - Smart two-tier stream timeout: 15s inactivity detector + 135s absolute max (replaces flat 150s)
  - `onError` handler added to `useChat` for error visibility

## Current State
- Live URL: https://wp-pilot-one.vercel.app
- Last commit: 160082e fix: prevent stuck send button with try/catch onFinish + smart stream timeout
- Git: all committed and pushed, branch up to date
- Known issues: cPanel API blocked by hosting WAF (Imunify360) — unchanged
- AI Brain: All 21 tools working (18 original + 3 research tools)
- Both Builder and Doctor modes tested and verified working on production
- Zero console errors on live URL

## Next Steps (priority order)
1. **Polish UI** — improve chat experience, add markdown rendering, better tool result display
2. **Add more sites** — knowledge system becomes more valuable with each site added
3. **Await hosting response** — cPanel API whitelist for Vercel IPs
4. **Upgrade to Clerk production** when ready for real users

## All Features (21 AI tools + app features)
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
- **Feature #18: WordPress.org research tools** — plugin search, theme search, plugin details (public APIs)
- **Feature #19: Knowledge orchestration** — smart system prompt with builder/doctor workflows + situational knowledge decision system

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
- AI Brain uses Vercel AI SDK v6 (`ai@6.0.97`) with `streamText` + `toUIMessageStreamResponse()`
- System prompt dynamically built from site context + persistent memories + global knowledge + patterns
- AI tools: Vercel AI SDK `tool()` uses `inputSchema` (Zod), NOT `parameters`
- Modular tools: src/lib/ai/tools/index.ts assembles 7 modules (memory, knowledge, research, wp-rest-read, wp-rest-write, cpanel, elementor)
- **Elementor approach**: Custom REST endpoints via Code Snippets plugin (not mu-plugins), reads/writes _elementor_data post_meta
- Title generation: separate /api/ai/title endpoint using Sonnet 4 (not Haiku — user preference)
- **Multi-step tool calling**: `stopWhen: stepCountIs(8)` — Doctor audits need ~5 tool calls + final text. `maxDuration: 120` for Vercel function timeout
- **Stream resilience**: handleFinish wrapped in try/catch to prevent Convex mutation errors from blocking UI. Two-tier timeout: 15s inactivity + 135s absolute max
- **Research tools**: WordPress.org public APIs (no auth), 10s timeout per request, registered as separate module in tools/index.ts

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
