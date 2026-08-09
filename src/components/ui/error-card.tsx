import * as React from "react";
import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorCardProps {
  title?: string;
  description?: string;
  error?: unknown;
  onRetry?: () => void;
  retrying?: boolean;
  offline?: boolean;
  className?: string;
}

function messageOf(error: unknown): string | undefined {
  if (!error) return undefined;
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && "message" in (error as Record<string, unknown>)) {
    return String((error as Record<string, unknown>).message);
  }
  return undefined;
}

/**
 * Graceful, on-brand error surface with a retry affordance.
 */
export function ErrorCard({
  title,
  description,
  error,
  onRetry,
  retrying,
  offline,
  className,
}: ErrorCardProps) {
  const Icon = offline ? WifiOff : AlertTriangle;
  const heading = title ?? (offline ? "You're offline" : "Something went wrong");
  const detail =
    description ??
    (offline
      ? "We can't reach the server right now. Check your connection and try again."
      : messageOf(error) ?? "This section failed to load. You can retry without leaving the page.");

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-destructive/25 bg-destructive/5 px-6 py-10 text-center",
        className,
      )}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{heading}</h3>
      <p className="mt-1.5 max-w-md break-words text-sm text-muted-foreground">{detail}</p>
      {onRetry && (
        <Button onClick={onRetry} size="sm" variant="outline" className="mt-5" disabled={retrying}>
          <RefreshCw className={cn("h-4 w-4", retrying && "animate-spin")} aria-hidden="true" />
          {retrying ? "Retrying…" : "Try again"}
        </Button>
      )}
    </div>
  );
}
