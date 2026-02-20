"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Shield,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  HardDrive,
} from "lucide-react";

const STATUS_CONFIG = {
  pending: { label: "Pending", variant: "secondary" as const, icon: Clock },
  in_progress: { label: "In Progress", variant: "secondary" as const, icon: Loader2 },
  completed: { label: "Completed", variant: "default" as const, icon: CheckCircle2 },
  failed: { label: "Failed", variant: "destructive" as const, icon: XCircle },
};

const TYPE_LABELS: Record<string, string> = {
  full: "Full Backup",
  database: "Database Only",
  files: "Files Only",
};

function formatBackupDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(startedAt: number, completedAt?: number): string {
  if (!completedAt) return "—";
  const seconds = Math.round((completedAt - startedAt) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
}

export function BackupHistory({ siteId }: { siteId: Id<"sites"> }) {
  const backups = useQuery(api.backups.listBySite, { siteId });

  // Loading state
  if (backups === undefined) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <HardDrive className="h-4 w-4" />
          Backup History
        </CardTitle>
        <CardDescription>
          {backups.length === 0
            ? "No backups yet"
            : `${backups.length} backup${backups.length === 1 ? "" : "s"}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {backups.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-center">
            <Shield className="mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No backups have been created yet.
            </p>
            <p className="text-xs text-muted-foreground">
              Use &ldquo;Create Backup&rdquo; to make your first backup.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {backups.map((backup) => {
              const config = STATUS_CONFIG[backup.status];
              const StatusIcon = config.icon;
              return (
                <div
                  key={backup._id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <StatusIcon
                      className={`h-4 w-4 shrink-0 ${
                        backup.status === "completed"
                          ? "text-green-500"
                          : backup.status === "failed"
                            ? "text-destructive"
                            : backup.status === "in_progress"
                              ? "animate-spin text-blue-500"
                              : "text-muted-foreground"
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {TYPE_LABELS[backup.type] ?? backup.type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatBackupDate(backup.startedAt)}
                        {backup.completedAt && (
                          <> &middot; {formatDuration(backup.startedAt, backup.completedAt)}</>
                        )}
                        {backup.triggeredBy === "auto-safety" && (
                          <> &middot; Auto</>
                        )}
                      </p>
                      {backup.errorMessage && (
                        <p className="text-xs text-destructive truncate">
                          {backup.errorMessage}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant={config.variant} className="shrink-0 ml-2">
                    {config.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
