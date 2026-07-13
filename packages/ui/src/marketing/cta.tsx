"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";

type ButtonProps = VariantProps<typeof buttonVariants>;

export interface CTAProps {
  title: string;
  description?: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  variant?: ButtonProps["variant"];
  align?: "left" | "center";
  className?: string;
}

export function CTA({
  title,
  description,
  primaryCta,
  secondaryCta,
  align = "center",
  className
}: CTAProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border bg-foreground p-8 text-background sm:p-12",
        align === "center" ? "text-center" : "text-left",
        className
      )}
    >
      <div className={cn("space-y-4", align === "center" && "mx-auto max-w-2xl")}>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
        {description && <p className="text-base text-background/80 sm:text-lg">{description}</p>}
        <div className={cn("flex flex-wrap gap-3", align === "center" && "justify-center")}>
          <Button asChild variant="secondary">
            <a href={primaryCta.href}>{primaryCta.label}</a>
          </Button>
          {secondaryCta && (
            <Button
              asChild
              variant="outline"
              className="border-background/30 text-background hover:bg-background/10"
            >
              <a href={secondaryCta.href}>{secondaryCta.label}</a>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
