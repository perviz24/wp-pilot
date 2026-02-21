# HANDOFF — WP Pilot
Generated: 2026-02-21 (Session 7 — Elementor Design Tools + Testing)

## What Was Built This Session
- Elementor REST API endpoint installed on WordPress via Code Snippets plugin (bypasses cPanel WAF)
- WAF detection added to elementor_setup_api tool (HTTP 415/403/406 detection + manual install instructions)
- System prompt updated with Elementor workflow documentation and WAF fallback
- Full end-to-end testing of Elementor tools: READ (55 widgets), WRITE (color change), REVERT (restore original)
- 4 Memory MCP entities stored (elementor-tools, cpanel-waf-issue, architecture-layers, elementor-workflow)

## Current State
- Live URL: https://wp-pilot-one.vercel.app
- Last commit: 36eb7d4 refactor: add WAF detection for Elementor setup
- Git: all committed and pushed, branch up to date
- Known issues: cPanel API blocked by hosting WAF (Imunify360) — email sent to hosting, awaiting response
- AI Brain: All 15 tools working (12 original + 3 Elementor)
- Elementor tools: fully tested on production — read, write, revert all confirmed working
- Code Snippet: "WP Pilot Elementor API" installed on academy.geniusmotion.se, priority 10, scope "Run everywhere"

## Next Steps (priority order)
1. **Await hosting response** — cPanel API whitelist for Vercel IPs (email sent to misshosting.com)
2. **Polish UI** — improve chat experience, add markdown rendering, better tool result display
3. **Add more Elementor operations** — section-level changes, adding/removing widgets
4. **Upgrade to Clerk production** when ready for real users
5. **Test cPanel tools** once WAF whitelist is in place

## All Features (15 AI tools + app features)
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

## Key Architecture Decisions
- **3-layer architecture**: Layer 1 (WP REST API for content), Layer 2 (cPanel UAPI for server — blocked), Layer 3 (Custom Elementor REST API for design)
- Encrypted credentials: AES-256-GCM in Convex (src/lib/crypto.ts), NOT env vars per-site
- File risk classification: src/lib/file-risk.ts maps WordPress files to risk levels
- Audit logging: all actions across all layers log to auditLogs table with risk levels
- API discovery: fetches /wp-json/ root, maps namespaces to friendly labels + categories
- Convex actions for external API calls (cPanel, WP REST), mutations for DB writes
- AI Brain uses Vercel AI SDK v6 with `streamText` + `toUIMessageStreamResponse()`
- System prompt dynamically built from site context + persistent memories
- AI tools: Vercel AI SDK `tool()` uses `inputSchema` (Zod), NOT `parameters`
- Modular tools: src/lib/ai/tools/index.ts assembles 5 modules (memory, wp-rest-read, wp-rest-write, cpanel, elementor)
- **Elementor approach**: Custom REST endpoints via Code Snippets plugin (not mu-plugins), reads/writes _elementor_data post_meta
- **Elementor backup**: Automatic _elementor_data_backup_{timestamp} created before every widget update
- **Elementor cache**: Clears _elementor_css + Elementor Plugin files_manager->clear_cache() after updates
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
