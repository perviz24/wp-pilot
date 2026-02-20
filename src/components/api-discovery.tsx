"use client";

import { useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Puzzle, Loader2, RefreshCw, Globe, AlertCircle } from "lucide-react";
import { toast } from "sonner";

// Known plugin categories for coloring
const CATEGORY_MAP: Record<string, { color: string; category: string }> = {
  wp: { color: "text-blue-500", category: "Core" },
  "wp/v2": { color: "text-blue-500", category: "Core" },
  oembed: { color: "text-blue-500", category: "Core" },
  "wp-site-health": { color: "text-blue-500", category: "Core" },
  wc: { color: "text-green-500", category: "E-Commerce" },
  "wc/v3": { color: "text-green-500", category: "E-Commerce" },
  "wc/store": { color: "text-green-500", category: "E-Commerce" },
  yoast: { color: "text-orange-500", category: "SEO" },
  "yoast/v1": { color: "text-orange-500", category: "SEO" },
  "rankmath/v1": { color: "text-orange-500", category: "SEO" },
  "jetpack/v4": { color: "text-purple-500", category: "Security" },
  "elementor/v1": { color: "text-pink-500", category: "Builder" },
  "acf/v3": { color: "text-amber-500", category: "Fields" },
  "wpcode/v1": { color: "text-emerald-500", category: "Code" },
};

function getCategoryInfo(ns: string) {
  return CATEGORY_MAP[ns] ?? { color: "text-muted-foreground", category: "Plugin" };
}

export function ApiDiscovery({ siteId }: { siteId: Id<"sites"> }) {
  const discover = useAction(api.discovery.discoverApis);
  const apis = useQuery(api.discovery.getDiscoveredApis, { siteId });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDiscover = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await discover({ siteId });
      toast.success(`Found ${result.namespaces.length} API namespaces`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Discovery failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Loading query
  if (apis === undefined) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
    );
  }

  // No APIs discovered yet
  if (apis.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <Puzzle className="mb-3 h-10 w-10 text-muted-foreground/40" />
        <p className="mb-1 text-sm text-muted-foreground">
          No APIs discovered yet.
        </p>
        <p className="mb-4 text-xs text-muted-foreground">
          Scan your site&apos;s /wp-json/ endpoint to find available REST APIs.
        </p>
        <Button onClick={handleDiscover} disabled={loading} variant="outline">
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Puzzle className="mr-2 h-4 w-4" />
          )}
          {loading ? "Scanning..." : "Discover APIs"}
        </Button>
        {error && (
          <div className="mt-3 flex items-center gap-2 text-xs text-destructive">
            <AlertCircle className="h-3 w-3" />
            {error}
          </div>
        )}
      </div>
    );
  }

  // Group by category
  const grouped = new Map<string, { namespace: string; label: string }[]>();
  for (const api of apis) {
    const info = getCategoryInfo(api.namespace);
    const existing = grouped.get(info.category) ?? [];
    existing.push(api);
    grouped.set(info.category, existing);
  }

  return (
    <div className="space-y-4">
      {/* Refresh button */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {apis.length} namespace{apis.length === 1 ? "" : "s"} found
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDiscover}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="mr-1 h-3 w-3" />
          )}
          Rescan
        </Button>
      </div>

      {/* Grouped namespaces */}
      {Array.from(grouped.entries()).map(([category, items]) => (
        <div key={category}>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {category}
          </p>
          <div className="space-y-1">
            {items.map((item) => {
              const info = getCategoryInfo(item.namespace);
              return (
                <div
                  key={item.namespace}
                  className="flex items-center gap-3 rounded-lg border px-3 py-2"
                >
                  <Globe className={`h-3.5 w-3.5 shrink-0 ${info.color}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{item.label}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      /{item.namespace}/
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    REST
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {error && (
        <div className="flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" />
          {error}
        </div>
      )}
    </div>
  );
}
