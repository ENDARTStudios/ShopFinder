"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

/**
 * ActivityTimeline — vertical list of timestamped events.
 *
 * Domain link: Admin activity feed (order events, customer events, system events).
 */

export interface ActivityItem {
  id: string;
  icon?: React.ReactNode;
  title: string;
  description?: string;
  timestamp: string; // ISO or pre-formatted
  actor?: string;
}

export interface ActivityTimelineProps {
  items: ActivityItem[];
  maxItems?: number;
  className?: string;
}

export function ActivityTimeline({ items, maxItems, className }: ActivityTimelineProps) {
  const shown = maxItems ? items.slice(0, maxItems) : items;
  return (
    <ScrollArea className={cn("h-80", className)}>
      <ol className="relative space-y-4 pr-4">
        {shown.map((item, idx) => (
          <li key={item.id} className="relative flex gap-3">
            {idx < shown.length - 1 && (
              <span className="absolute left-[15px] top-8 h-full w-px bg-border" aria-hidden />
            )}
            <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background">
              {item.icon ?? <span className="h-2 w-2 rounded-full bg-foreground" />}
            </div>
            <div className="flex-1 space-y-0.5 pt-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium">{item.title}</span>
                <time className="shrink-0 text-xs text-muted-foreground">{item.timestamp}</time>
              </div>
              {item.description && (
                <p className="text-xs text-muted-foreground">{item.description}</p>
              )}
              {item.actor && <p className="text-xs text-muted-foreground">by {item.actor}</p>}
            </div>
          </li>
        ))}
      </ol>
    </ScrollArea>
  );
}
