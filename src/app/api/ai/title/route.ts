/**
 * AI title generation endpoint.
 * Generates a short, descriptive session title from the first exchange.
 */

import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { auth } from "@clerk/nextjs/server";
import { getAnthropicApiKey } from "@/lib/env";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  getAnthropicApiKey();

  const { userMessage, assistantMessage } = (await req.json()) as {
    userMessage: string;
    assistantMessage: string;
  };

  if (!userMessage) {
    return Response.json({ title: "New Chat" });
  }

  try {
    const { text } = await generateText({
      model: anthropic("claude-3-5-haiku-20241022"),
      maxOutputTokens: 30,
      system: `Generate a concise 3-6 word title for this conversation.
Rules:
- No quotes, no punctuation at the end
- Capitalize first letter of each major word
- Focus on the user's intent, not the AI response
- Examples: "Install WooCommerce Plugin", "Fix Homepage Layout", "Add Contact Form Page"`,
      prompt: `User: ${userMessage.slice(0, 200)}${assistantMessage ? `\nAssistant: ${assistantMessage.slice(0, 200)}` : ""}`,
    });

    const title = text.trim().replace(/["'.]+$/g, "") || "New Chat";

    return Response.json({ title });
  } catch {
    // Fallback: use truncated user message
    const fallback =
      userMessage.length > 40
        ? userMessage.slice(0, 40) + "..."
        : userMessage;
    return Response.json({ title: fallback });
  }
}
