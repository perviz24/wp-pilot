"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  ExternalLink,
  Server,
  FileCode,
  KeyRound,
  Shield,
  Clock,
  Trash2,
  FolderOpen,
  ScrollText,
  Puzzle,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useState } from "react";
import { LayerCard } from "@/components/layer-card";

function formatDate(timestamp: number | undefined): string {
  if (!timestamp) return "Never";
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SiteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;
  const site = useQuery(api.sites.getById, {
    siteId: siteId as Id<"sites">,
  });
  const deleteSite = useMutation(api.sites.deleteSite);
  const triggerBackup = useAction(api.backups.triggerCpanelBackup);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);

  // Loading
  if (site === undefined) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  // Not found / unauthorized
  if (site === null) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
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
              This site doesn&apos;t exist or you don&apos;t have access to it.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      await triggerBackup({ siteId: site._id });
      toast.success("Backup started successfully");
    } catch {
      toast.error("Failed to start backup");
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${site.name}"? This cannot be undone.`)) return;
    setIsDeleting(true);
    try {
      await deleteSite({ siteId: site._id });
      toast.success(`${site.name} deleted`);
      router.push("/dashboard");
    } catch {
      toast.error("Failed to delete site");
    } finally {
      setIsDeleting(false);
    }
  };

  const layers =
    (site.cpanelConnected ? 1 : 0) +
    (site.wpRestConnected ? 1 : 0) +
    (site.wpAdminConnected ? 1 : 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{site.name}</h1>
            <a
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:underline"
            >
              {site.url}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
        <Badge variant="outline" className="shrink-0">
          {layers}/3 layers
        </Badge>
      </div>

      {/* Connection layers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Access Layers</CardTitle>
          <CardDescription>Connected integration points for this site</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <LayerCard
            connected={site.cpanelConnected}
            icon={Server}
            iconColor="text-blue-500"
            title="cPanel API"
            description={site.cpanelConnected ? `${site.cpanelHost}:${site.cpanelPort ?? 2083}` : "Not configured"}
          />
          <LayerCard
            connected={site.wpRestConnected}
            icon={FileCode}
            iconColor="text-purple-500"
            title="WP REST API"
            description={site.wpRestConnected ? (site.wpRestUrl ?? "Configured") : "Not configured"}
          />
          <LayerCard
            connected={site.wpAdminConnected}
            icon={KeyRound}
            iconColor="text-pink-500"
            title="WP Admin Login"
            description={site.wpAdminConnected ? `User: ${site.wpAdminUser}` : "Not configured"}
          />
        </CardContent>
      </Card>

      {/* Quick actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          <Button
            variant="outline"
            className="justify-start"
            disabled={!site.cpanelConnected || isBackingUp}
            onClick={handleBackup}
          >
            {isBackingUp ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Shield className="mr-2 h-4 w-4" />
            )}
            {isBackingUp ? "Backing up..." : "Create Backup"}
          </Button>
          <Button variant="outline" className="justify-start" disabled={!site.cpanelConnected}>
            <FolderOpen className="mr-2 h-4 w-4" />
            Browse Files
          </Button>
          <Button variant="outline" className="justify-start">
            <ScrollText className="mr-2 h-4 w-4" />
            Audit Log
          </Button>
          <Button variant="outline" className="justify-start" disabled={!site.wpRestConnected}>
            <Puzzle className="mr-2 h-4 w-4" />
            Discover APIs
          </Button>
        </CardContent>
      </Card>

      {/* Site info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Site Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Shield className="h-3.5 w-3.5" />
              Last Backup
            </span>
            <span>{formatDate(site.lastBackupAt)}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              Last Health Check
            </span>
            <span>{formatDate(site.lastCheckedAt)}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Added</span>
            <span>{formatDate(site.createdAt)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Delete this site</p>
              <p className="text-xs text-muted-foreground">
                Permanently remove this site and all its data
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
