# WP Pilot — Test Results

## Test Method
Playwright MCP automation on localhost:3001

## Feature Tests

| # | Feature | Test | Result | Notes |
|---|---------|------|--------|-------|
| 1 | Clerk auth | Navigate /dashboard → redirects to Clerk sign-in | PASS | Auth protection working |
| 1 | Clerk auth | Navigate /dashboard/add-site → redirects to sign-in | PASS | Nested routes protected |
| 1 | Clerk auth | Landing page renders without errors | PASS | 0 console errors |
| 2 | Add site wizard | Navigate /dashboard/add-site → redirects (auth) | PASS | Route exists, auth works |
| 2 | Add site wizard | tsc --noEmit | PASS | Zero TypeScript errors |
| 2 | Add site wizard | Page renders after refactor (210 lines) | PASS | Under 300-line limit |
| 3 | Dashboard cards | Navigate /dashboard → redirects (auth) | PASS | Auth protection |
| 3 | Dashboard cards | tsc --noEmit | PASS | Zero TypeScript errors |
| 3 | Dashboard cards | Convex deploy (getById, deleteSite) | PASS | Functions ready |
| 3 | Site detail page | tsc --noEmit | PASS | 284 lines, under limit |

## Console Errors
- Clerk CSP warning: `script-src` not set (Clerk dev mode, expected)
- Clerk dev mode warning (expected, non-blocking)
- Zero app-level errors across all tested pages

## Resolved: AI Brain WP REST API Authentication Failure

### Diagnosis

| # | Hypothesis | Test | Result | Diagnosis |
|---|-----------|------|--------|-----------|
| 1 | System prompt missing layers | Intercepted fetch to /api/ai/chat | System prompt includes all 3 layers | ❌ Not the cause |
| 2 | Credentials not in Convex | Checked prod Convex via system prompt | wpRestConnected=true, fields present | ❌ Not the cause |
| 3 | Double /wp-json/ in URL | Read wpFetch code + stored wpRestUrl | URL was `.../wp-json/wp-json/...` | ✅ FIXED (7b7c89c) |
| 4 | Fix not deployed / cached | Deployed with --force, retested | AI still reports auth error | ⚠️ Insufficient |
| 5 | WP blocking Vercel IPs | Debug route from Vercel → 200 OK | Vercel IPs NOT blocked | ❌ Not the cause |
| 6 | Wrong WP username in Convex | Debug route: wpUsername="WP-pilot" → 401 | User entered app password NAME as username | ✅ ROOT CAUSE |

### Root Cause
User entered "WP-pilot" (the Application Password label) as the WordPress username instead of "academy.geniusmotion.se" (actual WP username). WordPress returned 401 `invalid_username`.

### Fix
1. Code fix: Strip double /wp-json/ in wpFetch URL construction (7b7c89c)
2. Data fix: User updated credentials in WP Pilot Settings page

### Verification
AI Brain → "List all my WordPress pages" → ✅ 200 OK → 16 pages returned with titles, URLs, statuses

## Limitations
- Cannot test authenticated user flows (sign-in password entry prohibited)
- Cannot verify data rendering with real site entries (requires auth)
- Quick actions on site detail page are disabled placeholders (future features)
