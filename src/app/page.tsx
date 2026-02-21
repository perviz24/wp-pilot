import { Button } from "@/components/ui/button";
import { Shield, Server, Paintbrush, FileCode, Eye } from "lucide-react";
import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";

const layers = [
  {
    icon: Server,
    label: "cPanel",
    desc: "Backups, files, DNS",
    color: "text-blue-500",
  },
  {
    icon: FileCode,
    label: "WP REST",
    desc: "Content, plugins",
    color: "text-purple-500",
  },
  {
    icon: Shield,
    label: "WPCode",
    desc: "Custom code",
    color: "text-teal-500",
  },
  {
    icon: Paintbrush,
    label: "Angie",
    desc: "Design",
    color: "text-pink-500",
  },
  {
    icon: Eye,
    label: "Playwright",
    desc: "Visual test",
    color: "text-yellow-500",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="max-w-lg text-center space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            WP Pilot
          </h1>
          <p className="text-muted-foreground">
            Safely control WordPress sites through 5 layers — from server to
            design.
          </p>
        </div>

        <div className="grid grid-cols-5 gap-3">
          {layers.map((layer) => (
            <div key={layer.label} className="text-center space-y-1">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <layer.icon className={`h-5 w-5 ${layer.color}`} />
              </div>
              <p className="text-xs font-medium">{layer.label}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-3 justify-center">
          <SignedIn>
            <Button asChild size="lg">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </SignedIn>
          <SignedOut>
            <Button asChild size="lg">
              <Link href="/sign-in">Sign In</Link>
            </Button>
          </SignedOut>
        </div>
      </div>
    </div>
  );
}
