"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Server,
  Globe,
  AlertCircle,
  Clock,
  Shield,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

function formatRelativeTime(timestamp: number | undefined): string {
  if (!timestamp) return "Never";
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function connectionCount(site: {
  cpanelConnected: boolean;
  wpRestConnected: boolean;
  wpAdminConnected: boolean;
}): number {
  return (
    (site.cpanelConnected ? 1 : 0) +
    (site.wpRestConnected ? 1 : 0) +
    (site.wpAdminConnected ? 1 : 0)
  );
}

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const sites = useQuery(api.sites.listByUser);

  if (!isLoaded) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.firstName ?? "there"}
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/add-site">
            <Plus className="mr-2 h-4 w-4" />
            Add Site
          </Link>
        </Button>
      </div>

      {/* Sites loading */}
      {sites === undefined && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-36" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {sites !== undefined && sites.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-muted p-3">
              <Globe className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mb-1 text-lg font-semibold">No sites yet</h3>
            <p className="mb-4 max-w-sm text-sm text-muted-foreground">
              Add your first WordPress site to start managing backups, files,
              and plugins from one dashboard.
            </p>
            <Button asChild>
              <Link href="/dashboard/add-site">
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Site
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Site health cards */}
      {sites !== undefined && sites.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sites.map((site) => {
            const layers = connectionCount(site);
            return (
              <Link key={site._id} href={`/dashboard/site/${site._id}`}>
                <Card className="group cursor-pointer transition-all hover:shadow-md hover:border-foreground/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-base">
                      <span className="flex items-center gap-2 truncate">
                        <Server className="h-4 w-4 shrink-0 text-muted-foreground" />
                        {site.name}
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="flex items-center gap-1 text-sm text-muted-foreground truncate">
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      {site.url}
                    </p>

                    {/* Connection badges */}
                    <div className="flex flex-wrap gap-1.5">
                      {site.cpanelConnected && (
                        <Badge variant="secondary" className="text-blue-700 bg-blue-50 dark:bg-blue-950 dark:text-blue-300">
                          cPanel
                        </Badge>
                      )}
                      {site.wpRestConnected && (
                        <Badge variant="secondary" className="text-purple-700 bg-purple-50 dark:bg-purple-950 dark:text-purple-300">
                          WP REST
                        </Badge>
                      )}
                      {site.wpAdminConnected && (
                        <Badge variant="secondary" className="text-pink-700 bg-pink-50 dark:bg-pink-950 dark:text-pink-300">
                          WP Admin
                        </Badge>
                      )}
                      {layers === 0 && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <AlertCircle className="h-3 w-3" />
                          No connections
                        </span>
                      )}
                    </div>

                    {/* Health indicators */}
                    <div className="flex items-center gap-4 border-t pt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1" title="Last backup">
                        <Shield className="h-3 w-3" />
                        {formatRelativeTime(site.lastBackupAt)}
                      </span>
                      <span className="flex items-center gap-1" title="Last health check">
                        <Clock className="h-3 w-3" />
                        {formatRelativeTime(site.lastCheckedAt)}
                      </span>
                      <span className="ml-auto font-medium">
                        {layers}/3 layers
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
