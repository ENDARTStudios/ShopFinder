"use client";

import * as React from "react";
import { ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCart } from "@/context/cart-context";
import { Button } from "@/components/ui/button";

export interface AddToCartButtonProps {
  sku: string;
  title: string;
  price: number;
  currency: string;
  imageLabel?: string;
  size?: "sm" | "default" | "lg";
  className?: string;
}

export function AddToCartButton({
  sku,
  title,
  price,
  currency,
  imageLabel,
  size = "sm",
  className
}: AddToCartButtonProps) {
  const t = useTranslations("products");
  const { addItem, openCart } = useCart();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({ sku, title, price, currency, imageLabel });
    openCart();
  };

  return (
    <Button
      type="button"
      variant="default"
      size={size}
      onClick={handleClick}
      className={className}
      aria-label={t("addToCart")}
    >
      <ShoppingCart className="mr-1 h-4 w-4" aria-hidden="true" />
      {t("buy")}
    </Button>
  );
}
