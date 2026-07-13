"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

/**
 * CustomerAvatar — avatar with initials fallback.
 *
 * Domain link: @workspace/domain/customer Customer (name, email).
 */

export interface CustomerAvatarProps {
  name: string;
  email?: string;
  imageUrl?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = { sm: "h-8 w-8", md: "h-10 w-10", lg: "h-12 w-12" };
const TEXT = { sm: "text-xs", md: "text-sm", lg: "text-base" };

function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function CustomerAvatar({
  name,
  email,
  imageUrl,
  size = "md",
  className
}: CustomerAvatarProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Avatar className={cn(SIZES[size])}>
        {imageUrl && <AvatarImage src={imageUrl} alt={name} />}
        <AvatarFallback className={TEXT[size]}>{initials(name) || "?"}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{name}</div>
        {email && <div className="truncate text-xs text-muted-foreground">{email}</div>}
      </div>
    </div>
  );
}
