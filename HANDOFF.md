# HANDOFF — WP Pilot
Generated: 2026-02-21 (Session 12 — cPanel 415 Fix Investigation)

## What Was Done This Session
- **Root cause of cPanel 415 found**: misshosting uses an OpenResty reverse proxy in front of cPanel. This proxy requires `Accept: text/html` in the request or it returns HTTP 415 for ALL requests — regardless of Content-Type or HTTP method. Confirmed via PowerShell WebRequest testing.
- **Accept header fix applied**: Updated both `cpanel-tools.ts` and `list-files/route.ts` to send `Accept: application/json,text/html`. Including `application/json` makes cPanel itself respond with JSON instead of an HTML page (both headers are needed).
- **Imunify360 block identified**: After fixing the 415, requests now get through to cPanel but Imunify360 bot-protection blocks Vercel's server IPs. cPanel responds: `{"message": "Access denied by Imunify360 bot-protection. IPs used for automation should be whitelisted"}`. This is a **hosting configuration issue**, not a code bug.
- **Error handling improved**: `list-files/route.ts` now short-circuits immediately on Imunify360 (no point retrying 3 URLs when all share the same blocked IPs) and shows a specific actionable error.
- Commits: `9c96c7b`, `5b1748d`, `614256f` — all pushed and deployed.

## Current State
- Live URL: https://wp-pilot-one.vercel.app
- Last commit: 614256f fix: short-circuit on Imunify360 block with actionable error message
- Git: all committed and pushed, branch up to date
- **BLOCKING ISSUE #1**: Imunify360 on misshosting blocks Vercel's IPs — cPanel file browser and backup tool are non-functional until hosting resolves
  - Fix: Email misshosting support asking them to whitelist Vercel's IP ranges for cPanel API access on your account
  - Alternative: Ask if Imunify360 has an "API Token bypass" setting for whitelisted tokens
- **BLOCKING ISSUE #2**: Anthropic API key is out of credits — AI Brain chat is non-functional
  - Fix: Add credits at https://console.anthropic.com/settings/billing
- Zero console errors on live URL

## What Misshosting Needs To Do
Send this to misshosting support:

> "I am using the cPanel UAPI from a cloud application hosted on Vercel. The requests use a valid API token (`Authorization: cpanel username:TOKEN`) and POST with `Content-Type: application/x-www-form-urlencoded`. However, Imunify360 is blocking all requests from Vercel's server IPs with: 'Access denied by Imunify360 bot-protection. IPs used for automation should be whitelisted.'
>
> Please whitelist Vercel's outgoing IP ranges for cPanel API access on my account (cpsrv50.misshosting.com:2083), or advise how to configure Imunify360 to allow API token-based requests from automated systems."

## Next Steps (priority order)
1. **Add Anthropic API credits** — AI chat feature completely broken without them
2. **Contact misshosting** — request Imunify360 whitelist for Vercel IPs (see message above)
3. **Build whole new pages** — extend clone workflow to create pages from scratch
4. **Polish UI** — markdown rendering in chat, better tool result display
5. **Add more sites** — knowledge system becomes more valuable with each site
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
- **cPanel Accept header**: MUST send `Accept: application/json,text/html` — OpenResty proxy requires `text/html` or returns 415, and `application/json` makes cPanel respond with JSON not HTML page
- **cPanel auth format**: `cpanel username:APITOKEN` (NOT Basic auth, NOT Bearer)
- **Imunify360 block**: Happens at IP level before auth — valid tokens still get blocked. Needs hosting whitelist.
- **wp_slash() fix**: MUST wrap values in wp_slash() before update_post_meta() when copying JSON data containing Unicode escapes — WordPress stripslashes_deep() otherwise mangles them
- **Native scroll > Radix ScrollArea**: In flex layouts, Radix ScrollArea expands to content height. Use native div with overflow-y-auto + min-h-0 on flex parent instead
- **Clone workflow**: Clone page as draft, audit structure, improve widgets, preview via ?page_id=X&preview=true, live page never touched
- **PHP Code Snippet v2**: All 4 endpoints in single Code Snippets plugin entry (ID 25), not mu-plugins
- **3-layer knowledge architecture**: Layer 1 (global), Layer 2 (cross-site patterns), Layer 3 (per-site memories)
- **3-layer site access**: Layer 1 (WP REST), Layer 2 (cPanel — blocked by Imunify360), Layer 3 (Custom Elementor REST)
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
- cPanel host: cpsrv50.misshosting.com:2083 (BLOCKED by Imunify360 — awaiting hosting whitelist)
- Code Snippet: "WP Pilot Elementor API" (ID 25), v2 with 4 endpoints, scope "Run everywhere"
- WordPress login: perviz20@yahoo.com
