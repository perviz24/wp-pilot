import { anthropic } from "@ai-sdk/anthropic";
import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { fetchMutation } from "convex/nextjs";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { getAnthropicApiKey } from "@/lib/env";
import { getConvexToken } from "@/lib/convex-auth";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Validate API key exists
  getAnthropicApiKey();

  // Get Convex auth token for server-side mutations
  const convexToken = await getConvexToken();

  const { messages, system, siteId } = (await req.json()) as {
    messages: UIMessage[];
    system?: string;
    siteId?: string;
  };

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: system || "You are WP Pilot AI, a helpful WordPress site manager.",
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(3),
    tools: {
      save_memory: tool({
        description: `Save a learning or observation about this WordPress site for future reference.
Use this tool when you discover something important about the site that should be remembered across sessions.
Categories:
- "site_dna": Technical facts (theme, plugins, PHP version, hosting)
- "action_result": What worked or failed when taking actions
- "user_preference": User's style, preferences, recurring requests
- "warning": Things to avoid or be careful about on this site`,
        inputSchema: z.object({
          category: z
            .enum(["site_dna", "action_result", "user_preference", "warning"])
            .describe("Memory category"),
          key: z
            .string()
            .describe(
              "Short identifier for this memory (e.g. 'active_theme', 'plugin:woocommerce', 'preferred_style')",
            ),
          content: z
            .string()
            .describe(
              "The actual memory content — what was learned or observed",
            ),
          confidence: z
            .number()
            .min(0)
            .max(1)
            .describe(
              "How confident you are (0-1). Use 0.9+ for facts, 0.5-0.8 for observations, <0.5 for guesses",
            ),
        }),
        execute: async ({ category, key, content, confidence }) => {
          if (!siteId || !convexToken) {
            return "Could not save memory — missing site context or authentication.";
          }

          try {
            await fetchMutation(
              api.aiSiteMemory.upsert,
              {
                siteId: siteId as Id<"sites">,
                category,
                key,
                content,
                confidence,
                source: "ai_conversation",
              },
              { token: convexToken },
            );

            return `Memory saved: [${category}] ${key} = "${content}" (confidence: ${confidence})`;
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "Unknown error";
            return `Failed to save memory: ${message}`;
          }
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
