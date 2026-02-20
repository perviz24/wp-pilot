"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, FolderOpen, Server } from "lucide-react";
import Link from "next/link";
import { FileBrowser } from "@/components/file-browser";

export default function FileBrowserPage() {
  const params = useParams();
  const siteId = params.siteId as string;
  const site = useQuery(api.sites.getById, {
    siteId: siteId as Id<"sites">,
  });

  // Loading
  if (site === undefined) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  // Not found
  if (site === null) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Site not found</h1>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              This site doesn&apos;t exist or you don&apos;t have access.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // cPanel not connected
  if (!site.cpanelConnected) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/dashboard/site/${siteId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">File Browser</h1>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Server className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium">cPanel not connected</p>
            <p className="mt-1 text-xs text-muted-foreground">
              File browsing requires a cPanel API connection.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/site/${siteId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">File Browser</h1>
          <p className="text-sm text-muted-foreground">{site.name}</p>
        </div>
      </div>

      {/* Risk legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="text-muted-foreground">Risk levels:</span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          Critical (core files)
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-yellow-500" />
          Caution (PHP/plugins)
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          Safe (media/cache)
        </span>
      </div>

      {/* File browser */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderOpen className="h-4 w-4" />
            Files
          </CardTitle>
          <CardDescription>
            Read-only file browser via cPanel API
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FileBrowser siteId={site._id} />
        </CardContent>
      </Card>
    </div>
  );
}
