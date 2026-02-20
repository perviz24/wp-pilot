# WP Pilot — Design Tokens
Generated: 2026-02-20

## Design Direction
**Linear meets Vercel** — Clean, minimal, monospace accents for technical data, generous whitespace

## Color System (shadcn/ui Zinc base)

### Risk Level Colors
```
--risk-safe:      hsl(142 71% 45%)    /* Green — read operations */
--risk-medium:    hsl(38 92% 50%)     /* Amber — content updates */
--risk-high:      hsl(25 95% 53%)     /* Orange — backups, file edits */
--risk-blocked:   hsl(0 84% 60%)      /* Red — wp-config, .htaccess */
--risk-critical:  hsl(0 84% 40%)      /* Dark red — deletions */
```

### Status Colors
```
--status-online:   hsl(142 71% 45%)   /* Green dot */
--status-warning:  hsl(38 92% 50%)    /* Amber dot */
--status-offline:  hsl(0 84% 60%)     /* Red dot */
--status-unknown:  hsl(240 5% 64%)    /* Gray dot */
```

### Layer Colors (for badges/pills)
```
--layer-cpanel:    hsl(220 70% 55%)   /* Blue — server layer */
--layer-wp-rest:   hsl(262 80% 60%)   /* Purple — content layer */
--layer-wpcode:    hsl(170 70% 45%)   /* Teal — code layer */
--layer-angie:     hsl(330 70% 55%)   /* Pink — design layer */
--layer-playwright: hsl(45 90% 50%)   /* Gold — visual layer */
```

## Typography
```
--font-sans:  "Geist Sans", system-ui, sans-serif
--font-mono:  "Geist Mono", "JetBrains Mono", monospace

/* Headings: Geist Sans, tracking-tight */
/* Body: Geist Sans, normal tracking */
/* Code/paths/URLs: Geist Mono */
/* File sizes, timestamps: Geist Mono, text-xs, text-muted-foreground */
```

## Spacing
```
/* Page padding: px-4 sm:px-6 lg:px-8 */
/* Card padding: p-4 sm:p-6 */
/* Section gaps: space-y-6 */
/* Grid gaps: gap-4 sm:gap-6 */
/* Compact lists: space-y-2 */
```

## Component Patterns

### Site Card
- Card with status dot (top-right)
- Site name (font-semibold) + URL (text-muted-foreground, font-mono, text-sm)
- Layer badges showing which connections are active
- Last backup timestamp
- Quick action buttons (backup, browse files, view logs)

### Risk Badge
- Rounded pill with risk color background at 10% opacity
- Risk color text
- Icon prefix: Shield for SAFE, AlertTriangle for MEDIUM/HIGH, Ban for BLOCKED, Skull for CRITICAL

### Audit Log Entry
- Timestamp (font-mono, text-xs)
- Action description
- Layer badge (colored pill)
- Risk level badge
- Success/failure icon (CheckCircle green / XCircle red)

### File Browser Row
- Folder/file icon (FolderClosed / FileText)
- Name (font-mono for files)
- Size (text-muted-foreground, font-mono)
- Risk color left border (4px)
- Blocked files: grayed out with lock icon, no click action

## Responsive Strategy
- **Mobile (< 640px)**: Single column, stacked cards, bottom nav
- **Tablet (640-1024px)**: 2-column grid, sidebar collapses
- **Desktop (> 1024px)**: Sidebar nav + main content area, 3-column dashboard grid

## Dark Mode
- shadcn/ui default dark mode (class-based toggle)
- Risk colors maintain readability in dark mode (slightly lighter variants)
- File browser: dark background with risk-colored left borders remain visible
