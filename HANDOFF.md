# HANDOFF — WP Pilot
Generated: 2026-02-21 (Session 10 — Clone + Page Structure Tools, End-to-End Workflow Verified)

## What Was Built This Session
- **Page clone tool** (`wp_clone_page`): Clones any Elementor page as draft — copies all 55 widgets + _elementor_data meta, live page untouched
- **Page structure tool** (`wp_get_page_structure`): Returns hierarchical section → column → widget tree with 40+ design-relevant settings extracted per widget
- **PHP Code Snippet v2**: Expanded from 169→382 lines, 2→4 REST endpoints (page-structure + clone-page added)
- **Modular PHP architecture**: Split monolithic endpoint file into php-elementor-endpoints.ts + php-clone-endpoints.ts
- **Code Snippet installed via Playwright**: Automated WordPress admin login, CodeMirror API, save — with backslash escaping fix

## End-to-End Workflow Test (VERIFIED on production)
Tested the full **clone → audit → improve → preview** workflow through AI Brain chat on wp-pilot-one.vercel.app:

1. **AI Brain chat**: Asked AI to analyze homepage structure and clone it
2. **`wp_get_page_structure`** fired: Returned 7 sections, 55 widgets from homepage (page 8)
3. **`wp_clone_page`** fired: Created draft "Hem - SEO Test Draft" (post ID 2296)
4. **AI analyzed structure**: Identified hero section, courses grid, free tools, business services, partnership, contact sections
5. **Asked AI to improve hero heading + CTA**: AI used `wp_update_elementor_widget` to update draft
6. **CTA button text changed**: "Utforska Våra Utbildningar" → "Se Våra Certifierade Online Utbildningar för Vårdpersonal"
7. **Preview link works**: `https://academy.geniusmotion.se/?page_id=2296&preview=true` renders correctly
8. **Live homepage untouched**: All changes only on draft clone

**Result: Full workflow working. All 4 PHP endpoints + 23 AI tools operational on production.**

## Current State
- Live URL: https://wp-pilot-one.vercel.app
- Last commit: 10def35 docs: add Code Snippet v2 PHP for WordPress installation
- Git: all committed and pushed, branch up to date
- Known issues: cPanel API blocked by hosting WAF (Imunify360) — unchanged
- AI Brain: All 23 tools working (21 previous + 2 new clone/structure tools)
- Both Builder and Doctor modes tested and verified working on production
- Zero console errors on live URL
- Test clones on WordPress: post 2295 ("Hem — WP Pilot Test Clone") and 2296 ("Hem - SEO Test Draft") — can be deleted when no longer needed

## Next Steps (priority order)
1. **Build whole new pages** — extend clone workflow to create pages from scratch using Elementor
2. **Build whole new websites** — accumulate knowledge across sites
3. **Polish UI** — improve chat experience, add markdown rendering, better tool result display
4. **Add more sites** — knowledge system becomes more valuable with each site added
5. **Clean up test clones** — delete posts 2295 and 2296 from WordPress when done testing
6. **Await hosting response** — cPanel API whitelist for Vercel IPs
7. **Upgrade to Clerk production** when ready for real users

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
- Feature #14-16: Elementor tools — read widgets, update widget settings, setup API endpoint (with WAF fallback)
- Feature #17: 3-layer knowledge system — global knowledge + pattern library + knowledge tools
- Feature #18: WordPress.org research tools — plugin search, theme search, plugin details (public APIs)
- Feature #19: Knowledge orchestration — smart system prompt with builder/doctor workflows + situational knowledge decision system
- **Feature #20: Page structure tool** — hierarchical section→column→widget tree with 40+ design settings
- **Feature #21: Page clone tool** — clone any Elementor page as safe draft for testing improvements

## Key Architecture Decisions
- **Clone workflow**: Clone page as draft → audit structure → improve widgets → preview via ?page_id=X&preview=true → live page never touched
- **Page structure extraction**: Recursive tree builder preserving section→column→widget hierarchy with ~40 design-relevant CSS/layout settings per widget
- **PHP Code Snippet v2**: All 4 endpoints in single Code Snippets plugin entry (ID 25), not mu-plugins (cPanel blocked by WAF)
- **Modular PHP generation**: php-elementor-endpoints.ts (read/write) + php-clone-endpoints.ts (clone/structure) imported by elementor-mu-plugin.ts
- **3-layer knowledge architecture**: Layer 1 (aiGlobalKnowledge = universal truths), Layer 2 (aiPatternLibrary = cross-site patterns with confidence scoring), Layer 3 (aiSiteMemory = per-site memories)
- **Auto-promotion**: confidence >= 0.8 AND testedOn >= 3 unique sites → auto-promotes pattern to global knowledge
- **3-layer site access**: Layer 1 (WP REST API for content), Layer 2 (cPanel UAPI for server — blocked), Layer 3 (Custom Elementor REST API for design)
- Encrypted credentials: AES-256-GCM in Convex (src/lib/crypto.ts), NOT env vars per-site
- AI Brain uses Vercel AI SDK v6 with `streamText` + `toUIMessageStreamResponse()`
- System prompt dynamically built from site context + persistent memories + global knowledge + patterns
- Modular tools: src/lib/ai/tools/index.ts assembles 8 modules (memory, knowledge, research, wp-rest-read, wp-rest-write, cpanel, elementor, clone)
- **Elementor approach**: Custom REST endpoints via Code Snippets plugin, reads/writes _elementor_data post_meta
- **Multi-step tool calling**: `stopWhen: stepCountIs(8)` + `maxDuration: 120`
- **Stream resilience**: handleFinish wrapped in try/catch, two-tier timeout: 15s inactivity + 135s absolute max

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
- Code Snippet: "WP Pilot Elementor API" (ID 25), v2 with 4 endpoints, priority 10, scope "Run everywhere"
- WordPress login: perviz20@yahoo.com (password in user's possession)
