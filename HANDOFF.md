# HANDOFF — WP Pilot
Generated: 2026-02-21

## What Was Built This Session
- Feature 1: Clerk auth + Convex integration + dashboard layout — working
- Feature 2: Site wizard with 3 credential types (cPanel, WP REST, WP Admin) — working
- Feature 3: cPanel backup trigger via UAPI — working
- Feature 4: Backup history list on site detail page — working
- Feature 5: Site health dashboard cards with layer counts — working
- Feature 6: Read-only file browser with risk colors (critical/caution/safe) — working
- Feature 7: Audit log viewer with layer icons and risk badges — working
- Feature 8: REST API namespace discovery via /wp-json/ — working

## Current State
- Live URL: https://wp-pilot-one.vercel.app
- Last commit: 97c337f chore: add .vercel to gitignore
- Dev server: running on port 3002
- Known issues: none — all features verified via Playwright

## Next Steps (priority order)
1. Add WPCode integration (Layer 3) — snippet management via WPCode API
2. Add Angie/Elementor AI integration (Layer 4) — design automation
3. Add Playwright visual testing (Layer 5) — screenshot comparison
4. Add scheduled health checks (Convex cron)
5. Add multi-site dashboard overview with health scores
6. Upgrade to Clerk production when ready for real users

## Key Architecture Decisions
- Encrypted credentials: AES-256-GCM in Convex (src/lib/crypto.ts), NOT env vars per-site
- File risk classification: src/lib/file-risk.ts maps WordPress files to risk levels
- Audit logging: all actions across all layers log to auditLogs table with risk levels
- API discovery: fetches /wp-json/ root, maps namespaces to friendly labels + categories
- Convex actions for external API calls (cPanel, WP REST), mutations for DB writes

## Environment & Credentials
- Convex dev: precious-perch-420 (local dev)
- Convex prod: outgoing-herring-453 (Vercel production)
- Clerk: maximum-labrador-43.clerk.accounts.dev
- Vercel env vars: NEXT_PUBLIC_CONVEX_URL, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY, ENCRYPTION_SECRET — all set for production
- JWT template "convex" verified in Clerk dashboard
