"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Hammer, Stethoscope } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AiChat } from "@/components/ai/ai-chat";
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

  const site = useQuery(api.sites.getById, {
    siteId: siteId as Id<"sites">,
  });

  const memories = useQuery(api.aiSiteMemory.listBySite, {
    siteId: siteId as Id<"sites">,
  });

  // Get latest active session for current mode
  const activeSession = useQuery(api.aiSessions.getLatestActive, {
    siteId: siteId as Id<"sites">,
    mode,
  });

  // Load messages for active session (skip if no session)
  const sessionMessages = useQuery(
    api.aiMessages.listBySession,
    activeSession?._id
      ? { sessionId: activeSession._id }
      : "skip",
  );

  // Loading
  if (site === undefined || memories === undefined) {
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

      {/* Chat area — key={mode} forces remount to load correct session */}
      <div className="flex-1 overflow-hidden">
        <AiChat
          key={mode}
          systemPrompt={systemPrompt}
          mode={mode}
          siteId={siteId as Id<"sites">}
          sessionId={activeSession?._id ?? null}
          initialMessages={initialMessages}
        />
      </div>
    </div>
  );
}
