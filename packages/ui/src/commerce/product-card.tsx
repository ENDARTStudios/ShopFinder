"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Price } from "./price";
import { StockBadge } from "./stock-badge";
import { Rating } from "./rating";
import { AddToCartButton } from "./add-to-cart-button";

/**
 * ProductCard — composite card for catalog grids.
 *
 * Domain link: ProductListItemDTO from @workspace/contracts/dto.
 */

export interface ProductCardProps {
  id: string;
  slug: string;
  title: string;
  price: { amount: number; currency: string };
  compareAtPrice?: { amount: number; currency: string };
  primaryImageUrl?: string;
  rating?: number;
  reviewCount?: number;
  inStock: boolean;
  inventory?: number;
  href?: string;
  onAddToCart?: () => void | Promise<void>;
  className?: string;
}

export function ProductCard({
  id,
  slug,
  title,
  price,
  compareAtPrice,
  primaryImageUrl,
  rating,
  reviewCount,
  inStock,
  inventory,
  href = "#",
  onAddToCart,
  className
}: ProductCardProps) {
  return (
    <Card
      className={cn(
        "group overflow-hidden border-border/60 transition-all hover:shadow-md",
        className
      )}
    >
      <a href={href} aria-label={title} className="block">
        <CardContent className="p-0">
          <AspectRatio ratio={1} className="bg-muted">
            {primaryImageUrl ? (
              <img
                src={primaryImageUrl}
                alt={title}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <span className="text-xs">No image</span>
              </div>
            )}
          </AspectRatio>
        </CardContent>
      </a>
      <CardFooter className="flex flex-col items-stretch gap-3 p-4">
        <a href={href} className="space-y-1.5">
          <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-snug hover:underline">
            {title}
          </h3>
          {rating !== undefined && <Rating value={rating} reviewCount={reviewCount} size="sm" />}
        </a>
        <div className="flex items-center justify-between gap-2">
          <Price
            amount={price.amount}
            currency={price.currency}
            compareAt={compareAtPrice?.amount}
            size="md"
          />
          {inventory !== undefined ? (
            <StockBadge inventory={inventory} />
          ) : (
            <StockBadge inventory={inStock ? 100 : 0} />
          )}
        </div>
        {onAddToCart && (
          <AddToCartButton onAdd={onAddToCart} disabled={!inStock} className="w-full" size="sm" />
        )}
      </CardFooter>
    </Card>
  );
}
