"use client";

import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AiMessage } from "./ai-message";
import { Send, Square, Loader2, Brain } from "lucide-react";

/** Extract plain text from a UIMessage's parts array */
function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

interface AiChatProps {
  systemPrompt: string;
  mode: "builder" | "doctor";
  siteId: Id<"sites">;
  sessionId: Id<"aiSessions"> | null;
  initialMessages?: UIMessage[];
  onSessionCreated?: (sessionId: Id<"aiSessions">) => void;
}

export function AiChat({
  systemPrompt,
  mode,
  siteId,
  sessionId: existingSessionId,
  initialMessages,
  onSessionCreated,
}: AiChatProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [sessionId, setSessionId] = useState<Id<"aiSessions"> | null>(
    existingSessionId,
  );
  // Ref tracks sessionId synchronously — avoids stale closure in onFinish
  const sessionIdRef = useRef<Id<"aiSessions"> | null>(existingSessionId);

  // Track whether we've already generated an AI title for this session
  const titleGeneratedRef = useRef(!!existingSessionId);
  // Store the first user message for title generation
  const firstUserMessageRef = useRef<string>("");

  // Convex mutations for persistence
  const createSession = useMutation(api.aiSessions.create);
  const addMessage = useMutation(api.aiMessages.add);
  const incrementCount = useMutation(api.aiSessions.incrementMessageCount);
  const updateTitle = useMutation(api.aiSessions.updateTitle);

  // Save assistant message when streaming finishes
  const handleFinish = useCallback(
    async ({ message }: { message: UIMessage }) => {
      const currentSessionId = sessionIdRef.current;
      if (!currentSessionId) return;
      const text = getMessageText(message);
      if (!text) return;

      await addMessage({
        sessionId: currentSessionId,
        role: "assistant",
        content: text,
      });
      await incrementCount({ sessionId: currentSessionId });

      // Auto-generate a smart title after the first assistant response
      if (!titleGeneratedRef.current && firstUserMessageRef.current) {
        titleGeneratedRef.current = true;
        // Fire-and-forget — don't block the UI
        fetch("/api/ai/title", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userMessage: firstUserMessageRef.current,
            assistantMessage: text.slice(0, 300),
          }),
        })
          .then((res) => res.json())
          .then((data: { title?: string }) => {
            if (data?.title) {
              updateTitle({ sessionId: currentSessionId, title: data.title });
            }
          })
          .catch(() => {
            // Silent fail — title stays as truncated user message
          });
      }
    },
    [addMessage, incrementCount, updateTitle],
  );

  const { messages, sendMessage, status, stop, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/ai/chat",
      body: { system: systemPrompt, siteId },
    }),
    messages: initialMessages,
    onFinish: handleFinish,
  });

  const isLoading = status === "submitted" || status === "streaming";

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    // Create session on first message if none exists
    let activeSessionId = sessionId;
    if (!activeSessionId) {
      // Temporary title — will be replaced by AI-generated title after first response
      const tempTitle = text.length > 50 ? text.slice(0, 50) + "..." : text;
      activeSessionId = await createSession({ siteId, mode, title: tempTitle });
      setSessionId(activeSessionId);
      sessionIdRef.current = activeSessionId; // sync ref immediately for onFinish
      firstUserMessageRef.current = text; // store for title generation
      onSessionCreated?.(activeSessionId); // notify parent to sync session ID
    }

    // Save user message to Convex
    await addMessage({
      sessionId: activeSessionId,
      role: "user",
      content: text,
    });
    await incrementCount({ sessionId: activeSessionId });

    // Send to AI
    sendMessage({ text });
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Messages area */}
      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Brain className="h-8 w-8 text-primary" />
            </div>
            <h3 className="mb-1 text-lg font-semibold">
              {mode === "builder" ? "Website Builder" : "Site Doctor"}
            </h3>
            <p className="max-w-sm text-sm text-muted-foreground">
              {mode === "builder"
                ? "Tell me what you want to build or change on your site. I'll handle the technical details."
                : "Describe the issue you're experiencing. I'll scan your site and suggest fixes."}
            </p>
          </div>
        ) : (
          <div className="py-4">
            {messages.map((message) => (
              <AiMessage key={message.id} message={message} />
            ))}

            {status === "submitted" && (
              <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Thinking...
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Error display */}
      {error && (
        <div className="mx-4 mb-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Something went wrong. Please try again.
        </div>
      )}

      {/* Input area */}
      <div className="border-t bg-background p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              mode === "builder"
                ? "What do you want to build?"
                : "Describe the issue..."
            }
            disabled={isLoading}
            className="min-h-[44px] max-h-[120px] resize-none"
            rows={1}
          />
          {isLoading ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => stop()}
              className="shrink-0"
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim()}
              className="shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}
