/**
 * AI tools for LearnDash progress, groups, assignments, essays, and quiz stats.
 * All tools are SAFE read-only operations (except grading which is CAUTION).
 * Uses same WP Application Password auth as other WP REST tools.
 */

import { tool } from "ai";
import { z } from "zod";
import type { ToolContext } from "./types";
import { ldFetch, getWpContext } from "./wp-rest-helpers";

const LD_404_MSG =
  "LearnDash REST API not found (404). Is LearnDash installed and activated on this site?";

// --- Response types ---

interface LdCourseProgress {
  course: number;
  progress_status?: string;
  steps_completed?: number;
  steps_total?: number;
  date_started?: string;
  date_completed?: string;
  last_step?: number;
}

interface LdCourseStep {
  id: number;
  type: string;
  title?: string;
  children?: LdCourseStep[];
}

interface LdGroup {
  id: number;
  title: { rendered: string };
  status: string;
}

interface LdGroupUser {
  id: number;
  name: string;
  email?: string;
}

interface LdAssignment {
  id: number;
  title: { rendered: string };
  status: string;
  author: number;
  course?: number;
  lesson?: number;
}

interface LdEssay {
  id: number;
  title: { rendered: string };
  status: string;
  author: number;
  course?: number;
  lesson?: number;
  topic?: number;
  points_max?: number;
  points_awarded?: number;
}

interface LdQuizStat {
  id: number;
  quiz: number;
  user: number;
  date?: string;
  answers_correct?: number;
  answers_incorrect?: number;
}

