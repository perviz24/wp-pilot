# WP Pilot — Progress

## Session 1 (2026-02-20)

### Completed
- Project scaffolded: Next.js 16 + TypeScript + Tailwind 4 + shadcn/ui
- Convex configured (precious-perch-420) with schema: sites, auditLogs, backups
- Clerk auth (middleware + sign-in/sign-up + JWT template "convex")
- Core utilities: env.ts, crypto.ts (AES-256-GCM), risk.ts
- Error boundaries: error.tsx, not-found.tsx, loading.tsx
- Landing page with 5-layer visual
- Brainstorm artifacts: BRAINSTORM.md, DECISIONS.md

### Features Built
| # | Feature | Status | Commit |
|---|---------|--------|--------|
| 1 | Clerk auth + ConvexProviderWithClerk + dashboard layout | Working | 5b7edb6 |
| 2 | Add site wizard (cPanel, WP REST, WP Admin) | Working | 27a0c35 |
| 3 | Dashboard health cards + site detail page | Working | pending |

### Architecture Notes
- ConvexProviderWithClerk pattern for authenticated queries
- CredentialSection reusable component (flat Record<string, string> state)
- Site detail at /dashboard/site/[siteId] with getById + deleteSite mutations

### Known Issues
- Cannot test authenticated flows via Playwright (password entry prohibited by security rules)
- Clerk dev mode CSP warnings in console (expected, non-blocking)

### Remaining
- Feature 4: Create backup via cPanel
- Feature 5: Backup history list
- Feature 6: File browser (read-only with risk colors)
- Feature 7: Audit log viewer
- Feature 8: Plugin API discovery
