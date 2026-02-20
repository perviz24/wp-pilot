# WP Pilot — Architecture
Generated: 2026-02-20

## System Overview

```
┌─────────────────────────────────────────────────┐
│                   WP Pilot UI                    │
│         (Next.js + shadcn/ui + Clerk)           │
└─────────┬──────────────┬──────────────┬─────────┘
          │              │              │
    ┌─────▼─────┐  ┌─────▼─────┐  ┌───▼────┐
    │ API Routes │  │  Convex   │  │ Clerk  │
    │  (proxy)   │  │ (storage) │  │ (auth) │
    └─────┬─────┘  └───────────┘  └────────┘
          │
    ┌─────▼──────────────────────────────┐
    │         External APIs               │
    │  ┌─────────┐  ┌──────────────────┐ │
    │  │ cPanel  │  │ WordPress REST   │ │
    │  │  UAPI   │  │      API         │ │
    │  └─────────┘  └──────────────────┘ │
    └────────────────────────────────────┘
```

## Data Model (Convex Schema)

### sites
```typescript
{
  userId: v.string(),          // Clerk user ID (owner)
  name: v.string(),            // Display name
  url: v.string(),             // Site URL (https://example.com)

  // cPanel credentials (encrypted)
  cpanelHost: v.optional(v.string()),
  cpanelPort: v.optional(v.number()),   // Usually 2083
  cpanelUsername: v.optional(v.string()),
  cpanelToken: v.optional(v.string()),  // AES-256-GCM encrypted
  cpanelTokenIv: v.optional(v.string()),

  // WordPress REST API credentials (encrypted)
  wpRestUrl: v.optional(v.string()),    // Usually url + /wp-json
  wpUsername: v.optional(v.string()),
  wpAppPassword: v.optional(v.string()), // AES-256-GCM encrypted
  wpAppPasswordIv: v.optional(v.string()),

  // WordPress Admin credentials (encrypted, for Playwright/Angie)
  wpAdminUser: v.optional(v.string()),
  wpAdminPassword: v.optional(v.string()), // AES-256-GCM encrypted
  wpAdminPasswordIv: v.optional(v.string()),

  // Connection status
  cpanelConnected: v.boolean(),
  wpRestConnected: v.boolean(),
  wpAdminConnected: v.boolean(),

  lastCheckedAt: v.optional(v.number()),
  lastBackupAt: v.optional(v.number()),
  createdAt: v.number(),
}
```

### auditLogs
```typescript
{
  siteId: v.id("sites"),
  userId: v.string(),
  action: v.string(),           // "backup.create", "files.list", "settings.read"
  layer: v.union(
    v.literal("cpanel"),
    v.literal("wp-rest"),
    v.literal("wpcode"),
    v.literal("angie"),
    v.literal("playwright")
  ),
  riskLevel: v.union(
    v.literal("safe"),
    v.literal("medium"),
    v.literal("high"),
    v.literal("blocked"),
    v.literal("critical")
  ),
  details: v.optional(v.string()),  // Human-readable description
  success: v.boolean(),
  errorMessage: v.optional(v.string()),
  timestamp: v.number(),
}
```

### backups
```typescript
{
  siteId: v.id("sites"),
  userId: v.string(),
  status: v.union(
    v.literal("pending"),
    v.literal("in_progress"),
    v.literal("completed"),
    v.literal("failed")
  ),
  type: v.union(v.literal("full"), v.literal("database"), v.literal("files")),
  size: v.optional(v.number()),     // bytes
  filename: v.optional(v.string()),
  triggeredBy: v.union(v.literal("manual"), v.literal("auto-safety")),
  startedAt: v.number(),
  completedAt: v.optional(v.number()),
  errorMessage: v.optional(v.string()),
}
```

## API Route Structure

