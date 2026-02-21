# HANDOFF — WP Pilot
Generated: 2026-02-21 (Session 11 — Bug Fixes: Chat Scroll + Unicode Encoding)

## What Was Fixed This Session
- **Chat scroll bug**: AI chat messages couldn't be scrolled — replaced Radix ScrollArea with native div + overflow-y-auto. Verified on production (scrollHeight 4839 > clientHeight 590).
- **Unicode encoding bug**: Swedish characters (ö, ä, å) displayed as u00f6, u00e4, u00e5 on cloned page previews. Root cause: WordPress `stripslashes_deep()` strips backslashes from JSON Unicode escapes. Fix: wrap values in `wp_slash()` before `update_post_meta()`. Verified by cloning homepage — all 55 widgets with correct Swedish chars.
- **PHP Code Snippet updated**: Snippet ID 25 on WordPress updated with wp_slash fix via Playwright automation.
- **Cleanup**: Deleted old broken test clones (2295, 2296), test clone (2299), temp-snippet-setter.js, revoked temporary Application Password.

## Current State
- Live URL: https://wp-pilot-one.vercel.app
- Last commit: 5d09f00 fix: chat scroll + Unicode encoding in page clone
- Git: all committed and pushed, branch up to date
- **BLOCKING ISSUE**: Anthropic API key is out of credits — AI Brain chat is non-functional
  - Error: "Your credit balance is too low to access the Anthropic API"
  - Fix: Add credits at https://console.anthropic.com/settings/billing
- Known issues: cPanel API blocked by hosting WAF (Imunify360) — unchanged
- AI Brain: All 23 tools defined but chat non-functional until API credits added
- Zero console errors on live URL (UI loads fine, only AI chat calls fail)

## Next Steps (priority order)
1. **Add Anthropic API credits** — AI chat feature is completely broken without them
2. **Build whole new pages** — extend clone workflow to create pages from scratch
3. **Polish UI** — markdown rendering in chat, better tool result display
4. **Add more sites** — knowledge system becomes more valuable with each site
5. **Await hosting response** — cPanel API whitelist for Vercel IPs
6. **Upgrade to Clerk production** when ready for real users

## All Features (23 AI tools + app features)
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
- Feature #14-16: Elementor tools — read widgets, update widget settings, setup API endpoint
- Feature #17: 3-layer knowledge system — global knowledge + pattern library + knowledge tools
- Feature #18: WordPress.org research tools — plugin search, theme search, plugin details
- Feature #19: Knowledge orchestration — smart system prompt with builder/doctor workflows
- Feature #20: Page structure tool — hierarchical section-column-widget tree with 40+ design settings
- Feature #21: Page clone tool — clone any Elementor page as safe draft for testing improvements

## Key Architecture Decisions
- **wp_slash() fix**: MUST wrap values in wp_slash() before update_post_meta() when copying JSON data containing Unicode escapes — WordPress stripslashes_deep() otherwise mangles them
- **Native scroll > Radix ScrollArea**: In flex layouts, Radix ScrollArea expands to content height. Use native div with overflow-y-auto + min-h-0 on flex parent instead
- **Clone workflow**: Clone page as draft, audit structure, improve widgets, preview via ?page_id=X&preview=true, live page never touched
- **PHP Code Snippet v2**: All 4 endpoints in single Code Snippets plugin entry (ID 25), not mu-plugins
- **3-layer knowledge architecture**: Layer 1 (global), Layer 2 (cross-site patterns), Layer 3 (per-site memories)
- **3-layer site access**: Layer 1 (WP REST), Layer 2 (cPanel — blocked), Layer 3 (Custom Elementor REST)
- Encrypted credentials: AES-256-GCM in Convex, NOT env vars per-site
- AI Brain uses Vercel AI SDK v6 with `streamText` + `toUIMessageStreamResponse()`
- Modular tools: src/lib/ai/tools/index.ts assembles 8 modules
- **Stream resilience**: handleFinish wrapped in try/catch, two-tier timeout: 15s inactivity + 135s absolute max

## Environment & Credentials
- Convex dev: precious-perch-420 (local dev)
- Convex prod: outgoing-herring-453 (Vercel production)
- Clerk: maximum-labrador-43.clerk.accounts.dev
- Vercel env vars: NEXT_PUBLIC_CONVEX_URL, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY, ENCRYPTION_SECRET, ANTHROPIC_API_KEY — all set for production
- JWT template "convex" verified in Clerk dashboard
- Anthropic API key name: "WP Pilot" — **OUT OF CREDITS as of 2026-02-21**
- WP Pilot runs on port 3001 (port 3000 used by expense-tracker)
- WordPress site: academy.geniusmotion.se
- WordPress Application Password: "WP-pilot" (UUID: a51e705e, stored encrypted in Convex production)
- cPanel host: cpsrv50.misshosting.com:2083 (BLOCKED by WAF)
- Code Snippet: "WP Pilot Elementor API" (ID 25), v2 with 4 endpoints, scope "Run everywhere"
- WordPress login: perviz20@yahoo.com
