"use client";

/**
 * @workspace/ui/commerce
 *
 * Domain-driven commerce components. Each component reflects a concept from
 * the domain ubiquitous language (see docs/domain.md).
 *
 * Components:
 *   - Price           : displays a Money amount with currency formatting
 *   - Money           : alias for Price (semantic for non-price contexts)
 *   - StockBadge      : in-stock / low-stock / out-of-stock indicator
 *   - Rating          : star rating display
 *   - AddToCartButton : CTA with loading + success states
 *   - QuantitySelector: stepper input for quantities
 *   - VariantSelector : pick variant attributes (size, color, ...)
 *   - ProductCard     : composite card for catalog grids
 *   - ProductGallery  : image gallery with thumbnails
 *   - ProductCarousel : horizontal scroll of products
 */

export * from "./price";
export * from "./stock-badge";
export * from "./rating";
export * from "./add-to-cart-button";
export * from "./quantity-selector";
export * from "./variant-selector";
export * from "./product-card";
export * from "./product-gallery";
export * from "./product-carousel";
