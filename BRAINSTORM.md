# WP Pilot — Expert Brainstorm Analysis
Generated: 2026-02-20

## Competitive Analysis

### Direct Competitors
| Product | Strengths | Weaknesses | WP Pilot Advantage |
|---------|-----------|------------|-------------------|
| **ManageWP** (GoDaddy) | Mature, 100k+ sites, backup/update/perf | No design control, no cPanel, vendor lock-in | Full-stack control (cPanel → Elementor) |
| **MainWP** (Open Source) | Self-hosted, extensible, free core | Complex setup, no design automation, PHP-only | Modern web UI, Angie integration |
| **InfiniteWP** | Unlimited sites, one-time fee | Dated UI, no cPanel API, manual updates | AI-assisted design via Angie |
| **Jetstash** | Clean UI, single-site focus | Limited server control | Multi-layer architecture |

### Key Insight
**No competitor offers design-layer control.** Every tool stops at content/plugin management. WP Pilot's Angie + Playwright integration for safe Elementor editing is genuinely novel.

### What Competitors Do Right (steal these)
- ManageWP: One-click backup + restore with off-site storage
- MainWP: Extension marketplace, child sites dashboard
- All: Color-coded site health indicators, bulk actions

### What Competitors Get Wrong (avoid these)
- Bloated dashboards with 50+ metrics on homepage
- No risk classification — treat all operations as equal
- No audit trail — can't trace who changed what

## Domain Research

### Credential Security
- **AES-256-GCM** is industry standard for at-rest encryption
- Per-credential random IV prevents identical plaintext → identical ciphertext
- Server-side decryption (not client) prevents key exposure in browser DevTools
- ENCRYPTION_SECRET must be 32 bytes, stored in env var, NEVER in database

### Audit Logging Best Practices
- Log: who, what, when, which site, which layer, risk level, success/failure
- Immutable logs (append-only, no edits/deletes)
- Retention: 90 days minimum for compliance
- Include "before" snapshots for destructive operations

### WordPress File Browser UX Patterns
- Tree view with expand/collapse (not flat list)
- Color-code by risk: green (safe to view), amber (editable with caution), red (blocked)
- Show file size, last modified, permissions
- Preview for text files, no preview for binary

### Risk Classification Research
- cPanel community uses 3-tier: read/modify/delete
- WordPress plugin review uses: safe/medium/high/critical
- Our 5-tier is more granular than industry standard — good differentiator

## 3. Architecture Debate (3 Approaches)

### Approach A: Dashboard-First (Next.js proxies all API calls)
- **Pros**: Full control, consistent auth, audit everything
- **Cons**: All traffic through our server, latency for heavy ops
- **Verdict**: Best for MVP — simple, auditable, secure

### Approach B: CLI-First (Playwright automates wp-admin directly)
- **Pros**: Uses existing WordPress UI, familiar to users
- **Cons**: Fragile selectors, slow, can't scale
- **Verdict**: Only for Angie/Elementor layer (where it's necessary)

### Approach C: Plugin-First (Custom WP plugin talks to our API)
- **Pros**: Deep WordPress integration, real-time hooks
- **Cons**: Requires plugin installation, maintenance burden, security surface
- **Verdict**: Phase 2+ consideration, not MVP

### **Decision: Hybrid A+B** — Dashboard proxies REST/cPanel, Playwright only for Angie

## 4. Stakeholder Analysis

### Primary User: WordPress Freelancer/Agency
- Manages 3-20 client sites
- Needs: quick health checks, safe backups, content updates
- Pain point: switching between cPanel, wp-admin, Elementor for each site

### Secondary User: Site Owner (non-technical)
- Has one WordPress site
- Needs: "is my site healthy?" dashboard, backup button
- Pain point: doesn't know what cPanel is, scared of breaking things

### MVP Focus: Primary user (freelancer managing multiple sites)

## 5. Risk Map

| Risk | Impact | Mitigation |
|------|--------|------------|
| Credential theft | CRITICAL | AES-256-GCM encryption, never log decrypted values |
| Elementor corruption via REST | CRITICAL | Hard-block POST/PUT to Elementor pages via REST |
| Accidental wp-config.php edit | CRITICAL | Blocked files list, no write access to core files |
| cPanel backup fills disk | HIGH | Check disk space before backup, warn at 80% |
| Stale credentials | MEDIUM | Connection test on add, periodic health checks |
| Rate limiting by hosting | MEDIUM | Request throttling, exponential backoff |
| Session hijack | MEDIUM | Clerk auth, HTTPS-only, httpOnly cookies |

## 6. MVP Scope (Session 1)

### In Scope (7 features)
1. Clerk authentication (sign in/up)
2. Add site wizard (3 credential types + connection test)
3. Site dashboard with health cards
4. Create full backup via cPanel
5. Backup history list
6. File browser (read-only with risk colors)
7. Audit log viewer

### Out of Scope (Phase 2+)
- Content editing (posts/pages)
- Angie/Elementor design changes
- Bulk site operations
- Plugin/theme updates
- Scheduled backups
- WPCode injection
- Site cloning/migration

### Why This Scope
Backup + file browser + audit log = the minimum needed to prove the multi-layer architecture works safely. Design control (Angie) requires more research and a Playwright automation framework.
