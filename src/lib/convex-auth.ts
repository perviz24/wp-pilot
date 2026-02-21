import { auth } from "@clerk/nextjs/server";

/**
 * Get a Convex-compatible auth token from Clerk.
 * Used for server-side Convex calls (fetchQuery/fetchMutation).
 */
export async function getConvexToken(): Promise<string | undefined> {
  const { getToken } = await auth();
  return (await getToken({ template: "convex" })) ?? undefined;
}
