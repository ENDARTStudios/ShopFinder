"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { AspectRatio } from "@/components/ui/aspect-ratio";

/**
 * ProductGallery — image gallery with thumbnail navigation.
 *
 * Domain link: Product `media` field (ProductMedia[]).
 */

export interface ProductGalleryProps {
  images: Array<{ url: string; altText: string }>;
  className?: string;
}

export function ProductGallery({ images, className }: ProductGalleryProps) {
  const [active, setActive] = React.useState(0);
  const safeImages = images.length > 0 ? images : [{ url: "", altText: "No image" }];

  return (
    <div className={cn("space-y-3", className)}>
      <AspectRatio ratio={1} className="overflow-hidden rounded-lg border bg-muted">
        {safeImages[active]?.url ? (
          <img
            src={safeImages[active].url}
            alt={safeImages[active].altText}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <span className="text-sm">No image</span>
          </div>
        )}
      </AspectRatio>
      {safeImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {safeImages.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1}`}
              aria-pressed={active === i}
              className={cn(
                "relative h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 transition-all",
                active === i ? "border-foreground" : "border-transparent hover:border-border"
              )}
            >
              {img.url ? (
                <img src={img.url} alt={img.altText} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-muted" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
