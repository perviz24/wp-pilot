/**
 * AI Tools — Central registry.
 * Assembles all tool modules into a single tools object for streamText.
 */

import type { ToolContext } from "./types";
import { createMemoryTools } from "./memory-tools";
import { createWpRestReadTools } from "./wp-rest-read-tools";
import { createWpRestWriteTools } from "./wp-rest-write-tools";
import { createCpanelTools } from "./cpanel-tools";
import { createElementorTools } from "./elementor-tools";
import { createKnowledgeTools } from "./knowledge-tools";

/**
 * Build the complete tools object for the AI chat.
 * All tools receive the same context (siteId + auth token).
 */
export function buildAiTools(ctx: ToolContext) {
  return {
    ...createMemoryTools(ctx),
    ...createKnowledgeTools(ctx),
    ...createWpRestReadTools(ctx),
    ...createWpRestWriteTools(ctx),
    ...createCpanelTools(ctx),
    ...createElementorTools(ctx),
  };
}

export type { ToolContext } from "./types";
