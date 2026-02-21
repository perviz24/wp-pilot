/**
 * AI tools for the 3-layer knowledge system:
 * - save_global: write to global knowledge (universal truths)
 * - save_pattern: write to pattern library (cross-site learnings)
 * - read_knowledge: read from all 3 layers merged
 */

import { tool } from "ai";
import { z } from "zod";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { ToolContext } from "./types";

const knowledgeCategories = [
  "security",
  "seo",
  "speed",
  "design",
  "conversion",
  "accessibility",
  "woocommerce",
  "learndash",
  "elementor",
  "wordpress-core",
  "hosting",
  "content",
] as const;

type KnowledgeCategory = (typeof knowledgeCategories)[number];

export function createKnowledgeTools(ctx: ToolContext) {
  return {
    save_global_knowledge: tool({
      description: `Save a universal WordPress best practice or rule that applies to ALL sites.
Use this when you learn something from official documentation or discover a rule that is universally true.
Categories: security, seo, speed, design, conversion, accessibility, woocommerce, learndash, elementor, wordpress-core, hosting, content.
Only save high-confidence, universally applicable knowledge here — NOT site-specific findings.`,
      inputSchema: z.object({
        category: z
          .enum(knowledgeCategories)
          .describe("Knowledge category"),
        key: z
          .string()
          .describe("Short unique identifier (e.g. 'draft-first-rule', 'health-check-after-write')"),
        content: z
          .string()
          .describe("The knowledge content — what should be remembered"),
        source: z
          .enum(["best-practice", "documentation", "learned"])
          .describe("Where this knowledge comes from"),
        confidence: z
          .number()
          .min(0)
          .max(1)
          .describe("Confidence level. 0.95 for documented facts, 0.8 for best practices, 0.6 for observations"),
        appliesWhen: z
          .string()
          .optional()
          .describe("Optional condition, e.g. 'plugin:woocommerce' — only inject when site has this plugin"),
      }),
      execute: async ({ category, key, content, source, confidence, appliesWhen }) => {
        if (!ctx.convexToken) {
          return "Could not save knowledge — missing authentication.";
        }

        try {
          await fetchMutation(
            api.aiGlobalKnowledge.upsert,
            { category, key, content, source, confidence, appliesWhen },
            { token: ctx.convexToken },
          );
          return `Global knowledge saved: [${category}] ${key} (confidence: ${confidence})`;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          return `Failed to save global knowledge: ${message}`;
        }
      },
    }),

    save_pattern: tool({
      description: `Save a learned pattern from working on a WordPress site.
Patterns track what you discovered (problem + solution) and which sites you tested it on.
When a pattern is tested on 3+ sites with 80%+ success, it auto-promotes to global knowledge.
Use this after discovering a workaround, fix, or technique that might help other sites.`,
      inputSchema: z.object({
        category: z
          .enum(knowledgeCategories)
          .describe("Pattern category"),
        key: z
          .string()
          .describe("Short unique identifier (e.g. 'imunify360-cpanel-workaround')"),
        problem: z
          .string()
          .describe("What problem this pattern solves"),
        solution: z
          .string()
          .describe("How to solve it — step by step if needed"),
        success: z
          .boolean()
          .describe("Did this pattern work on the current site?"),
        notes: z
          .string()
          .optional()
          .describe("Additional context about this test"),
        appliesWhen: z
          .array(z.string())
          .optional()
          .describe("Tags for when this applies, e.g. ['woocommerce', 'shared-hosting']"),
      }),
      execute: async ({ category, key, problem, solution, success, notes, appliesWhen }) => {
        if (!ctx.siteId || !ctx.convexToken) {
          return "Could not save pattern — missing site context or authentication.";
        }

        try {
          // Look up site name for the testedOn entry
          const site = await fetchQuery(
            api.sites.getById,
            { siteId: ctx.siteId as Id<"sites"> },
            { token: ctx.convexToken },
          );
          const siteName = site?.name ?? "Unknown site";

          await fetchMutation(
            api.aiPatternLibrary.upsert,
            {
              category,
              key,
              problem,
              solution,
              source: "ai-discovery" as const,
              siteId: ctx.siteId as string,
              siteName,
              success,
              notes,
              appliesWhen,
            },
            { token: ctx.convexToken },
          );

          return `Pattern saved: [${category}] ${key} — ${success ? "succeeded" : "failed"} on ${siteName}`;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          return `Failed to save pattern: ${message}`;
        }
      },
    }),

    read_knowledge: tool({
      description: `Read knowledge from all 3 layers (global → patterns → site memory) merged by relevance.
Use this to look up best practices, patterns, or site-specific memories before taking action.
Returns entries sorted by confidence, tagged with their layer of origin.`,
      inputSchema: z.object({
        category: z
          .enum([...knowledgeCategories, "site_dna", "action_result", "user_preference", "warning"] as const)
          .optional()
          .describe("Filter by category. Omit to get all."),
        query: z
          .string()
          .optional()
          .describe("Keyword to search for in content/key"),
      }),
      execute: async ({ category, query: searchQuery }) => {
        if (!ctx.convexToken) {
          return "Could not read knowledge — missing authentication.";
        }

        try {
          type KnowledgeEntry = {
            layer: string;
            category: string;
            key: string;
            content: string;
            confidence: number;
          };

          const results: KnowledgeEntry[] = [];

          // Layer 1: Global Knowledge
          const globalEntries = await fetchQuery(
            api.aiGlobalKnowledge.listAll,
            {},
            { token: ctx.convexToken },
          );
          for (const entry of globalEntries) {
            results.push({
              layer: "global",
              category: entry.category,
              key: entry.key,
              content: entry.content,
              confidence: entry.confidence,
            });
          }

          // Layer 2: Pattern Library
          const patterns = await fetchQuery(
            api.aiPatternLibrary.listAll,
            {},
            { token: ctx.convexToken },
          );
          for (const p of patterns) {
            results.push({
              layer: "pattern",
              category: p.category,
              key: p.key,
              content: `PROBLEM: ${p.problem}\nSOLUTION: ${p.solution}\nTested on ${p.testedOn.length} site(s), ${Math.round(p.successRate * 100)}% success`,
              confidence: p.confidence,
            });
          }

          // Layer 3: Site Memory (only if we have a siteId)
          if (ctx.siteId) {
            const siteMemories = await fetchQuery(
              api.aiSiteMemory.listBySite,
              { siteId: ctx.siteId as Id<"sites"> },
              { token: ctx.convexToken },
            );
            for (const mem of siteMemories) {
              results.push({
                layer: "site",
                category: mem.category,
                key: mem.key,
                content: mem.content,
                confidence: mem.confidence,
              });
            }
          }

          // Filter by category if specified
          let filtered = results;
          if (category) {
            filtered = results.filter((r) => r.category === category);
          }

          // Filter by search query if specified
          if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(
              (r) =>
                r.key.toLowerCase().includes(q) ||
                r.content.toLowerCase().includes(q),
            );
          }

          // Sort by confidence descending
          filtered.sort((a, b) => b.confidence - a.confidence);

          if (filtered.length === 0) {
            return "No knowledge found matching your criteria.";
          }

          // Format output
          const formatted = filtered
            .slice(0, 30) // Cap at 30 entries to avoid huge responses
            .map(
              (r) =>
                `[${r.layer.toUpperCase()}] [${r.category}] ${r.key} (${r.confidence.toFixed(2)})\n${r.content}`,
            )
            .join("\n\n---\n\n");

          return `Found ${filtered.length} knowledge entries:\n\n${formatted}`;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          return `Failed to read knowledge: ${message}`;
        }
      },
    }),
  };
}
