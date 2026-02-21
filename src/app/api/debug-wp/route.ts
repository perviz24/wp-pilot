/**
 * DEBUG ONLY — Test WP REST API call from Vercel infrastructure.
 * This helps diagnose if Imunify360 or other WAF blocks Vercel IPs.
 * DELETE THIS FILE after debugging is complete.
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  // Require auth so this isn't publicly accessible
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const wpUrl = "https://academy.geniusmotion.se/wp-json/wp/v2/pages?per_page=2&_fields=id,title,status";
  const username = "academy.geniusmotion.se";
  const appPassword = "MDIp wrDc RsHI UNw5 GKwN p1Vp";
  const encoded = Buffer.from(`${username}:${appPassword}`).toString("base64");

  try {
    const response = await fetch(wpUrl, {
      headers: {
        Authorization: `Basic ${encoded}`,
        "Content-Type": "application/json",
      },
    });

    const text = await response.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = text.slice(0, 500);
    }

    return NextResponse.json({
      debug: true,
      url: wpUrl,
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
      dataPreview: typeof data === "string" ? data : JSON.stringify(data)?.slice(0, 500),
    });
  } catch (err) {
    return NextResponse.json({
      debug: true,
      url: wpUrl,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack?.slice(0, 300) : undefined,
    });
  }
}