export function createLearnDashProgressTools(ctx: ToolContext) {
  return {
    // ───────────── PROGRESS ─────────────

    ld_get_user_progress: tool({
      description: `Get a user's course progress across all courses or a specific course.
Returns completion status, steps completed/total, dates. SAFE read-only.`,
      inputSchema: z.object({
        userId: z.number().describe("WordPress user ID"),
        courseId: z
          .number()
          .optional()
          .describe("Specific course ID (omit for all courses)"),
      }),
      execute: async ({ userId, courseId }) => {
        const wp = await getWpContext(ctx);
        if ("error" in wp) return wp.error;

        const endpoint = courseId
          ? `/users/${userId}/course-progress/${courseId}`
          : `/users/${userId}/course-progress`;
        const result = await ldFetch(wp.creds.url, endpoint, wp.authHeader);

        if (!result.ok) {
          if (result.status === 404) return LD_404_MSG;
          return `LearnDash API error ${result.status}: Could not fetch user progress.`;
        }

        const data = result.data;
        if (Array.isArray(data)) {
          const progress = data as LdCourseProgress[];
          if (!progress.length) return `No course progress for user #${userId}.`;
          return progress.map((p) => ({
            courseId: p.course,
            status: p.progress_status ?? "unknown",
            stepsCompleted: p.steps_completed ?? 0,
            stepsTotal: p.steps_total ?? 0,
            percentComplete:
              p.steps_total && p.steps_total > 0
                ? Math.round(((p.steps_completed ?? 0) / p.steps_total) * 100)
                : 0,
            dateStarted: p.date_started,
            dateCompleted: p.date_completed,
          }));
        }
        // Single course progress
        const p = data as LdCourseProgress;
        return {
          courseId: p.course,
          status: p.progress_status ?? "unknown",
          stepsCompleted: p.steps_completed ?? 0,
          stepsTotal: p.steps_total ?? 0,
          percentComplete:
            p.steps_total && p.steps_total > 0
              ? Math.round(((p.steps_completed ?? 0) / p.steps_total) * 100)
              : 0,
          dateStarted: p.date_started,
          dateCompleted: p.date_completed,
        };
      },
    }),

    ld_get_course_steps: tool({
      description: `Get the full hierarchy/structure of a LearnDash course — lessons, topics, quizzes in order.
Use this to understand the course curriculum at a glance. SAFE read-only.`,
      inputSchema: z.object({
        courseId: z.number().describe("Course ID"),
      }),
      execute: async ({ courseId }) => {
        const wp = await getWpContext(ctx);
        if ("error" in wp) return wp.error;

        const result = await ldFetch(
          wp.creds.url,
          `/sfwd-courses/${courseId}/steps`,
          wp.authHeader,
        );

        if (!result.ok) {
          if (result.status === 404) return LD_404_MSG;
          return `LearnDash API error ${result.status}: Could not fetch course steps.`;
        }

        return result.data as LdCourseStep[];
      },
    }),

    // ───────────── GROUPS ─────────────

    ld_list_groups: tool({
      description: `List LearnDash groups. Groups organize students and can have courses assigned.
SAFE read-only operation.`,
      inputSchema: z.object({
        count: z
          .number()
          .min(1)
          .max(100)
          .default(20)
          .describe("Number of groups to fetch (default 20)"),
      }),
      execute: async ({ count }) => {
        const wp = await getWpContext(ctx);
        if ("error" in wp) return wp.error;

        const params = `?per_page=${count}&_fields=id,title,status`;
        const result = await ldFetch(
          wp.creds.url,
          `/groups${params}`,
          wp.authHeader,
        );

        if (!result.ok) {
          if (result.status === 404) return LD_404_MSG;
          return `LearnDash API error ${result.status}: Could not fetch groups.`;
        }

        const groups = result.data as LdGroup[];
        if (!groups?.length) return "No groups found.";
        return groups.map((g) => ({
          id: g.id,
          title: g.title?.rendered ?? "Untitled",
          status: g.status,
        }));
      },
    }),

    ld_get_group_users: tool({
      description: `List users in a LearnDash group. SAFE read-only operation.`,
      inputSchema: z.object({
        groupId: z.number().describe("Group ID"),
        count: z
          .number()
          .min(1)
          .max(100)
          .default(50)
          .describe("Number of users to fetch (default 50)"),
      }),
      execute: async ({ groupId, count }) => {
        const wp = await getWpContext(ctx);
        if ("error" in wp) return wp.error;

        const params = `?per_page=${count}`;
        const result = await ldFetch(
          wp.creds.url,
          `/groups/${groupId}/users${params}`,
          wp.authHeader,
        );

        if (!result.ok) {
          if (result.status === 404) return LD_404_MSG;
          return `LearnDash API error ${result.status}: Could not fetch group users.`;
        }

        const users = result.data as LdGroupUser[];
        if (!users?.length) return `No users in group #${groupId}.`;
        return users.map((u) => ({
          userId: u.id,
          name: u.name ?? "Unknown",
          email: u.email,
        }));
      },
    }),

    // ───────────── ASSIGNMENTS ─────────────

    ld_list_assignments: tool({
      description: `List LearnDash assignment submissions, optionally filtered by course or lesson.
SAFE read-only operation.`,
      inputSchema: z.object({
        courseId: z
          .number()
          .optional()
          .describe("Filter by course ID (optional)"),
        lessonId: z
          .number()
          .optional()
          .describe("Filter by lesson ID (optional)"),
        count: z
          .number()
          .min(1)
          .max(50)
          .default(20)
          .describe("Number of assignments to fetch (default 20)"),
      }),
      execute: async ({ courseId, lessonId, count }) => {
        const wp = await getWpContext(ctx);
        if ("error" in wp) return wp.error;

        let params = `?per_page=${count}&_fields=id,title,status,author,course,lesson`;
        if (courseId) params += `&course=${courseId}`;
        if (lessonId) params += `&lesson=${lessonId}`;

        const result = await ldFetch(
          wp.creds.url,
          `/sfwd-assignment${params}`,
          wp.authHeader,
        );

        if (!result.ok) {
          if (result.status === 404) return LD_404_MSG;
          return `LearnDash API error ${result.status}: Could not fetch assignments.`;
        }

        const items = result.data as LdAssignment[];
        if (!items?.length) return "No assignments found.";
        return items.map((a) => ({
          id: a.id,
          title: a.title?.rendered ?? "Untitled",
          status: a.status,
          authorId: a.author,
          courseId: a.course,
          lessonId: a.lesson,
        }));
      },
    }),

    ld_grade_assignment: tool({
      description: `Approve or grade a LearnDash assignment. CAUTION: Changes assignment status.
The AI should confirm before grading.`,
      inputSchema: z.object({
        assignmentId: z.number().describe("Assignment ID to grade"),
        status: z
          .enum(["graded", "not_graded", "publish", "draft"])
          .describe("New status (graded = approved)"),
      }),
      execute: async ({ assignmentId, status }) => {
        const wp = await getWpContext(ctx);
        if ("error" in wp) return wp.error;

        const result = await ldFetch(
          wp.creds.url,
          `/sfwd-assignment/${assignmentId}`,
          wp.authHeader,
          { method: "POST", body: { status } },
        );

        if (!result.ok) {
          if (result.status === 404) return LD_404_MSG;
          return `LearnDash API error ${result.status}: Could not update assignment.`;
        }

        return {
          success: true,
          id: assignmentId,
          status,
          message: `Assignment #${assignmentId} marked as ${status}.`,
        };
      },
    }),

    // ───────────── ESSAYS ─────────────

    ld_list_essays: tool({
      description: `List LearnDash essay submissions with grading status and points.
SAFE read-only operation.`,
      inputSchema: z.object({
        courseId: z
          .number()
          .optional()
          .describe("Filter by course ID (optional)"),
        count: z
          .number()
          .min(1)
          .max(50)
          .default(20)
          .describe("Number of essays to fetch (default 20)"),
      }),
      execute: async ({ courseId, count }) => {
        const wp = await getWpContext(ctx);
        if ("error" in wp) return wp.error;

        let params = `?per_page=${count}&_fields=id,title,status,author,course,lesson,topic,points_max,points_awarded`;
        if (courseId) params += `&course=${courseId}`;

        const result = await ldFetch(
          wp.creds.url,
          `/sfwd-essays${params}`,
          wp.authHeader,
        );

        if (!result.ok) {
          if (result.status === 404) return LD_404_MSG;
          return `LearnDash API error ${result.status}: Could not fetch essays.`;
        }

        const items = result.data as LdEssay[];
        if (!items?.length) return "No essays found.";
        return items.map((e) => ({
          id: e.id,
          title: e.title?.rendered ?? "Untitled",
          status: e.status,
          authorId: e.author,
          courseId: e.course,
          pointsMax: e.points_max ?? 0,
          pointsAwarded: e.points_awarded ?? 0,
        }));
      },
    }),

    ld_grade_essay: tool({
      description: `Grade a LearnDash essay by awarding points. CAUTION: Changes essay grade.
The AI should confirm the grade before applying.`,
      inputSchema: z.object({
        essayId: z.number().describe("Essay ID to grade"),
        pointsAwarded: z.number().describe("Points to award"),
        status: z
          .enum(["graded", "not_graded"])
          .default("graded")
          .describe("Grading status"),
      }),
      execute: async ({ essayId, pointsAwarded, status }) => {
        const wp = await getWpContext(ctx);
        if ("error" in wp) return wp.error;

        const result = await ldFetch(
          wp.creds.url,
          `/sfwd-essays/${essayId}`,
          wp.authHeader,
          { method: "POST", body: { points_awarded: pointsAwarded, status } },
        );

        if (!result.ok) {
          if (result.status === 404) return LD_404_MSG;
          return `LearnDash API error ${result.status}: Could not grade essay.`;
        }

        return {
          success: true,
          id: essayId,
          pointsAwarded,
          status,
          message: `Essay #${essayId} graded: ${pointsAwarded} points, status: ${status}.`,
        };
      },
    }),

    // ───────────── QUIZ STATISTICS ─────────────

    ld_get_quiz_statistics: tool({
      description: `Get statistics for a LearnDash quiz — attempt data, correct/incorrect answers per user.
Use this to analyze quiz performance. SAFE read-only operation.`,
      inputSchema: z.object({
        quizId: z.number().describe("Quiz ID to get statistics for"),
        count: z
          .number()
          .min(1)
          .max(50)
          .default(20)
          .describe("Number of stat entries to fetch (default 20)"),
      }),
      execute: async ({ quizId, count }) => {
        const wp = await getWpContext(ctx);
        if ("error" in wp) return wp.error;

        const params = `?per_page=${count}`;
        const result = await ldFetch(
          wp.creds.url,
          `/sfwd-quiz/${quizId}/statistics${params}`,
          wp.authHeader,
        );

        if (!result.ok) {
          if (result.status === 404) return LD_404_MSG;
          return `LearnDash API error ${result.status}: Could not fetch quiz statistics.`;
        }

        const stats = result.data as LdQuizStat[];
        if (!stats?.length) return `No statistics for quiz #${quizId}.`;
        return stats.map((s) => ({
          statId: s.id,
          quizId: s.quiz,
          userId: s.user,
          date: s.date,
          correct: s.answers_correct ?? 0,
          incorrect: s.answers_incorrect ?? 0,
          total: (s.answers_correct ?? 0) + (s.answers_incorrect ?? 0),
          scorePercent:
            (s.answers_correct ?? 0) + (s.answers_incorrect ?? 0) > 0
              ? Math.round(
                  ((s.answers_correct ?? 0) /
                    ((s.answers_correct ?? 0) + (s.answers_incorrect ?? 0))) *
                    100,
                )
              : 0,
        }));
      },
    }),
  };
}
