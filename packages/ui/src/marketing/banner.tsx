"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface BannerProps {
  variant?: "info" | "success" | "warning" | "destructive";
  title: string;
  description?: string;
  cta?: { label: string; href: string };
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
  icon?: React.ReactNode;
}

const VARIANTS = {
  info: "border-info/30 bg-info/10 text-info-foreground",
  success: "border-success/30 bg-success/10 text-success-foreground",
  warning: "border-warning/30 bg-warning/10 text-warning-foreground",
  destructive: "border-destructive/30 bg-destructive/10 text-destructive-foreground"
};

export function Banner({
  variant = "info",
  title,
  description,
  cta,
  dismissible = false,
  onDismiss,
  className,
  icon
}: BannerProps) {
  const [dismissed, setDismissed] = React.useState(false);
  if (dismissed) return null;

  return (
    <div
      className={cn("flex items-center gap-3 rounded-lg border p-4", VARIANTS[variant], className)}
    >
      {icon && <div className="shrink-0">{icon}</div>}
      <div className="flex-1 space-y-0.5">
        <p className="text-sm font-semibold">{title}</p>
        {description && <p className="text-sm opacity-90">{description}</p>}
      </div>
      {cta && (
        <Button asChild size="sm" variant="outline">
          <a href={cta.href}>{cta.label}</a>
        </Button>
      )}
      {dismissible && (
        <button
          type="button"
          onClick={() => {
            setDismissed(true);
            onDismiss?.();
          }}
          aria-label="Dismiss"
          className="shrink-0 rounded-md p-1 opacity-70 hover:opacity-100"
        >
          <span aria-hidden>×</span>
        </button>
      )}
    </div>
  );
}