```
src/app/api/
├── sites/
│   └── [siteId]/
│       ├── cpanel/
│       │   ├── backup/route.ts      POST: create backup
│       │   ├── files/route.ts       GET: list files, GET file content
│       │   └── info/route.ts        GET: disk usage, server info
│       ├── wp/
│       │   ├── posts/route.ts       GET: list posts
│       │   ├── pages/route.ts       GET: list pages
│       │   ├── settings/route.ts    GET: site settings
│       │   └── health/route.ts      GET: site health status
│       └── test/route.ts            POST: test all connections
```

### Proxy Pattern (every route follows this)
```typescript
// 1. Authenticate user (Clerk)
const { userId } = await auth();
if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

// 2. Get site + decrypt credentials
const site = await getSiteWithDecryptedCreds(siteId, userId);

// 3. Validate risk level
const riskLevel = classifyRisk(action);
if (riskLevel === "blocked") return NextResponse.json({ error: "Blocked" }, { status: 403 });

// 4. Execute external API call
const result = await callExternalApi(site, action, params);

// 5. Log to audit trail
await logAction({ siteId, userId, action, layer, riskLevel, success: true });

// 6. Return result (never include raw credentials)
return NextResponse.json(result);
```

## Component Tree

```
src/
├── app/
│   ├── layout.tsx              # Clerk provider, Convex provider, theme
│   ├── page.tsx                # Landing/redirect to dashboard
│   ├── sign-in/[[...sign-in]]/ # Clerk sign-in
│   ├── sign-up/[[...sign-up]]/ # Clerk sign-up
│   ├── dashboard/
│   │   ├── layout.tsx          # Sidebar nav + main area
│   │   ├── page.tsx            # Sites grid
│   │   └── sites/
│   │       ├── new/page.tsx    # Add site wizard
│   │       └── [siteId]/
│   │           ├── page.tsx    # Site overview
│   │           ├── backups/    # Backup list + create
│   │           ├── files/      # File browser
│   │           └── logs/       # Audit log
├── components/
│   ├── ui/                     # shadcn components
│   ├── site-card.tsx           # Dashboard site card
│   ├── risk-badge.tsx          # Risk level indicator
│   ├── layer-badge.tsx         # Layer indicator (cPanel/WP/etc)
│   ├── file-browser.tsx        # Tree view file browser
│   ├── audit-log-entry.tsx     # Single log entry row
│   ├── add-site-wizard.tsx     # Multi-step site creation
│   └── backup-button.tsx       # Create backup with confirmation
├── lib/
│   ├── env.ts                  # Environment variable validation
│   ├── crypto.ts               # AES-256-GCM encrypt/decrypt
│   ├── risk.ts                 # Risk classification logic
│   ├── cpanel.ts               # cPanel UAPI client
│   ├── wordpress.ts            # WordPress REST API client
│   └── blocked-files.ts        # Blocked file patterns
└── convex/
    ├── schema.ts               # Tables defined above
    ├── sites.ts                # CRUD for sites
    ├── auditLogs.ts            # Append-only log functions
    └── backups.ts              # Backup status tracking
```

## Security Architecture

### Authentication Flow
```
User → Clerk (sign in) → JWT → Next.js middleware → API routes → Convex (userId filter)
```

### Credential Encryption
```
plaintext credential
  → AES-256-GCM encrypt(ENCRYPTION_SECRET, random IV)
  → store { ciphertext, iv } in Convex
  → decrypt only in API route handler (server-side)
  → never send decrypted to client
```

### Request Authorization
```
Every API route:
  1. Clerk auth check (userId must exist)
  2. Site ownership check (site.userId === userId)
  3. Risk classification check (blocked = deny)
  4. Rate limiting (per-user, per-site)
  5. Audit logging (every action, success or failure)
```

## Blocked Operations List

### Always Blocked (no override)
- Edit/delete: wp-config.php, .htaccess, wp-includes/*, wp-admin/*
- POST/PUT to Elementor pages via REST API
- Access to wp-content/debug.log
- DROP database commands
- cPanel password changes

### Requires Double Confirmation
- Delete any file via cPanel
- Full database backup (contains user data)
- Bulk content deletion

### Requires Single Confirmation
- Create backup (may fill disk)
- Update site settings
- Edit non-core files in wp-content/
