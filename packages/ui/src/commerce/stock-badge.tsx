"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

/**
 * StockBadge — displays stock status using domain semantics.
 *
 * Domain link: Product variant `inventory` field.
 *
 * Thresholds:
 *   - inventory === 0      → out of stock (red)
 *   - inventory <= lowThreshold → low stock (amber)
 *   - else                 → in stock (green)
 */

export interface StockBadgeProps {
  inventory: number;
  lowThreshold?: number;
  className?: string;
}

export function StockBadge({ inventory, lowThreshold = 5, className }: StockBadgeProps) {
  const status = inventory === 0 ? "out" : inventory <= lowThreshold ? "low" : "in";

  const config = {
    in: {
      icon: <CheckCircle2 className="h-3 w-3" />,
      label: inventory > 99 ? "In stock" : `In stock (${inventory})`,
      className: "border-success/30 bg-success/10 text-success"
    },
    low: {
      icon: <AlertTriangle className="h-3 w-3" />,
      label: `Low stock (${inventory} left)`,
      className: "border-warning/30 bg-warning/10 text-warning"
    },
    out: {
      icon: <XCircle className="h-3 w-3" />,
      label: "Out of stock",
      className: "border-destructive/30 bg-destructive/10 text-destructive"
    }
  }[status];

  return (
    <Badge variant="outline" className={cn("gap-1 font-medium", config.className, className)}>
      {config.icon}
      {config.label}
    </Badge>
  );
}
