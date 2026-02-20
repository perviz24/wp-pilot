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
import { ArrowLeft, Puzzle, FileCode } from "lucide-react";
import Link from "next/link";
import { ApiDiscovery } from "@/components/api-discovery";

export default function ApiDiscoveryPage() {
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

  // WP REST not connected
  if (!site.wpRestConnected) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/dashboard/site/${siteId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">API Discovery</h1>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <FileCode className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium">WP REST API not connected</p>
            <p className="mt-1 text-xs text-muted-foreground">
              API discovery requires a WP REST API connection.
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
          <h1 className="text-2xl font-bold tracking-tight">API Discovery</h1>
          <p className="text-sm text-muted-foreground">{site.name}</p>
        </div>
      </div>

      {/* API discovery */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Puzzle className="h-4 w-4" />
            REST API Namespaces
          </CardTitle>
          <CardDescription>
            Available REST API endpoints discovered via /wp-json/
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ApiDiscovery siteId={site._id} />
        </CardContent>
      </Card>
    </div>
  );
}
