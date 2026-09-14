"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ShieldCheck, Truck, RefreshCw, Lock } from "lucide-react";

export interface TrustBadgeProps {
  variant?: "secure" | "shipping" | "returns" | "payment";
  label?: string;
  className?: string;
}

const DEFAULTS = {
  secure: { icon: <Lock className="h-4 w-4" />, label: "Secure checkout" },
  shipping: { icon: <Truck className="h-4 w-4" />, label: "Free shipping over $50" },
  returns: { icon: <RefreshCw className="h-4 w-4" />, label: "30-day returns" },
  payment: { icon: <ShieldCheck className="h-4 w-4" />, label: "Buyer protection" }
};

export function TrustBadge({ variant = "secure", label, className }: TrustBadgeProps) {
  const cfg = DEFAULTS[variant];
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur",
        className
      )}
    >
      {cfg.icon}
      {label ?? cfg.label}
    </div>
  );
}
