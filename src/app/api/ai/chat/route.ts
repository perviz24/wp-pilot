import { anthropic } from "@ai-sdk/anthropic";
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { auth } from "@clerk/nextjs/server";
import { getAnthropicApiKey } from "@/lib/env";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Validate API key exists
  getAnthropicApiKey();

  const { messages, system } = (await req.json()) as {
    messages: UIMessage[];
    system?: string;
  };

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: system || "You are WP Pilot AI, a helpful WordPress site manager.",
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
