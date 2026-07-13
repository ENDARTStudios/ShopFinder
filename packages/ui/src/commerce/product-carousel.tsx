"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ProductCard, type ProductCardProps } from "./product-card";

/**
 * ProductCarousel — horizontal scroll of ProductCards.
 *
 * Domain link: list of ProductListItemDTO (e.g. related products, trending).
 */

export interface ProductCarouselProps {
  title?: string;
  products: ProductCardProps[];
  className?: string;
}

export function ProductCarousel({ title, products, className }: ProductCarouselProps) {
  if (products.length === 0) return null;

  return (
    <section className={cn("space-y-4", className)}>
      {title && (
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
        </div>
      )}
      <div
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [scrollbar-width:thin]"
        role="list"
      >
        {products.map((p) => (
          <div key={p.id} role="listitem" className="w-[240px] shrink-0 snap-start sm:w-[280px]">
            <ProductCard {...p} />
          </div>
        ))}
      </div>
    </section>
  );
}
