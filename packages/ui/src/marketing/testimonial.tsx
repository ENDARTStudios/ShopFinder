"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star } from "lucide-react";

export interface TestimonialProps {
  quote: string;
  authorName: string;
  authorRole?: string;
  authorImageUrl?: string;
  rating?: number; // 0-5
  className?: string;
}

export function Testimonial({
  quote,
  authorName,
  authorRole,
  authorImageUrl,
  rating,
  className
}: TestimonialProps) {
  return (
    <figure className={cn("space-y-4 rounded-xl border border-border/60 bg-card p-6", className)}>
      {rating !== undefined && (
        <div className="flex gap-0.5" aria-label={`Rating: ${rating} out of 5`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={cn("h-4 w-4", i < rating ? "fill-warning text-warning" : "text-muted")}
            />
          ))}
        </div>
      )}
      <blockquote className="text-sm leading-relaxed text-foreground/90 sm:text-base">
        “{quote}”
      </blockquote>
      <figcaption className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          {authorImageUrl && <AvatarImage src={authorImageUrl} alt={authorName} />}
          <AvatarFallback>
            {authorName
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="text-sm font-semibold">{authorName}</div>
          {authorRole && <div className="text-xs text-muted-foreground">{authorRole}</div>}
        </div>
      </figcaption>
    </figure>
  );
}
