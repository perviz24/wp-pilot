# HANDOFF — WP Pilot
Generated: 2026-02-21 (Session 3 — AI Brain)

## What Was Built This Session
- Landing page auth fix: "Go to Dashboard" button when signed in — working
- JWT template verification via Playwright — verified
- UI healing on all pages — passed 8/10+
- Post-deploy auth flows tested — working
- GitHub → Vercel auto-deploy connected — working
- AI Brain Feature #1: Schema tables (aiSessions, aiMessages, aiSiteMemory) — working
- AI Brain Feature #2: Convex functions (CRUD for sessions/messages/memory) — working
- AI Brain Feature #3: Dynamic system prompt builder (site context + memories) — working
- AI Brain Feature #4: API route /api/ai/chat with Vercel AI SDK v5 streaming — working
- AI Brain Feature #5: Chat UI components (ChatMessage, ChatInput) — working
- AI Brain Feature #6: AI Brain page with Builder/Doctor mode tabs — working
- ANTHROPIC_API_KEY created and deployed — working

## Current State
- Live URL: https://wp-pilot-one.vercel.app
- Last commit: 86d2e06 feat: add AI Brain page with Builder/Doctor mode tabs
- Git: all committed and pushed, branch up to date
- Known issues: none — AI chat tested end-to-end on production with 0 console errors
- AI Brain: both Builder and Doctor modes stream responses correctly
- AI is context-aware (knows site name, URL, 0/3 layers connected)

## Next Steps (priority order)
1. **Message persistence** — save chat messages to Convex (aiMessages table) so conversations persist across sessions
2. **Session management** — create/resume AI sessions (aiSessions table) with session list UI
3. **Memory upsert from AI** — let AI save learnings to aiSiteMemory during conversations
4. **Connect API layers** — actually wire cPanel/WP REST/WP Admin credentials to AI actions
5. **AI action execution** — let AI trigger real WordPress operations (create pages, install plugins, etc.)
6. **Upgrade to Clerk production** when ready for real users

## Previous Session Features (all working)
- Feature 1: Clerk auth + Convex integration + dashboard layout
- Feature 2: Site wizard with 3 credential types (cPanel, WP REST, WP Admin)
- Feature 3: cPanel backup trigger via UAPI
- Feature 4: Backup history list on site detail page
- Feature 5: Site health dashboard cards with layer counts
- Feature 6: Read-only file browser with risk colors (critical/caution/safe)
- Feature 7: Audit log viewer with layer icons and risk badges
- Feature 8: REST API namespace discovery via /wp-json/

## Key Architecture Decisions
- Encrypted credentials: AES-256-GCM in Convex (src/lib/crypto.ts), NOT env vars per-site
- File risk classification: src/lib/file-risk.ts maps WordPress files to risk levels
- Audit logging: all actions across all layers log to auditLogs table with risk levels
- API discovery: fetches /wp-json/ root, maps namespaces to friendly labels + categories
- Convex actions for external API calls (cPanel, WP REST), mutations for DB writes
- AI Brain uses Vercel AI SDK v5 with `streamText` + `toUIMessageStreamResponse()`
- System prompt is dynamically built from site context + persistent memories
- AI chat uses `useChat` from `@ai-sdk/react` with `DefaultChatTransport`
- Messages use `.parts` array (v5 format), NOT `.content` string

## Environment & Credentials
- Convex dev: precious-perch-420 (local dev)
- Convex prod: outgoing-herring-453 (Vercel production)
- Clerk: maximum-labrador-43.clerk.accounts.dev
- Vercel env vars: NEXT_PUBLIC_CONVEX_URL, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY, ENCRYPTION_SECRET, ANTHROPIC_API_KEY — all set for production
- JWT template "convex" verified in Clerk dashboard
- Anthropic API key name: "WP Pilot" (created via Playwright on platform.claude.com)
