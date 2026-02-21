"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Globe, Server, FileCode, KeyRound, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { CredentialSection } from "@/components/credential-section";

const CPANEL_FIELDS = [
  { id: "cpanelHost", label: "Host", placeholder: "server.example.com", half: true },
  { id: "cpanelPort", label: "Port", placeholder: "2083", type: "number", half: true },
  { id: "cpanelUsername", label: "Username", placeholder: "cpanel_user" },
  { id: "cpanelToken", label: "API Token", placeholder: "YPXAZ02XDFKNG741D8X6SBJEZQF5UHZ3", type: "password", hint: "Paste the long token VALUE shown when creating a token — not the token name" },
];

const WP_REST_FIELDS = [
  { id: "wpRestUrl", label: "REST API URL", placeholder: "https://example.com/wp-json" },
  { id: "wpUsername", label: "Username", placeholder: "admin" },
  { id: "wpAppPassword", label: "Application Password", placeholder: "xxxx xxxx xxxx xxxx xxxx xxxx", type: "password" },
];

const WP_ADMIN_FIELDS = [
  { id: "wpAdminUser", label: "Admin Username", placeholder: "admin" },
  { id: "wpAdminPassword", label: "Admin Password", placeholder: "Your WP admin password", type: "password" },
];

export default function AddSitePage() {
  const router = useRouter();
  const addSite = useMutation(api.sites.addSite);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Site info
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  // Credential values stored as flat record
  const [creds, setCreds] = useState<Record<string, string>>({ cpanelPort: "2083" });

  const updateCred = (id: string, value: string) => {
    setCreds((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) {
      toast.error("Site name and URL are required");
      return;
    }

    setIsSubmitting(true);
    try {
      await addSite({
        name: name.trim(),
        url: url.trim(),
        cpanelHost: creds.cpanelHost || undefined,
        cpanelPort: creds.cpanelPort ? Number(creds.cpanelPort) : undefined,
        cpanelUsername: creds.cpanelUsername || undefined,
        cpanelToken: creds.cpanelToken || undefined,
        wpRestUrl: creds.wpRestUrl || undefined,
        wpUsername: creds.wpUsername || undefined,
        wpAppPassword: creds.wpAppPassword || undefined,
        wpAdminUser: creds.wpAdminUser || undefined,
        wpAdminPassword: creds.wpAdminPassword || undefined,
      });
      toast.success(`${name} added successfully`);
      router.push("/dashboard");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add site"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const filledCount =
    (creds.cpanelHost && creds.cpanelToken ? 1 : 0) +
    (creds.wpRestUrl && creds.wpAppPassword ? 1 : 0) +
    (creds.wpAdminUser && creds.wpAdminPassword ? 1 : 0);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Add Site</h1>
          <p className="text-sm text-muted-foreground">
            Connect a WordPress site with one or more access layers
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Site info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-4 w-4" />
              Site Information
            </CardTitle>
            <CardDescription>Basic details about your site</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Site Name</Label>
              <Input
                id="name"
                placeholder="My WordPress Site"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">Site URL</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Credential sections */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              Access Layers{" "}
              {filledCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {filledCount} configured
                </Badge>
              )}
            </h2>
            <p className="text-xs text-muted-foreground">
              All optional — add what you have
            </p>
          </div>

          <CredentialSection
            icon={Server}
            iconColor="text-blue-500"
            title="cPanel API"
            description="Backups, file manager, DNS"
            fields={CPANEL_FIELDS}
            values={creds}
            onChange={updateCred}
            isComplete={!!(creds.cpanelHost && creds.cpanelToken)}
          />

          <CredentialSection
            icon={FileCode}
            iconColor="text-purple-500"
            title="WP REST API"
            description="Content, plugins, themes"
            fields={WP_REST_FIELDS}
            values={creds}
            onChange={updateCred}
            isComplete={!!(creds.wpRestUrl && creds.wpAppPassword)}
          />

          <CredentialSection
            icon={KeyRound}
            iconColor="text-pink-500"
            title="WP Admin Login"
            description="Angie + Playwright automation"
            fields={WP_ADMIN_FIELDS}
            values={creds}
            onChange={updateCred}
            isComplete={!!(creds.wpAdminUser && creds.wpAdminPassword)}
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href="/dashboard">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting || !name || !url}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Site
          </Button>
        </div>
      </form>
    </div>
  );
}
