"use client";

import * as React from "react";
import Link from "next/link";
import { ShoppingCart, ArrowLeft, CreditCard, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCart } from "@/context/cart-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatPrice(price: number, currency: string): string {
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(price);
  } catch {
    return `${currency} ${price.toFixed(2)}`;
  }
}

export default function CheckoutPage() {
  const t = useTranslations("cart");
  const { items, itemCount, subtotal } = useCart();

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <ShoppingCart className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
          <h1 className="mb-2 text-2xl font-bold">Seu carrinho está vazio</h1>
          <p className="mb-6 text-muted-foreground">Adicione produtos do catálogo para finalizar a compra.</p>
          <Button asChild className="bg-emerald-500 hover:bg-emerald-600">
            <Link href="/">Ver produtos</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Continuar comprando
        </Link>

        <h1 className="mb-8 text-3xl font-black tracking-tight">Finalizar compra</h1>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          {/* Items summary */}
          <div className="lg:col-span-3 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShoppingCart className="h-4 w-4" />
                  Resumo do pedido ({itemCount} itens)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-border/60">
                  {items.map((item) => (
                    <li key={item.sku} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-xs font-bold text-muted-foreground">
                          {item.imageLabel ?? item.title.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{item.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatPrice(item.price, item.currency)} × {item.qty}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold tabular-nums">
                        {formatPrice(item.price * item.qty, item.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Payment card */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard className="h-4 w-4" />
                  Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
                    <Lock className="h-4 w-4" />
                    <span className="font-medium">Pagamento seguro (Stripe/Pix)</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ativado na próxima etapa (T020). Por enquanto, você pode simular a compra.
                  </p>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium tabular-nums">
                      {formatPrice(subtotal, items[0]?.currency ?? "USD")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Frete</span>
                    <span className="text-muted-foreground">Calculado no checkout</span>
                  </div>
                  <div className="border-t border-border/60 pt-3 flex items-center justify-between">
                    <span className="font-semibold">Total</span>
                    <span className="text-xl font-bold tabular-nums">
                      {formatPrice(subtotal, items[0]?.currency ?? "USD")}
                    </span>
                  </div>
                </div>

                <Button className="mt-6 w-full bg-emerald-500 hover:bg-emerald-600" size="lg" disabled>
                  Pagar — {formatPrice(subtotal, items[0]?.currency ?? "USD")}
                </Button>

                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Pagamento seguro via Stripe · Seus dados não são compartilhados
                </p>
              </CardContent>
            </Card>

            <div className="text-center">
              <Link href="/" className="text-sm text-emerald-500 hover:underline">
                ← Voltar ao catálogo
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
