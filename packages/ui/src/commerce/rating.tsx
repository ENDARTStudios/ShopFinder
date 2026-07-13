"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

/**
 * Rating — star rating display (read-only) with optional review count.
 *
 * Domain link: Product `rating` and `reviewCount` projection fields.
 */

export interface RatingProps {
  value: number; // 0-5
  reviewCount?: number;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  className?: string;
}

const STAR_SIZES = { sm: "h-3 w-3", md: "h-4 w-4", lg: "h-5 w-5" };
const TEXT_SIZES = { sm: "text-xs", md: "text-sm", lg: "text-base" };

export function Rating({
  value,
  reviewCount,
  size = "md",
  showValue = true,
  className
}: RatingProps) {
  const clamped = Math.max(0, Math.min(5, value));
  const full = Math.floor(clamped);
  const hasHalf = clamped - full >= 0.25 && clamped - full < 0.75;
  const fullOrHalf = hasHalf ? full + 0.5 : full;
  const empty = 5 - Math.ceil(fullOrHalf);

  return (
    <div
      className={cn("flex items-center gap-1", className)}
      aria-label={`Rating: ${clamped} out of 5`}
    >
      <div className="flex items-center" aria-hidden>
        {Array.from({ length: full }).map((_, i) => (
          <Star key={`f${i}`} className={cn(STAR_SIZES[size], "fill-warning text-warning")} />
        ))}
        {hasHalf && (
          <div className="relative">
            <Star className={cn(STAR_SIZES[size], "text-muted")} />
            <div className="absolute inset-0 overflow-hidden" style={{ width: "50%" }}>
              <Star className={cn(STAR_SIZES[size], "fill-warning text-warning")} />
            </div>
          </div>
        )}
        {Array.from({ length: empty }).map((_, i) => (
          <Star key={`e${i}`} className={cn(STAR_SIZES[size], "text-muted")} />
        ))}
      </div>
      {showValue && (
        <span className={cn("font-medium tabular-nums", TEXT_SIZES[size])}>
          {clamped.toFixed(1)}
        </span>
      )}
      {reviewCount !== undefined && (
        <span className={cn("text-muted-foreground", TEXT_SIZES[size])}>({reviewCount})</span>
      )}
    </div>
  );
}
