"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";

/**
 * QuantitySelector — stepper input for cart quantities.
 *
 * Domain link: Cart `Quantity` value object (non-negative integer).
 */

export interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  className?: string;
}

const SIZES = {
  sm: { btn: "h-7 w-7", input: "h-7 w-10 text-xs", icon: "h-3 w-3" },
  md: { btn: "h-9 w-9", input: "h-9 w-14 text-sm", icon: "h-4 w-4" },
  lg: { btn: "h-11 w-11", input: "h-11 w-16 text-base", icon: "h-5 w-5" }
};

export function QuantitySelector({
  value,
  onChange,
  min = 1,
  max = 99,
  step = 1,
  size = "md",
  disabled = false,
  className
}: QuantitySelectorProps) {
  const s = SIZES[size];
  const canDecrement = value - step >= min && !disabled;
  const canIncrement = value + step <= max && !disabled;

  const clamp = (n: number) => Math.max(min, Math.min(max, n));

  return (
    <div className={cn("inline-flex items-center", className)} role="group" aria-label="Quantity">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={cn(s.btn, "rounded-r-none")}
        onClick={() => onChange(clamp(value - step))}
        disabled={!canDecrement}
        aria-label="Decrease quantity"
      >
        <Minus className={s.icon} />
      </Button>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          if (!isNaN(n)) onChange(clamp(n));
        }}
        className={cn(
          s.input,
          "border-x-0 border-y border-input bg-transparent text-center tabular-nums focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        )}
        aria-label="Quantity"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={cn(s.btn, "rounded-l-none")}
        onClick={() => onChange(clamp(value + step))}
        disabled={!canIncrement}
        aria-label="Increase quantity"
      >
        <Plus className={s.icon} />
      </Button>
    </div>
  );
}
