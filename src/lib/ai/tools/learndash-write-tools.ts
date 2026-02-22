/**
 * AI tools for writing/modifying LearnDash LMS data via REST API v2 (ldlms/v2).
 * All tools are CAUTION level — require user confirmation before executing.
 * Uses same WP Application Password auth as other WP REST tools.
 */

import { tool } from "ai";
import { z } from "zod";
import type { ToolContext } from "./types";
import { ldFetch, getWpContext } from "./wp-rest-helpers";

const LD_404_MSG =
  "LearnDash REST API not found (404). Is LearnDash installed and activated on this site?";

/** Map content type string to LearnDash API endpoint slug */
function ldEndpoint(type: string): string {
  switch (type) {
    case "course":
      return "/sfwd-courses";
    case "lesson":
      return "/sfwd-lessons";
    case "topic":
      return "/sfwd-topic"; // singular in LD API
    case "quiz":
      return "/sfwd-quiz"; // singular in LD API
    default:
      return `/sfwd-${type}`;
  }
}

export function createLearnDashWriteTools(ctx: ToolContext) {
  return {
    ld_create_course: tool({
      description: `Create a new LearnDash course. CAUTION: Creates content on the site.
The AI should explain what will be created and ask for confirmation first.
Courses are created as drafts by default for safety.`,
      inputSchema: z.object({
        title: z.string().describe("Course title"),
        content: z
          .string()
          .optional()
          .describe("Course description (HTML supported)"),
        status: z
          .enum(["draft", "publish"])
          .default("draft")
          .describe("Course status (default: draft)"),
      }),
      execute: async ({ title, content, status }) => {
        const wp = await getWpContext(ctx);
        if ("error" in wp) return wp.error;

        const body: Record<string, unknown> = { title, status };
        if (content) body.content = content;

        const result = await ldFetch(
          wp.creds.url,
          "/sfwd-courses",
          wp.authHeader,
          { method: "POST", body },
        );

        if (!result.ok) {
          if (result.status === 404) return LD_404_MSG;
          return `LearnDash API error ${result.status}: Could not create course.`;
        }

        const created = result.data as {
          id: number;
          link: string;
          status: string;
        };
        return {
          success: true,
          id: created?.id,
          link: created?.link,
          status: created?.status,
          message: `Course "${title}" created as ${status}.`,
        };
      },
    }),

    ld_create_lesson: tool({
      description: `Create a new lesson inside a LearnDash course. CAUTION: Creates content.
The AI should explain what will be created and ask for confirmation.
Lessons are created as drafts by default.`,
      inputSchema: z.object({
        courseId: z.number().describe("Course ID to add this lesson to"),
        title: z.string().describe("Lesson title"),
        content: z
          .string()
          .optional()
          .describe("Lesson content (HTML supported)"),
        status: z
          .enum(["draft", "publish"])
          .default("draft")
          .describe("Lesson status (default: draft)"),
        order: z
          .number()
          .optional()
          .describe("Position in course curriculum (menu_order)"),
      }),
      execute: async ({ courseId, title, content, status, order }) => {
        const wp = await getWpContext(ctx);
        if ("error" in wp) return wp.error;

        const body: Record<string, unknown> = {
          title,
          status,
          course: courseId,
        };
        if (content) body.content = content;
        if (order !== undefined) body.menu_order = order;

        const result = await ldFetch(
          wp.creds.url,
          "/sfwd-lessons",
          wp.authHeader,
          { method: "POST", body },
        );

        if (!result.ok) {
          if (result.status === 404) return LD_404_MSG;
          return `LearnDash API error ${result.status}: Could not create lesson.`;
        }

        const created = result.data as {
          id: number;
          status: string;
        };
        return {
          success: true,
          id: created?.id,
          courseId,
          status: created?.status,
          message: `Lesson "${title}" created in course #${courseId} as ${status}.`,
        };
      },
    }),

    ld_create_topic: tool({
      description: `Create a new topic inside a LearnDash lesson. Topics are sub-sections under lessons.
CAUTION: Creates content. Defaults to draft.`,
      inputSchema: z.object({
        courseId: z.number().describe("Course ID"),
        lessonId: z.number().describe("Lesson ID to add this topic to"),
        title: z.string().describe("Topic title"),
        content: z
          .string()
          .optional()
          .describe("Topic content (HTML supported)"),
        status: z
          .enum(["draft", "publish"])
          .default("draft")
          .describe("Topic status (default: draft)"),
      }),
      execute: async ({ courseId, lessonId, title, content, status }) => {
        const wp = await getWpContext(ctx);
        if ("error" in wp) return wp.error;

        const body: Record<string, unknown> = {
          title,
          status,
          course: courseId,
          lesson: lessonId,
        };
        if (content) body.content = content;

        // Note: LearnDash uses singular "sfwd-topic"
        const result = await ldFetch(
          wp.creds.url,
          "/sfwd-topic",
          wp.authHeader,
          { method: "POST", body },
        );

        if (!result.ok) {
          if (result.status === 404) return LD_404_MSG;
          return `LearnDash API error ${result.status}: Could not create topic.`;
        }

        const created = result.data as {
          id: number;
          status: string;
        };
        return {
          success: true,
          id: created?.id,
          courseId,
          lessonId,
          status: created?.status,
          message: `Topic "${title}" created in lesson #${lessonId} as ${status}.`,
        };
      },
    }),

    ld_update_content: tool({
      description: `Update an existing LearnDash course, lesson, topic, or quiz.
CAUTION: Modifies existing content. The AI should show what will change and ask for confirmation.`,
      inputSchema: z.object({
        id: z.number().describe("ID of the item to update"),
        type: z
          .enum(["course", "lesson", "topic", "quiz"])
          .describe("Content type"),
        title: z
          .string()
          .optional()
          .describe("New title (leave empty to keep current)"),
        content: z
          .string()
          .optional()
          .describe("New content (leave empty to keep current)"),
        status: z
          .enum(["draft", "publish", "private"])
          .optional()
          .describe("New status (leave empty to keep current)"),
      }),
      execute: async ({ id, type, title, content, status }) => {
        const wp = await getWpContext(ctx);
        if ("error" in wp) return wp.error;

        const body: Record<string, unknown> = {};
        if (title !== undefined) body.title = title;
        if (content !== undefined) body.content = content;
        if (status !== undefined) body.status = status;

        if (Object.keys(body).length === 0) {
          return "Nothing to update — provide at least one field (title, content, or status).";
        }

        const endpoint = `${ldEndpoint(type)}/${id}`;
        const result = await ldFetch(wp.creds.url, endpoint, wp.authHeader, {
          method: "POST", // WP REST uses POST for updates
          body,
        });

        if (!result.ok) {
          if (result.status === 404) return LD_404_MSG;
          return `LearnDash API error ${result.status}: Could not update ${type} #${id}.`;
        }

        const updated = result.data as {
          id: number;
          status: string;
          title?: { rendered: string };
        };
        return {
          success: true,
          id: updated?.id,
          type,
          status: updated?.status,
          message: `${type.charAt(0).toUpperCase() + type.slice(1)} #${id} updated.`,
        };
      },
    }),

    ld_enroll_user: tool({
      description: `Enroll a user in a LearnDash course. CAUTION: Grants the user access to course content.
The AI should confirm the user and course before enrolling.`,
      inputSchema: z.object({
        courseId: z.number().describe("Course ID to enroll the user in"),
        userId: z.number().describe("WordPress user ID to enroll"),
      }),
      execute: async ({ courseId, userId }) => {
        const wp = await getWpContext(ctx);
        if ("error" in wp) return wp.error;

        const result = await ldFetch(
          wp.creds.url,
          `/sfwd-courses/${courseId}/users`,
          wp.authHeader,
          { method: "POST", body: { user_ids: [userId] } },
        );

        if (!result.ok) {
          if (result.status === 404) return LD_404_MSG;
          return `LearnDash API error ${result.status}: Could not enroll user #${userId} in course #${courseId}.`;
        }

        return {
          success: true,
          courseId,
          userId,
          message: `User #${userId} enrolled in course #${courseId}.`,
        };
      },
    }),

    ld_unenroll_user: tool({
      description: `Remove a user from a LearnDash course. CAUTION: Revokes access to course content.
Progress data may be preserved by LearnDash for re-enrollment.
The AI should confirm with the user before removing enrollment.`,
      inputSchema: z.object({
        courseId: z.number().describe("Course ID to remove the user from"),
        userId: z.number().describe("WordPress user ID to unenroll"),
      }),
      execute: async ({ courseId, userId }) => {
        const wp = await getWpContext(ctx);
        if ("error" in wp) return wp.error;

        const result = await ldFetch(
          wp.creds.url,
          `/sfwd-courses/${courseId}/users`,
          wp.authHeader,
          { method: "DELETE", body: { user_ids: [userId] } },
        );

        if (!result.ok) {
          if (result.status === 404) return LD_404_MSG;
          return `LearnDash API error ${result.status}: Could not unenroll user #${userId} from course #${courseId}.`;
        }

        return {
          success: true,
          courseId,
          userId,
          message: `User #${userId} removed from course #${courseId}. Progress data may be preserved for re-enrollment.`,
        };
      },
    }),
  };
}
