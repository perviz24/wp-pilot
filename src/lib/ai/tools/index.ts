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
import { createCloneTools } from "./clone-tools";
import { createKnowledgeTools } from "./knowledge-tools";
import { createResearchTools } from "./research-tools";

/**
 * Build the complete tools object for the AI chat.
 * All tools receive the same context (siteId + auth token).
 * Research tools don't need context (WordPress.org APIs are free/public).
 */
export function buildAiTools(ctx: ToolContext) {
  return {
    ...createMemoryTools(ctx),
    ...createKnowledgeTools(ctx),
    ...createResearchTools(),
    ...createWpRestReadTools(ctx),
    ...createWpRestWriteTools(ctx),
    ...createCpanelTools(ctx),
    ...createElementorTools(ctx),
    ...createCloneTools(ctx),
  };
}

export type { ToolContext } from "./types";
