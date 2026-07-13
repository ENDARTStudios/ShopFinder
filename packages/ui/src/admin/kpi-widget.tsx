"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

/**
 * KPIWidget — single metric card with trend indicator.
 *
 * Domain link: Admin dashboard projections (sales, orders, customers, AOV).
 */

export interface KPIWidgetProps {
  label: string;
  value: string | number;
  format?: "currency" | "number" | "percent";
  delta?: number; // percentage change vs previous period
  deltaLabel?: string; // e.g. "vs last week"
  icon?: React.ReactNode;
  className?: string;
}

export function KPIWidget({
  label,
  value,
  format = "number",
  delta,
  deltaLabel,
  icon,
  className
}: KPIWidgetProps) {
  const formatted = React.useMemo(() => {
    if (typeof value === "string") return value;
    if (format === "percent") return `${value.toFixed(1)}%`;
    if (format === "currency")
      return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return value.toLocaleString("en-US");
  }, [value, format]);

  const isPositive = delta !== undefined && delta >= 0;

  return (
    <Card className={cn("border-border/60", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardDescription className="text-xs font-medium uppercase tracking-wider">
          {label}
        </CardDescription>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">{formatted}</div>
        {delta !== undefined && (
          <div className="mt-1 flex items-center gap-1 text-xs">
            <span
              className={cn(
                "flex items-center gap-0.5 font-medium",
                isPositive ? "text-success" : "text-destructive"
              )}
            >
              {isPositive ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {Math.abs(delta).toFixed(1)}%
            </span>
            {deltaLabel && <span className="text-muted-foreground">{deltaLabel}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
