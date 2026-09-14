"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";

type ButtonProps = VariantProps<typeof buttonVariants> & {
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  size?: "default" | "sm" | "lg" | "icon" | null;
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link" | null;
  asChild?: boolean;
};

import { ShoppingCart, Check, Loader2 } from "lucide-react";

/**
 * AddToCartButton — CTA with idle / loading / success states.
 *
 * Domain link: Cart aggregate `ItemAdded` event.
 */

export interface AddToCartButtonProps extends Omit<ButtonProps, "children" | "onClick"> {
  onAdd: () => void | Promise<void>;
  label?: string;
  successLabel?: string;
  loadingLabel?: string;
  showIcon?: boolean;
  successDurationMs?: number;
}

export function AddToCartButton({
  onAdd,
  label = "Add to cart",
  successLabel = "Added",
  loadingLabel = "Adding...",
  showIcon = true,
  successDurationMs = 1500,
  className,
  disabled,
  ...buttonProps
}: AddToCartButtonProps) {
  const [status, setStatus] = React.useState<"idle" | "loading" | "success">("idle");

  const handleClick = async () => {
    if (status !== "idle") return;
    setStatus("loading");
    try {
      await onAdd();
      setStatus("success");
      setTimeout(() => setStatus("idle"), successDurationMs);
    } catch {
      setStatus("idle");
    }
  };

  const icon =
    status === "loading" ? (
      <Loader2 className="h-4 w-4 animate-spin" />
    ) : status === "success" ? (
      <Check className="h-4 w-4" />
    ) : (
      <ShoppingCart className="h-4 w-4" />
    );

  const text = status === "loading" ? loadingLabel : status === "success" ? successLabel : label;

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || status === "loading"}
      className={cn(className)}
      {...buttonProps}
    >
      {showIcon && icon}
      <span>{text}</span>
    </Button>
  );
}
