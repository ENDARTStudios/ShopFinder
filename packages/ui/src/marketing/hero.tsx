"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface HeroProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  description?: string;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  imageUrl?: string;
  className?: string;
  children?: React.ReactNode;
}

export function Hero({
  eyebrow,
  title,
  subtitle,
  description,
  primaryCta,
  secondaryCta,
  imageUrl,
  className,
  children
}: HeroProps) {
  return (
    <section className={cn("relative isolate overflow-hidden", className)}>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-24">
        <div className="space-y-6">
          {eyebrow && (
            <span className="inline-block rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {eyebrow}
            </span>
          )}
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">{title}</h1>
            {subtitle && (
              <p className="text-lg font-medium text-muted-foreground sm:text-xl">{subtitle}</p>
            )}
          </div>
          {description && (
            <p className="max-w-xl text-base leading-relaxed text-foreground/80 sm:text-lg">
              {description}
            </p>
          )}
          {(primaryCta || secondaryCta) && (
            <div className="flex flex-wrap gap-3">
              {primaryCta && (
                <Button asChild size="lg">
                  <a href={primaryCta.href}>{primaryCta.label}</a>
                </Button>
              )}
              {secondaryCta && (
                <Button asChild variant="outline" size="lg">
                  <a href={secondaryCta.href}>{secondaryCta.label}</a>
                </Button>
              )}
            </div>
          )}
          {children}
        </div>
        {imageUrl && (
          <div className="relative">
            <div className="aspect-square overflow-hidden rounded-2xl border bg-muted">
              {}
              <img src={imageUrl} alt="" className="h-full w-full object-cover" />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
