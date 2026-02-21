/**
 * DEBUG ONLY — Test FULL WP REST pipeline from Vercel.
 * Tests: Convex token → site record → credentials → WP REST call.
 * DELETE THIS FILE after debugging is complete.
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getConvexToken } from "@/lib/convex-auth";
import { getSiteRecord, getWpRestCredentials, buildWpAuthHeader } from "@/lib/ai/tools/credential-access";
import { wpFetch } from "@/lib/ai/tools/wp-rest-helpers";
import type { Id } from "../../../../convex/_generated/dataModel";

const SITE_ID = "jd781fzjdhpwfjvp95q2mcg2wx81gnyz";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const results: Record<string, unknown> = { userId };

  // Step 1: Get Convex token
  const convexToken = await getConvexToken();
  results.convexToken = convexToken ? `${convexToken.slice(0, 20)}...` : "UNDEFINED";

  if (!convexToken) {
    return NextResponse.json({ ...results, error: "No Convex token from Clerk" });
  }

  // Step 2: Fetch site record from Convex
  try {
    const site = await getSiteRecord(SITE_ID as Id<"sites">, convexToken);
    results.siteFound = !!site;
    if (!site) {
      return NextResponse.json({ ...results, error: "Site not found in Convex" });
    }
    results.siteName = site.name;
    results.wpRestConnected = site.wpRestConnected;
    results.hasWpRestUrl = !!site.wpRestUrl;
    results.wpRestUrl = site.wpRestUrl;
    results.hasWpUsername = !!site.wpUsername;
    results.wpUsername = site.wpUsername;
    results.hasWpAppPassword = !!site.wpAppPassword;
    results.wpAppPasswordLength = site.wpAppPassword?.length ?? 0;

    // Step 3: Extract credentials
    const creds = getWpRestCredentials(site);
    results.credsExtracted = !!creds;
    if (!creds) {
      return NextResponse.json({ ...results, error: "getWpRestCredentials returned null" });
    }
    results.credsUrl = creds.url;
    results.credsUsername = creds.username;

    // Step 4: Build auth header
    const authHeader = buildWpAuthHeader(creds);
    results.authHeaderPrefix = authHeader.slice(0, 30) + "...";

    // Step 5: Call wpFetch (same as AI tools do)
    const fetchResult = await wpFetch(
      creds.url,
      "/pages?per_page=2&_fields=id,title,status",
      authHeader,
    );
    results.wpFetchOk = fetchResult.ok;
    results.wpFetchStatus = fetchResult.status;
    results.wpFetchData = JSON.stringify(fetchResult.data)?.slice(0, 500);

    return NextResponse.json(results);
  } catch (err) {
    results.error = err instanceof Error ? err.message : String(err);
    results.stack = err instanceof Error ? err.stack?.slice(0, 300) : undefined;
    return NextResponse.json(results);
  }
}
