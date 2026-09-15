import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { getLocale, getTranslations } from "next-intl/server";
import { Package, Settings } from "lucide-react";
import { authOptions } from "@workspace/auth";
import { prisma } from "@workspace/database/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NotificationsBell } from "@/components/site/notifications-bell";
import { AlertsList } from "@/components/alerts/alerts-list";
import { WishlistList } from "@/components/site/wishlist-list";

export const metadata: Metadata = {
  title: "Minha conta — ShopFinder"
};

export default async function ContaPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/conta");
  }

  const locale = await getLocale();
  const t = await getTranslations("account");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { email: true, createdAt: true }
  });

  const memberSince = user
    ? new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(user.createdAt)
    : null;

  const navCards = [
    {
      href: "/conta/pedidos",
      icon: Package,
      title: t("orders"),
      description: t("ordersDesc")
    },
    {
      href: "/conta/configuracoes",
      icon: Settings,
      title: t("settings"),
      description: t("settingsDesc")
    }
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">{t("profile")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">Email: </span>
            <span className="font-medium">{user?.email ?? session.user.email}</span>
          </p>
          {memberSince && (
            <p>
              <span className="text-muted-foreground">{t("memberSince")}: </span>
              <span className="font-medium">{memberSince}</span>
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {navCards.map((card) => (
          <Link key={card.href} href={card.href} className="group">
            <Card className="h-full transition-all group-hover:border-emerald-500/40 group-hover:shadow-md">
              <CardHeader>
                <card.icon className="mb-2 h-6 w-6 text-emerald-500" />
                <CardTitle className="text-base group-hover:text-emerald-500">
                  {card.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{card.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* T083 — alertas de preço: lista + criação via detalhe do produto */}
      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{t("priceAlerts")}</CardTitle>
          <NotificationsBell />
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-muted-foreground">{t("priceAlertsDesc")}</p>
          <AlertsList />
        </CardContent>
      </Card>

      {/* NOVA_DIRECAO A3 — wishlist por conta */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">{t("wishlist")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-muted-foreground">{t("wishlistDesc")}</p>
          <WishlistList />
        </CardContent>
      </Card>
    </div>
  );
}
