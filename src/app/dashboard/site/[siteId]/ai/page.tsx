"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ArrowLeft, Hammer, Stethoscope, History } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { AiChat } from "@/components/ai/ai-chat";
import { SessionSidebar } from "@/components/ai/session-sidebar";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import type { UIMessage } from "ai";

function convertToUIMessages(
  dbMessages: {
    _id: string;
    role: "user" | "assistant" | "system" | "tool";
    content: string;
    timestamp: number;
  }[],
): UIMessage[] {
  return dbMessages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      id: m._id,
      role: m.role as "user" | "assistant",
      parts: [{ type: "text" as const, text: m.content }],
    }));
}

export default function AiBrainPage() {
  const params = useParams();
  const siteId = params.siteId as string;
  const [mode, setMode] = useState<"builder" | "doctor">("builder");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // null = "new chat" (no session selected), undefined = not yet initialized
  const [selectedSessionId, setSelectedSessionId] = useState<
    Id<"aiSessions"> | null | undefined
  >(undefined);

  // Stable counter — only increments on EXPLICIT user actions (new chat, select session, mode change).
  // Used as React key so AiChat never remounts due to reactive query updates.
  const [chatInstanceId, setChatInstanceId] = useState(0);

  const site = useQuery(api.sites.getById, {
    siteId: siteId as Id<"sites">,
  });

  const memories = useQuery(api.aiSiteMemory.listBySite, {
    siteId: siteId as Id<"sites">,
  });

  // Layer 1: Global knowledge — filtered by site's detected plugins
  const detectedPlugins = site?.discoveredApis?.map((a) => a.namespace) ?? [];
  const globalKnowledge = useQuery(api.aiGlobalKnowledge.listApplicable, {
    detectedPlugins: detectedPlugins.length > 0 ? detectedPlugins : undefined,
  });

  // Layer 2: Cross-site patterns — filtered by detected plugins + min confidence
  const patterns = useQuery(api.aiPatternLibrary.listApplicable, {
    detectedPlugins: detectedPlugins.length > 0 ? detectedPlugins : undefined,
    minConfidence: 0.5,
  });

  // Get latest active session to auto-select on first load
  const latestSession = useQuery(api.aiSessions.getLatestActive, {
    siteId: siteId as Id<"sites">,
    mode,
  });

  // Reset to loading state when mode changes
  useEffect(() => {
    setSelectedSessionId(undefined);
    setChatInstanceId((c) => c + 1);
  }, [mode]);

  // Auto-select latest session on INITIAL load only (when selectedSessionId is undefined).
  // Once user has selected/created a session, skip — prevents reactive query from
  // changing the key and remounting AiChat mid-conversation.
  useEffect(() => {
    if (latestSession === undefined) return; // still loading
    if (selectedSessionId !== undefined) return; // already selected, skip
    setSelectedSessionId(latestSession?._id ?? null);
  }, [latestSession, selectedSessionId]);

  // Determine which session to load
  const sessionToLoad = selectedSessionId ?? null;

  // Load messages for selected session (skip if no session)
  const sessionMessages = useQuery(
    api.aiMessages.listBySession,
    sessionToLoad ? { sessionId: sessionToLoad } : "skip",
  );

  // Hooks must be called unconditionally (before early returns)
  const handleNewChat = useCallback(() => {
    setSelectedSessionId(null);
    setChatInstanceId((c) => c + 1);
  }, []);

  const handleSelectSession = useCallback((sessionId: Id<"aiSessions">) => {
    setSelectedSessionId(sessionId);
    setChatInstanceId((c) => c + 1);
  }, []);

  // When AiChat creates a session internally, do NOT update selectedSessionId.
  // Doing so would change sessionToLoad → trigger sessionMessages query (undefined/loading)
  // → messagesLoading=true → isLoading=true → early return with skeleton → AiChat unmounts.
  // AiChat already tracks its own sessionId internally, so the parent doesn't need to sync.
  const handleSessionCreated = useCallback((_sessionId: Id<"aiSessions">) => {
    // Intentionally empty — avoids loading gate remount.
    // Sidebar won't highlight the active session until next page load, which is acceptable.
  }, []);

  // Wait for all data to load before rendering chat
  const sessionLoading = selectedSessionId === undefined;
  const messagesLoading = sessionToLoad && sessionMessages === undefined;
  const isLoading =
    site === undefined ||
    memories === undefined ||
    globalKnowledge === undefined ||
    patterns === undefined ||
    sessionLoading ||
    messagesLoading;

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col">
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Skeleton className="flex-1" />
      </div>
    );
  }

  // Not found
  if (site === null) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <p className="text-muted-foreground">Site not found</p>
      </div>
    );
  }

  const systemPrompt = buildSystemPrompt({
    mode,
    site: {
      name: site.name,
      url: site.url,
      cpanelConnected: site.cpanelConnected,
      wpRestConnected: site.wpRestConnected,
      wpAdminConnected: site.wpAdminConnected,
      discoveredApis: site.discoveredApis,
    },
    memories: (memories ?? []).map((m) => ({
      category: m.category,
      key: m.key,
      content: m.content,
      confidence: m.confidence,
    })),
    globalKnowledge: (globalKnowledge ?? []).map((g) => ({
      category: g.category,
      key: g.key,
      content: g.content,
      confidence: g.confidence,
      appliesWhen: g.appliesWhen,
    })),
    patterns: (patterns ?? []).map((p) => ({
      category: p.category,
      key: p.key,
      problem: p.problem,
      solution: p.solution,
      confidence: p.confidence,
      successRate: p.successRate,
      testedOn: p.testedOn.map((t) => ({
        siteName: t.siteName,
        success: t.success,
      })),
    })),
  });

  // Convert DB messages to UIMessage format for useChat
  const initialMessages =
    sessionMessages && sessionMessages.length > 0
      ? convertToUIMessages(sessionMessages)
      : undefined;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/dashboard/site/${siteId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(true)}
                >
                  <History className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Chat history</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div>
            <h1 className="text-lg font-semibold">AI Brain</h1>
            <p className="text-xs text-muted-foreground">{site.name}</p>
          </div>
        </div>

        <Tabs
          value={mode}
          onValueChange={(v) => setMode(v as "builder" | "doctor")}
        >
          <TabsList>
            <TabsTrigger value="builder" className="gap-1.5">
              <Hammer className="h-3.5 w-3.5" />
              Builder
            </TabsTrigger>
            <TabsTrigger value="doctor" className="gap-1.5">
              <Stethoscope className="h-3.5 w-3.5" />
              Doctor
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Chat area — key uses stable counter, only changes on explicit user actions */}
      <div className="min-h-0 flex-1">
        <AiChat
          key={`${mode}-${chatInstanceId}`}
          systemPrompt={systemPrompt}
          mode={mode}
          siteId={siteId as Id<"sites">}
          sessionId={sessionToLoad}
          initialMessages={initialMessages}
          onSessionCreated={handleSessionCreated}
        />
      </div>

      {/* Session history sidebar */}
      <SessionSidebar
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        siteId={siteId as Id<"sites">}
        mode={mode}
        activeSessionId={sessionToLoad}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
      />
    </div>
  );
}
