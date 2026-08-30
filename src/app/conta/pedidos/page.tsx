import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { getLocale, getTranslations } from "next-intl/server";
import { authOptions } from "@workspace/auth";
import { prisma } from "@workspace/database/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Price } from "@/components/site/price";

export const metadata: Metadata = {
  title: "Meus pedidos — ShopFinder"
};

/**
 * T044 — "Meus pedidos": Orders do Customer cujo email == session.user.email.
 * Autorização por dono: o where por email/customer.id nunca lista pedidos de
 * outro usuário. Dados criados pelo webhook (T020b/T040).
 */
export default async function MeusPedidosPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/conta/pedidos");
  }

  const locale = await getLocale();
  const t = await getTranslations("orders");

  const customer = await prisma.customer.findFirst({
    where: { email: session.user.email },
    select: { id: true }
  });

  const orders = customer
    ? await prisma.order.findMany({
        where: { customerId: customer.id },
        include: { items: true },
        orderBy: { createdAt: "desc" },
        take: 20
      })
    : [];

  const dateFmt = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short"
  });

  if (orders.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("empty")}</p>
        <Link
          href="/"
          className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
        >
          {t("emptyCta")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>

      <div className="space-y-4">
        {orders.map((order) => (
          <Card key={order.id}>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-mono text-xs text-muted-foreground">
                    {order.number.length > 24 ? `${order.number.slice(0, 24)}…` : order.number}
                  </span>
                  <p className="text-sm text-muted-foreground">
                    {dateFmt.format(order.createdAt)} · {order.items.length}{" "}
                    {order.items.length === 1 ? t("itemsOne") : t("items")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    className="capitalize"
                    variant={order.status === "paid" ? "default" : "outline"}
                  >
                    {order.status}
                  </Badge>
                  <Price
                    amount={Number(order.grandTotalMinorUnits) / 100}
                    currency={order.currency}
                  />
                </div>
              </div>

              <details className="mt-3 border-t border-border/40 pt-2">
                <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                  {t("verItens")}
                </summary>
                <ul className="mt-2 space-y-1.5">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex items-center justify-between text-xs">
                      <span>
                        {item.title}
                        <span className="text-muted-foreground"> × {item.quantity}</span>
                      </span>
                      <Price
                        amount={Number(item.unitPriceMinorUnits) / 100}
                        currency={item.unitPriceCurrencyCode}
                        variant="small"
                      />
                    </li>
                  ))}
                </ul>
              </details>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          ← {t("emptyCta")}
        </Link>
      </p>
    </div>
  );
}
