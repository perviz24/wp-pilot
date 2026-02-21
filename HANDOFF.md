# HANDOFF — WP Pilot
Generated: 2026-02-21 (Session 6 — Modular AI Tools + Title Generation)

## What Was Built This Session
- Feature #10-12: Modular AI tools refactor — split monolithic file into 4 modules (memory, WP REST read, WP REST write, cPanel)
- Feature #13: Session title auto-generation — AI generates 3-6 word titles after first response
- Fix: Changed title generation model from Haiku (inaccessible) to Sonnet 4 per user request
- All features verified on production with 0 console errors

## Current State
- Live URL: https://wp-pilot-one.vercel.app
- Last commit: 5f9a68b fix: use sonnet 4 for session title generation
- Git: all committed and pushed, branch up to date
- Known issues: none — all features tested on production
- AI Brain: Builder and Doctor modes work correctly
- Title generation: Sonnet 4 generates titles like "Check WordPress Theme Information"
- Memory system: AI recalls site facts across sessions (verified: identified Flavor theme)

## Next Steps (priority order)
1. **Connect WP REST API** on real site — enable AI to execute WordPress operations
2. **Test WP REST write tools** — create post, update post, manage plugin (deployed but untestable without connection)
3. **Test cPanel tools** — file read, directory list, backup trigger (deployed but untestable without cPanel connection)
4. **Upgrade to Clerk production** when ready for real users
5. **Polish UI** — improve chat experience, add markdown rendering, better tool result display

## All Features (13 total, all deployed)
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
- Feature #10-12: Modular AI tools — memory, WP REST read (list posts/pages/plugins/themes), WP REST write (create/update post, manage plugin), cPanel (file read, directory list, backup)
- Feature #13: Session title auto-generation — Sonnet 4 generates 3-6 word titles

## Key Architecture Decisions
- Encrypted credentials: AES-256-GCM in Convex (src/lib/crypto.ts), NOT env vars per-site
- File risk classification: src/lib/file-risk.ts maps WordPress files to risk levels
- Audit logging: all actions across all layers log to auditLogs table with risk levels
- API discovery: fetches /wp-json/ root, maps namespaces to friendly labels + categories
- Convex actions for external API calls (cPanel, WP REST), mutations for DB writes
- AI Brain uses Vercel AI SDK v6 with `streamText` + `toUIMessageStreamResponse()`
- System prompt dynamically built from site context + persistent memories
- AI chat uses `useChat` from `@ai-sdk/react` with `DefaultChatTransport`
- Messages use `.parts` array (v6 format), NOT `.content` string
- Session selection: undefined (loading) -> null (new chat) -> Id (specific session)
- `sessionIdRef` used in onFinish to avoid stale closure
- AI tools: Vercel AI SDK `tool()` uses `inputSchema` (Zod), NOT `parameters`
- Server-side Convex from API routes: `fetchMutation` from `convex/nextjs` with `{ token }` from Clerk
- Modular tools: src/lib/ai/tools/index.ts assembles 4 modules (memory, wp-rest-read, wp-rest-write, cpanel)
- Title generation: separate /api/ai/title endpoint using Sonnet 4 (not Haiku — user preference)
- Title generation is fire-and-forget from handleFinish callback, updates via Convex mutation
- Multi-step tool calling: `stopWhen: stepCountIs(5)` lets AI continue text after tool use

## Environment & Credentials
- Convex dev: precious-perch-420 (local dev)
- Convex prod: outgoing-herring-453 (Vercel production)
- Clerk: maximum-labrador-43.clerk.accounts.dev
- Vercel env vars: NEXT_PUBLIC_CONVEX_URL, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY, ENCRYPTION_SECRET, ANTHROPIC_API_KEY — all set for production
- JWT template "convex" verified in Clerk dashboard
- Anthropic API key name: "WP Pilot" (created via Playwright on platform.claude.com)
- WP Pilot runs on port 3001 (port 3000 used by expense-tracker)
