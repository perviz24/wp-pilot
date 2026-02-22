/**
 * AI tools for reading LearnDash LMS data via REST API v2 (ldlms/v2).
 * All tools are SAFE read-only operations.
 * Uses same WP Application Password auth as other WP REST tools.
 */

import { tool } from "ai";
import { z } from "zod";
import type { ToolContext } from "./types";
import { ldFetch, getWpContext } from "./wp-rest-helpers";

// LearnDash API response types (subset of fields we use)
interface LdCourse {
  id: number;
  title: { rendered: string };
  status: string;
  date: string;
  link: string;
}

interface LdLesson {
  id: number;
  title: { rendered: string };
  status: string;
  menu_order: number;
}

interface LdTopic {
  id: number;
  title: { rendered: string };
  status: string;
  menu_order: number;
}

interface LdQuiz {
  id: number;
  title: { rendered: string };
  status: string;
}

interface LdQuestion {
  id: number;
  title: { rendered: string };
  question_type?: string;
  points?: number;
  menu_order?: number;
}

interface LdCourseUser {
  id: number;
  name: string;
  email?: string;
  date_started?: string;
  steps_completed?: number;
  steps_total?: number;
  status?: string;
}

const LD_404_MSG =
  "LearnDash REST API not found (404). Is LearnDash installed and activated on this site?";

