import { anthropic } from "@ai-sdk/anthropic";
import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  type UIMessage,
} from "ai";
import { auth } from "@clerk/nextjs/server";
import { getAnthropicApiKey } from "@/lib/env";
import { getConvexToken } from "@/lib/convex-auth";
import { buildAiTools } from "@/lib/ai/tools";
import type { Id } from "../../../../../convex/_generated/dataModel";

// Doctor mode audits can trigger 5+ sequential tool calls with external API latency
export const maxDuration = 120;

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Validate API key exists
  getAnthropicApiKey();

  // Get Convex auth token for server-side operations
  const convexToken = await getConvexToken();

  const { messages, system, siteId } = (await req.json()) as {
    messages: UIMessage[];
    system?: string;
    siteId?: string;
  };

  // Build all AI tools with shared context
  const tools = buildAiTools({
    siteId: (siteId as Id<"sites">) ?? null,
    convexToken,
  });

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: system || "You are WP Pilot AI, a helpful WordPress site manager.",
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(5), // Allow more steps for multi-tool workflows
    tools,
  });

  return result.toUIMessageStreamResponse();
}
