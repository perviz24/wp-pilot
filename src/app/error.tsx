"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-md">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
        </div>
        <h2 className="text-xl font-semibold tracking-tight">
          Something went wrong
        </h2>
        <p className="text-sm text-muted-foreground">
          {error.message || "An unexpected error occurred."}
        </p>
        <Button onClick={reset} variant="outline">
          Try again
        </Button>
      </div>
    </div>
  );
}
