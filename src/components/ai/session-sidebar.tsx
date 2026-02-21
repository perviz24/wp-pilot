"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, MessageSquare, Archive, Hammer, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

interface SessionSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteId: Id<"sites">;
  mode: "builder" | "doctor";
  activeSessionId: Id<"aiSessions"> | null;
  onSelectSession: (sessionId: Id<"aiSessions">) => void;
  onNewChat: () => void;
}

export function SessionSidebar({
  open,
  onOpenChange,
  siteId,
  mode,
  activeSessionId,
  onSelectSession,
  onNewChat,
}: SessionSidebarProps) {
  const sessions = useQuery(api.aiSessions.listBySiteAndMode, {
    siteId,
    mode,
  });

  const archiveSession = useMutation(api.aiSessions.archive);

  const handleArchive = async (
    e: React.MouseEvent,
    sessionId: Id<"aiSessions">,
  ) => {
    e.stopPropagation();
    await archiveSession({ sessionId });
  };

  const ModeIcon = mode === "builder" ? Hammer : Stethoscope;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-80 p-0">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="flex items-center gap-2 text-base">
            <ModeIcon className="h-4 w-4" />
            {mode === "builder" ? "Builder" : "Doctor"} Sessions
          </SheetTitle>
        </SheetHeader>

        <div className="p-3">
          <Button
            onClick={() => {
              onNewChat();
              onOpenChange(false);
            }}
            className="w-full gap-2"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>

        <ScrollArea className="h-[calc(100vh-8rem)]">
          {sessions === undefined ? (
            <div className="space-y-2 px-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <MessageSquare className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No {mode} sessions yet
              </p>
              <p className="text-xs text-muted-foreground/70">
                Start a new chat to begin
              </p>
            </div>
          ) : (
            <div className="space-y-1 px-3 pb-4">
              {sessions.map((session) => (
                <button
                  key={session._id}
                  onClick={() => {
                    onSelectSession(session._id);
                    onOpenChange(false);
                  }}
                  className={cn(
                    "group flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted",
                    activeSessionId === session._id && "bg-muted",
                  )}
                >
                  <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {session.title}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{session.messageCount} msgs</span>
                      <span>&middot;</span>
                      <span>{formatRelativeTime(session.updatedAt)}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleArchive(e, session._id)}
                    className="mt-0.5 shrink-0 rounded p-1 opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                    title="Archive session"
                  >
                    <Archive className="h-3.5 w-3.5" />
                  </button>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