export function createLearnDashReadTools(ctx: ToolContext) {
  return {
    ld_list_courses: tool({
      description: `List LearnDash courses with title, status, and date.
Use this to understand the LMS content on the site. SAFE read-only operation.`,
      inputSchema: z.object({
        count: z
          .number()
          .min(1)
          .max(100)
          .default(20)
          .describe("Number of courses to fetch (default 20)"),
        status: z
          .enum(["publish", "draft", "any"])
          .default("any")
          .describe("Filter by status"),
      }),
      execute: async ({ count, status }) => {
        const wp = await getWpContext(ctx);
        if ("error" in wp) return wp.error;

        const params = `?per_page=${count}&status=${status}&_fields=id,title,status,date,link`;
        const result = await ldFetch(
          wp.creds.url,
          `/sfwd-courses${params}`,
          wp.authHeader,
        );
        if (!result.ok) {
          if (result.status === 404) return LD_404_MSG;
          return `LearnDash API error ${result.status}: Could not fetch courses.`;
        }

        const courses = result.data as LdCourse[];
        if (!courses?.length) return "No courses found.";

        return courses.map((c) => ({
          id: c.id,
          title: c.title?.rendered ?? "Untitled",
          status: c.status,
          date: c.date,
          link: c.link,
        }));
      },
    }),

    ld_list_lessons: tool({
      description: `List lessons for a specific LearnDash course, ordered by curriculum sequence.
Use this to see the course structure. SAFE read-only operation.`,
      inputSchema: z.object({
        courseId: z.number().describe("Course ID to list lessons for"),
        count: z
          .number()
          .min(1)
          .max(100)
          .default(50)
          .describe("Number of lessons to fetch (default 50)"),
      }),
      execute: async ({ courseId, count }) => {
        const wp = await getWpContext(ctx);
        if ("error" in wp) return wp.error;

        const params = `?course=${courseId}&per_page=${count}&orderby=menu_order&order=asc&_fields=id,title,status,menu_order`;
        const result = await ldFetch(
          wp.creds.url,
          `/sfwd-lessons${params}`,
          wp.authHeader,
        );
        if (!result.ok) {
          if (result.status === 404) return LD_404_MSG;
          return `LearnDash API error ${result.status}: Could not fetch lessons.`;
        }

        const lessons = result.data as LdLesson[];
        if (!lessons?.length)
          return `No lessons found for course #${courseId}.`;

        return lessons.map((l) => ({
          id: l.id,
          title: l.title?.rendered ?? "Untitled",
          status: l.status,
          order: l.menu_order,
        }));
      },
    }),

    ld_list_topics: tool({
      description: `List topics within a specific lesson. Topics are sub-sections under lessons in LearnDash.
SAFE read-only operation.`,
      inputSchema: z.object({
        courseId: z.number().describe("Course ID"),
        lessonId: z.number().describe("Lesson ID to list topics for"),
        count: z
          .number()
          .min(1)
          .max(100)
          .default(50)
          .describe("Number of topics to fetch (default 50)"),
      }),
      execute: async ({ courseId, lessonId, count }) => {
        const wp = await getWpContext(ctx);
        if ("error" in wp) return wp.error;

        // Note: LearnDash uses singular "sfwd-topic" (not "sfwd-topics")
        const params = `?course=${courseId}&lesson=${lessonId}&per_page=${count}&orderby=menu_order&order=asc&_fields=id,title,status,menu_order`;
        const result = await ldFetch(
          wp.creds.url,
          `/sfwd-topic${params}`,
          wp.authHeader,
        );
        if (!result.ok) {
          if (result.status === 404) return LD_404_MSG;
          return `LearnDash API error ${result.status}: Could not fetch topics.`;
        }

        const topics = result.data as LdTopic[];
        if (!topics?.length)
          return `No topics found for lesson #${lessonId} in course #${courseId}.`;

        return topics.map((t) => ({
          id: t.id,
          title: t.title?.rendered ?? "Untitled",
          status: t.status,
          order: t.menu_order,
        }));
      },
    }),

    ld_list_quizzes: tool({
      description: `List LearnDash quizzes, optionally filtered by course.
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
          .describe("Number of quizzes to fetch (default 20)"),
      }),
      execute: async ({ courseId, count }) => {
        const wp = await getWpContext(ctx);
        if ("error" in wp) return wp.error;

        // Note: LearnDash uses singular "sfwd-quiz" (not "sfwd-quizzes")
        let params = `?per_page=${count}&_fields=id,title,status`;
        if (courseId) params += `&course=${courseId}`;
        const result = await ldFetch(
          wp.creds.url,
          `/sfwd-quiz${params}`,
          wp.authHeader,
        );
        if (!result.ok) {
          if (result.status === 404) return LD_404_MSG;
          return `LearnDash API error ${result.status}: Could not fetch quizzes.`;
        }

        const quizzes = result.data as LdQuiz[];
        if (!quizzes?.length) return "No quizzes found.";

        return quizzes.map((q) => ({
          id: q.id,
          title: q.title?.rendered ?? "Untitled",
          status: q.status,
        }));
      },
    }),

    ld_list_questions: tool({
      description: `List questions for a specific LearnDash quiz.
Returns question title, type, and points. SAFE read-only operation.`,
      inputSchema: z.object({
        quizId: z.number().describe("Quiz ID to list questions for"),
        count: z
          .number()
          .min(1)
          .max(100)
          .default(50)
          .describe("Number of questions to fetch (default 50)"),
      }),
      execute: async ({ quizId, count }) => {
        const wp = await getWpContext(ctx);
        if ("error" in wp) return wp.error;

        // Note: LearnDash uses singular "sfwd-question"
        const params = `?quiz=${quizId}&per_page=${count}&_fields=id,title,question_type,points,menu_order`;
        const result = await ldFetch(
          wp.creds.url,
          `/sfwd-question${params}`,
          wp.authHeader,
        );
        if (!result.ok) {
          if (result.status === 404) return LD_404_MSG;
          return `LearnDash API error ${result.status}: Could not fetch questions.`;
        }

        const questions = result.data as LdQuestion[];
        if (!questions?.length)
          return `No questions found for quiz #${quizId}.`;

        return questions.map((q) => ({
          id: q.id,
          title: q.title?.rendered ?? "Untitled",
          type: q.question_type ?? "unknown",
          points: q.points ?? 0,
          order: q.menu_order ?? 0,
        }));
      },
    }),

    ld_get_course_users: tool({
      description: `List users enrolled in a LearnDash course with their progress.
Returns user name, steps completed, percentage, and status. SAFE read-only operation.`,
      inputSchema: z.object({
        courseId: z.number().describe("Course ID to list enrolled users for"),
        count: z
          .number()
          .min(1)
          .max(50)
          .default(20)
          .describe("Number of users to fetch (default 20)"),
        page: z
          .number()
          .min(1)
          .default(1)
          .describe("Page number for pagination (default 1)"),
      }),
      execute: async ({ courseId, count, page }) => {
        const wp = await getWpContext(ctx);
        if ("error" in wp) return wp.error;

        const params = `?per_page=${count}&page=${page}`;
        const result = await ldFetch(
          wp.creds.url,
          `/sfwd-courses/${courseId}/users${params}`,
          wp.authHeader,
        );
        if (!result.ok) {
          if (result.status === 404) return LD_404_MSG;
          return `LearnDash API error ${result.status}: Could not fetch enrolled users.`;
        }

        const users = result.data as LdCourseUser[];
        if (!users?.length)
          return `No users enrolled in course #${courseId}.`;

        return users.map((u) => ({
          userId: u.id,
          name: u.name ?? "Unknown",
          email: u.email,
          dateStarted: u.date_started,
          stepsCompleted: u.steps_completed ?? 0,
          stepsTotal: u.steps_total ?? 0,
          percentComplete:
            u.steps_total && u.steps_total > 0
              ? Math.round(
                  ((u.steps_completed ?? 0) / u.steps_total) * 100,
                )
              : 0,
          status: u.status ?? "unknown",
        }));
      },
    }),
  };
}
