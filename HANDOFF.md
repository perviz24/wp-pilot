# HANDOFF — WP Pilot
Generated: 2026-02-21 (Session 5 — AI Memory Tool)

## What Was Built This Session
- AI Brain Feature #9: Memory upsert from AI — working, tested on production
  - AI can save site learnings (theme, plugins, preferences, warnings) to Convex during conversations
  - Memories persist across sessions — verified in new chat: AI recalled Flavor theme + WooCommerce
  - Uses Vercel AI SDK v5 `tool()` with `inputSchema` (Zod) + server-side `fetchMutation`
- Self-audit of Session 4: scored 8/12, logged violations to Memory MCP

## Current State
- Live URL: https://wp-pilot-one.vercel.app
- Last commit: eb98179 chore: add AI memory tool for persistent site learnings
- Git: all committed and pushed, branch up to date
- Known issues: none — all features tested on production with 0 console errors
- AI Brain: Builder and Doctor modes work correctly
- Memory system: AI proactively saves site facts during conversation, recalled in new sessions
- Session sidebar: opens from History button, shows session list, New Chat, Archive

## Next Steps (priority order)
1. **Connect API layers** — wire cPanel/WP REST/WP Admin credentials to AI actions
2. **AI action execution** — let AI trigger real WordPress operations (create pages, install plugins, etc.)
3. **Session title auto-generation** — use AI to generate session titles from first message
4. **Upgrade to Clerk production** when ready for real users

## All Features (all working)
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
- AI Brain #9: Memory upsert tool — AI saves site learnings via save_memory tool during conversations

## Key Architecture Decisions
- Encrypted credentials: AES-256-GCM in Convex (src/lib/crypto.ts), NOT env vars per-site
- File risk classification: src/lib/file-risk.ts maps WordPress files to risk levels
- Audit logging: all actions across all layers log to auditLogs table with risk levels
- API discovery: fetches /wp-json/ root, maps namespaces to friendly labels + categories
- Convex actions for external API calls (cPanel, WP REST), mutations for DB writes
- AI Brain uses Vercel AI SDK v5 with `streamText` + `toUIMessageStreamResponse()`
- System prompt dynamically built from site context + persistent memories
- AI chat uses `useChat` from `@ai-sdk/react` with `DefaultChatTransport`
- Messages use `.parts` array (v5 format), NOT `.content` string
- Session selection uses 3-state: undefined (loading) → null (new chat) → Id (specific session)
- Mode switch uses separate useEffect: reset to undefined on mode change, resolve on latestSession change
- useEffect depends on `latestSession` object (not `latestSession?._id`) to detect null resolution
- `sessionIdRef` used in onFinish to avoid stale closure capturing initial null sessionId
- AI tools: Vercel AI SDK v5 `tool()` uses `inputSchema` (Zod), NOT `parameters`
- Server-side Convex from API routes: `fetchMutation` from `convex/nextjs` with `{ token }` from Clerk
- Clerk JWT for server-side: `auth().getToken({ template: "convex" })` via `src/lib/convex-auth.ts`
- Multi-step tool calling: `stopWhen: stepCountIs(3)` lets AI continue text after tool use

## Environment & Credentials
- Convex dev: precious-perch-420 (local dev)
- Convex prod: outgoing-herring-453 (Vercel production)
- Clerk: maximum-labrador-43.clerk.accounts.dev
- Vercel env vars: NEXT_PUBLIC_CONVEX_URL, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY, ENCRYPTION_SECRET, ANTHROPIC_API_KEY — all set for production
- JWT template "convex" verified in Clerk dashboard
- Anthropic API key name: "WP Pilot" (created via Playwright on platform.claude.com)
- WP Pilot runs on port 3001 (port 3000 used by expense-tracker)
