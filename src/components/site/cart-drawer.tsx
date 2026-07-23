"use client";

import * as React from "react";
import Link from "next/link";
import { ShoppingCart, X, Plus, Minus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCart } from "@/context/cart-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose
} from "@/components/ui/sheet";

function formatPrice(price: number, currency: string): string {
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(price);
  } catch {
    return `${currency} ${price.toFixed(2)}`;
  }
}

export function CartDrawer() {
  const t = useTranslations("cart");
  const { items, itemCount, subtotal, isCartOpen, closeCart, setQty, removeItem } = useCart();

  return (
    <Sheet open={isCartOpen} onOpenChange={(open) => !open && closeCart()}>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="border-b border-border/60 pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <ShoppingCart className="h-5 w-5" />
              {t("title")}
              {itemCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {itemCount}
                </Badge>
              )}
            </SheetTitle>
            <SheetClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
                <span className="sr-only">{t("close")}</span>
              </Button>
            </SheetClose>
          </div>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12">
            <ShoppingCart className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
            <Button variant="outline" onClick={closeCart} asChild>
              <Link href="/">{t("viewProducts")}</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto py-4">
              <ul className="space-y-4">
                {items.map((item) => (
                  <li
                    key={item.sku}
                    className="flex items-start gap-3 rounded-lg border border-border/60 p-3"
                  >
                    {/* Image placeholder */}
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold text-muted-foreground">
                      {item.imageLabel ?? item.title.slice(0, 2).toUpperCase()}
                    </div>

                    <div className="flex flex-1 flex-col gap-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-tight">{item.title}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => removeItem(item.sku)}
                          aria-label={t("removeItem")}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        {formatPrice(item.price, item.currency)} / un.
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setQty(item.sku, item.qty - 1)}
                            disabled={item.qty <= 1}
                            aria-label={t("decreaseQty")}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm tabular-nums">{item.qty}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setQty(item.sku, item.qty + 1)}
                            disabled={item.qty >= 99}
                            aria-label={t("increaseQty")}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>

                        <span className="text-sm font-semibold tabular-nums">
                          {formatPrice(item.price * item.qty, item.currency)}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-border/60 pt-4">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-medium">{t("subtotal")}</span>
                <span className="text-lg font-bold tabular-nums">
                  {formatPrice(subtotal, items[0]?.currency ?? "USD")}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <Button className="w-full bg-emerald-500 hover:bg-emerald-600" asChild>
                  <Link href="/checkout" onClick={closeCart}>
                    {t("checkout")}
                  </Link>
                </Button>
                <Button variant="outline" className="w-full" onClick={closeCart} asChild>
                  <Link href="/">{t("continueShopping")}</Link>
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
