"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * VariantSelector — pick variant attributes (size, color, ...).
 *
 * Domain link: Product `Variant.attributes` — Record<string, string>.
 *
 * Two modes:
 *   - "button" : textual options (size, material)
 *   - "swatch" : color swatches (with optional hex)
 */

export interface VariantOption {
  value: string;
  label: string;
  hex?: string; // for color swatches
  disabled?: boolean;
}

export interface VariantSelectorProps {
  name: string; // attribute name, e.g. "Color" or "Size"
  options: VariantOption[];
  value?: string;
  onChange: (value: string) => void;
  mode?: "button" | "swatch";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const BTN_SIZES = { sm: "h-7 px-2 text-xs", md: "h-9 px-3 text-sm", lg: "h-11 px-4 text-base" };
const SWATCH_SIZES = { sm: "h-6 w-6", md: "h-8 w-8", lg: "h-10 w-10" };

export function VariantSelector({
  name,
  options,
  value,
  onChange,
  mode = "button",
  size = "md",
  className
}: VariantSelectorProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{name}</span>
        {value && mode === "button" && (
          <span className="text-sm text-muted-foreground">{value}</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {mode === "swatch"
          ? options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={opt.disabled}
                onClick={() => onChange(opt.value)}
                title={opt.label}
                aria-label={`${name}: ${opt.label}`}
                aria-pressed={value === opt.value}
                className={cn(
                  "relative rounded-full border-2 transition-all",
                  SWATCH_SIZES[size],
                  value === opt.value
                    ? "border-foreground ring-2 ring-foreground ring-offset-2 ring-offset-background"
                    : "border-border",
                  opt.disabled && "cursor-not-allowed opacity-50"
                )}
                style={opt.hex ? { backgroundColor: opt.hex } : undefined}
              >
                {!opt.hex && (
                  <span className="text-[10px] font-medium">{opt.label.slice(0, 2)}</span>
                )}
              </button>
            ))
          : options.map((opt) => (
              <Button
                key={opt.value}
                type="button"
                variant={value === opt.value ? "default" : "outline"}
                size="sm"
                disabled={opt.disabled}
                onClick={() => onChange(opt.value)}
                className={cn(BTN_SIZES[size])}
                aria-pressed={value === opt.value}
              >
                {opt.label}
              </Button>
            ))}
      </div>
    </div>
  );
}
