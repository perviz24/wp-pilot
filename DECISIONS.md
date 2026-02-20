# WP Pilot — Architecture Decisions
Generated: 2026-02-20

## Decision 1: Credential Storage

**Question:** Where and how to store WordPress/cPanel credentials?

| Option | Pros | Cons |
|--------|------|------|
| **A: Server Convex + AES-256-GCM** | Cross-device, auditable, standard encryption | Server holds decryption key |
| B: Client IndexedDB | No server trust needed | Lost on device change, no audit |
| C: Hybrid (PIN-protected) | User-controlled decryption | Complex UX, PIN recovery problem |

**Decision: Option A** — Server-stored with AES-256-GCM encryption
- ENCRYPTION_SECRET env var (32 bytes) for key derivation
- Per-credential random IV stored alongside ciphertext
- Decryption happens server-side only, never in browser
- Credentials never appear in logs, console, or network responses

## Decision 2: API Architecture

**Question:** How should the frontend communicate with WordPress/cPanel?

| Option | Pros | Cons |
|--------|------|------|
| **A: Next.js API route proxies** | Centralized auth, audit logging, rate limiting | All traffic through our server |
| B: Direct browser → WordPress | Lower latency | CORS issues, credentials in browser, no audit |
| C: Convex actions | Serverless, auto-scaling | Cold starts, 10s timeout for large operations |

**Decision: Option A** — Next.js API routes as proxy layer
- Route pattern: `/api/sites/[siteId]/cpanel/[...path]` and `/api/sites/[siteId]/wp/[...path]`
- Each route: authenticate user (Clerk) → decrypt credentials → call external API → log action → return result
- Convex for data storage (sites, logs, backups), NOT for API proxying

## Decision 3: Elementor Safety

**Question:** How to prevent Elementor page corruption?

**Research Finding:** WordPress REST API `POST /wp/v2/pages/{id}` updates `post_content` but Elementor stores layout data in `_elementor_data` postmeta. Updating via REST API creates mismatch → corrupted page.

**Decision:**
- REST API: Elementor pages are **READ-ONLY** in content manager
- Detection: Check `_elementor_edit_mode === "builder"` in postmeta
- Design changes: **Only through Angie + Playwright** (Phase 2)
- UI: Show "Elementor page — edit in Elementor" badge, disable edit button

## Decision 4: Risk Classification System

**Question:** How to classify operations by danger level?

| Level | Color | Action | Confirmation | Examples |
|-------|-------|--------|-------------|----------|
| SAFE | Green | Execute | None | Read files, list posts, view settings |
| MEDIUM | Amber | Execute | Toast warning | Update post content, change settings |
| HIGH | Orange | Confirm | Modal dialog | Create backup, edit non-core files |
| BLOCKED | Red | Deny | N/A | wp-config.php, .htaccess, Elementor via REST |
| CRITICAL | Red+skull | Deny+confirm | Double confirmation | Delete site files, drop database |

**Blocked files list:**
- `wp-config.php`, `.htaccess`, `wp-includes/*`, `wp-admin/*`
- Any file matching `*elementor*` in postmeta via REST API
- `wp-content/debug.log` (contains sensitive info)

## Decision 5: Tech Stack

**Question:** Which stack for WP Pilot?

**Decision:** Following CLAUDE.md default stack:
- **Next.js 16** + TypeScript + Tailwind CSS 4 + shadcn/ui (New York, Zinc)
- **Convex** for database (sites, auditLogs, backups tables)
- **Clerk** for authentication
- **Lucide React** for icons
- **Vercel** for deployment

**Why not Supabase?** No SQL needed. Convex's real-time subscriptions are perfect for live audit log updates and backup status tracking.

## Decision 6: Three Auth Types Per Site

**Question:** How many credential sets does each site need?

| Credential | Used For | Format |
|-----------|----------|--------|
| cPanel API Token | Server-level: backups, files, DNS, databases | `cpanel username:TOKEN` header |
| WP Application Password | Content-level: posts, pages, settings, SEO | Basic auth `user:app_password` |
| WP Admin Login | Design-level: Angie, Elementor, Playwright | Username + password for wp-login.php |

**Decision:** Store all three per site. Each encrypted separately with own IV. Connection test validates each on site creation. Missing credentials = that layer is unavailable (graceful degradation, not error).

## Decision 7: Build Order (Session 1)

1. Clerk auth → 2. Add site wizard → 3. Dashboard → 4. Backup → 5. Backup history → 6. File browser → 7. Audit log

**Rationale:** Auth first (gates everything). Site creation second (no features work without a site). Dashboard third (shows site health). Then backup (most critical safety feature). File browser and audit log last (read-only, lower risk).
