"use client";

import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { CpanelFile, ListDirectoryResult } from "../../convex/files";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Folder,
  File,
  FileCode,
  FileImage,
  FileArchive,
  FileText,
  Database,
  FileJson,
  ScrollText,
  ChevronRight,
  Loader2,
  AlertCircle,
  FolderOpen,
} from "lucide-react";
import { getFileRisk, getFileIcon } from "@/lib/file-risk";

const ICON_MAP: Record<string, typeof File> = {
  folder: Folder,
  php: FileCode,
  code: FileCode,
  style: FileCode,
  html: FileCode,
  image: FileImage,
  archive: FileArchive,
  doc: FileText,
  database: Database,
  config: FileJson,
  log: ScrollText,
  file: File,
};

function formatMtime(epoch: number): string {
  if (!epoch) return "—";
  return new Date(epoch * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function FileBrowser({ siteId }: { siteId: Id<"sites"> }) {
  const listDir = useAction(api.files.listDirectory);
  const [files, setFiles] = useState<CpanelFile[]>([]);
  const [currentDir, setCurrentDir] = useState("public_html");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const browse = async (dir: string) => {
    setLoading(true);
    setError(null);
    setErrorType(null);
    try {
      const result: ListDirectoryResult = await listDir({ siteId, dir });
      if (!result.ok) {
        setError(result.error);
        setErrorType(result.errorType);
        return;
      }
      setFiles(result.files);
      setCurrentDir(result.currentDir);
      setLoaded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to list files");
      setErrorType("connection");
    } finally {
      setLoading(false);
    }
  };

  const navigateUp = () => {
    const parent = currentDir.split("/").slice(0, -1).join("/");
    if (parent) browse(parent);
  };

  const breadcrumbs = currentDir.split("/").filter(Boolean);

  // Initial state — not yet loaded
  if (!loaded && !loading && !error) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <FolderOpen className="mb-3 h-10 w-10 text-muted-foreground/40" />
        <p className="mb-4 text-sm text-muted-foreground">
          Browse your WordPress file system via cPanel
        </p>
        <Button onClick={() => browse("public_html")} variant="outline">
          <FolderOpen className="mr-2 h-4 w-4" />
          Open File Browser
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Breadcrumb navigation */}
      <div className="flex items-center gap-1 text-sm overflow-x-auto">
        {breadcrumbs.map((crumb, i) => {
          const path = breadcrumbs.slice(0, i + 1).join("/");
          const isLast = i === breadcrumbs.length - 1;
          return (
            <span key={path} className="flex items-center gap-1 shrink-0">
              {i > 0 && (
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              )}
              {isLast ? (
                <span className="font-medium">{crumb}</span>
              ) : (
                <button
                  onClick={() => browse(path)}
                  className="text-muted-foreground hover:text-foreground hover:underline"
                >
                  {crumb}
                </button>
              )}
            </span>
          );
        })}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div className="flex-1 space-y-2">
              <p className="text-destructive">{error}</p>
              {errorType === "firewall" ? (
                <div className="rounded border bg-background/50 p-2 text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">How to fix:</p>
                  <ol className="list-decimal list-inside space-y-0.5">
                    <li>Log into your cPanel dashboard directly</li>
                    <li>Go to <strong>Imunify360 → White List</strong></li>
                    <li>Add the IP that needs access</li>
                    <li>Or contact your hosting provider&apos;s support</li>
                  </ol>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-destructive"
                  onClick={() => browse(currentDir)}
                >
                  Retry
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* File list */}
      {!loading && !error && (
        <div className="rounded-lg border">
          {/* Parent directory row */}
          {breadcrumbs.length > 1 && (
            <button
              onClick={navigateUp}
              className="flex w-full items-center gap-3 border-b px-3 py-2 text-left text-sm hover:bg-muted/50"
            >
              <Folder className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">..</span>
            </button>
          )}

          {/* Files */}
          {files.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              Empty directory
            </div>
          )}
          {files.map((file) => {
            const isDir = file.type === "dir";
            const risk = getFileRisk(file.name, file.fullpath, isDir);
            const iconType = getFileIcon(file.name, isDir);
            const IconComponent = ICON_MAP[iconType] ?? File;

            return (
              <div
                key={file.name}
                className={`flex items-center gap-3 border-b px-3 py-2 text-sm last:border-b-0 ${
                  isDir ? "cursor-pointer hover:bg-muted/50" : ""
                } ${risk.level === "critical" ? "bg-red-500/5" : ""}`}
                onClick={isDir ? () => browse(file.fullpath) : undefined}
                role={isDir ? "button" : undefined}
                tabIndex={isDir ? 0 : undefined}
                onKeyDown={
                  isDir
                    ? (e) => {
                        if (e.key === "Enter") browse(file.fullpath);
                      }
                    : undefined
                }
              >
                <IconComponent
                  className={`h-4 w-4 shrink-0 ${
                    isDir ? "text-blue-500" : "text-muted-foreground"
                  }`}
                />
                <span className="flex-1 truncate">{file.name}</span>
                {risk.level !== "safe" && (
                  <Badge
                    variant="outline"
                    className={`shrink-0 text-[10px] ${risk.color} ${risk.bgColor} border-0`}
                  >
                    {risk.label}
                  </Badge>
                )}
                <span className="shrink-0 text-xs text-muted-foreground w-16 text-right">
                  {isDir ? "—" : file.humansize}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground w-24 text-right hidden sm:block">
                  {formatMtime(file.mtime)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Status bar */}
      {!loading && loaded && !error && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {files.filter((f) => f.type === "dir").length} folders,{" "}
            {files.filter((f) => f.type !== "dir").length} files
          </span>
          <span>Read-only view via cPanel API</span>
        </div>
      )}
    </div>
  );
}
