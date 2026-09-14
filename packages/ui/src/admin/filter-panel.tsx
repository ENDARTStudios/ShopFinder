"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

/**
 * FilterPanel — search + filter bar for admin list views.
 *
 * Domain link: Admin list query parameters (filters, search).
 */

export interface FilterPanelProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  children?: React.ReactNode; // additional filter controls (Select, DatePicker, etc.)
  onClear?: () => void;
  className?: string;
}

export function FilterPanel({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  children,
  onClear,
  className
}: FilterPanelProps) {
  const hasFilters = searchValue !== "" || React.Children.count(children) > 0;
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center", className)}>
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-8"
        />
      </div>
      {children}
      {hasFilters && onClear && (
        <Button variant="ghost" size="sm" onClick={onClear} className="shrink-0">
          <X className="mr-1 h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
