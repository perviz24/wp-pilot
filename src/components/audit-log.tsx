"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Server,
  FileCode,
  Code,
  Paintbrush,
  Monitor,
  CheckCircle2,
  XCircle,
  ScrollText,
} from "lucide-react";

const LAYER_CONFIG = {
  cpanel: { label: "cPanel", icon: Server, color: "text-blue-500" },
  "wp-rest": { label: "WP REST", icon: FileCode, color: "text-purple-500" },
  wpcode: { label: "WPCode", icon: Code, color: "text-orange-500" },
  angie: { label: "Angie", icon: Paintbrush, color: "text-pink-500" },
  playwright: { label: "Playwright", icon: Monitor, color: "text-emerald-500" },
};

const RISK_CONFIG = {
  safe: { label: "Safe", variant: "secondary" as const },
  medium: { label: "Medium", variant: "default" as const },
  high: { label: "High", variant: "destructive" as const },
  blocked: { label: "Blocked", variant: "destructive" as const },
  critical: { label: "Critical", variant: "destructive" as const },
};

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AuditLog({ siteId }: { siteId: Id<"sites"> }) {
  const logs = useQuery(api.auditLogs.listBySite, { siteId });

  // Loading
  if (logs === undefined) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    );
  }

  // Empty
  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <ScrollText className="mb-3 h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          No activity recorded yet.
        </p>
        <p className="text-xs text-muted-foreground">
          Actions like backups and file browsing will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {logs.map((log) => {
        const layer = LAYER_CONFIG[log.layer];
        const risk = RISK_CONFIG[log.riskLevel];
        const LayerIcon = layer.icon;

        return (
          <div
            key={log._id}
            className="flex items-start gap-3 rounded-lg border p-3"
          >
            {/* Success/failure icon */}
            {log.success ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            )}

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{log.action}</p>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <LayerIcon className={`h-3 w-3 ${layer.color}`} />
                  {layer.label}
                </span>
                <span>&middot;</span>
                <span>{formatTimestamp(log.timestamp)}</span>
                {log.details && (
                  <>
                    <span>&middot;</span>
                    <span className="truncate">{log.details}</span>
                  </>
                )}
              </div>
              {log.errorMessage && (
                <p className="mt-1 text-xs text-destructive truncate">
                  {log.errorMessage}
                </p>
              )}
            </div>

            {/* Risk badge */}
            <Badge variant={risk.variant} className="shrink-0 text-[10px]">
              {risk.label}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}
