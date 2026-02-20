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
import { ArrowLeft, ScrollText } from "lucide-react";
import Link from "next/link";
import { AuditLog } from "@/components/audit-log";

export default function AuditLogPage() {
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
          <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-sm text-muted-foreground">{site.name}</p>
        </div>
      </div>

      {/* Audit log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ScrollText className="h-4 w-4" />
            Activity Log
          </CardTitle>
          <CardDescription>
            All actions performed on this site across all layers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuditLog siteId={site._id} />
        </CardContent>
      </Card>
    </div>
  );
}
