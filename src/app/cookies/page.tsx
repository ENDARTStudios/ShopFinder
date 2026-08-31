import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { InstitutionalHeader } from "@/components/site/institutional-header";

export const metadata: Metadata = {
  title: "Política de Cookies — ShopFinder"
};

const COOKIE_ROWS: Array<{
  name: string;
  provider: string;
  duration: string;
  purpose: string;
  type: string;
}> = [
  {
    name: "sf:cart",
    provider: "ShopFinder (localStorage)",
    duration: "Persistente (até limpar os dados do site)",
    purpose: "Manter os itens do carrinho entre visitas",
    type: "Essencial"
  },
  {
    name: "sf:locale + cookie locale",
    provider: "ShopFinder (localStorage + cookie)",
    duration: "Persistente (1 ano no cookie)",
    purpose: "Idioma da interface",
    type: "Preferência"
  },
  {
    name: "sf:currency",
    provider: "ShopFinder (localStorage)",
    duration: "Persistente (até limpar os dados do site)",
    purpose: "Moeda de exibição dos preços",
    type: "Preferência"
  },
  {
    name: "sf:notifications",
    provider: "ShopFinder (localStorage)",
    duration: "Persistente (até limpar os dados do site)",
    purpose: "Preferências de notificação",
    type: "Preferência"
  },
  {
    name: "next-auth.session-token",
    provider: "ShopFinder / NextAuth (cookie)",
    duration: "30 dias (sessão de login)",
    purpose: "Manter você autenticado com segurança",
    type: "Essencial"
  },
  {
    name: "next-auth.csrf-token",
    provider: "ShopFinder / NextAuth (cookie)",
    duration: "Sessão",
    purpose: "Proteção contra ataques CSRF no login",
    type: "Essencial"
  }
];

export default async function CookiesPage() {
  const t = await getTranslations("cookies");

  const manage = [t("chrome"), t("firefox"), t("safari"), t("edge")];

  return (
    <div className="min-h-screen">
      <InstitutionalHeader />
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <h1 className="mb-2 text-3xl font-black tracking-tight">{t("title")}</h1>
        <p className="mb-6 text-xs text-muted-foreground">{t("updated")}</p>

        <h2 className="mb-1 text-base font-bold">{t("whatTitle")}</h2>
        <p className="mb-6 text-sm leading-relaxed text-muted-foreground">{t("what")}</p>

        <h2 className="mb-1 text-base font-bold">{t("tableTitle")}</h2>
        <div className="mb-6 overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                {[
                  t("colName"),
                  t("colProvider"),
                  t("colDuration"),
                  t("colPurpose"),
                  t("colType")
                ].map((h) => (
                  <th
                    key={h}
                    className="border-b border-border/60 px-2 py-1.5 text-left font-semibold"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COOKIE_ROWS.map((row) => (
                <tr key={row.name} className="align-top">
                  <td className="border-b border-border/30 px-2 py-1.5 font-mono">{row.name}</td>
                  <td className="border-b border-border/30 px-2 py-1.5 text-muted-foreground">
                    {row.provider}
                  </td>
                  <td className="border-b border-border/30 px-2 py-1.5 text-muted-foreground">
                    {row.duration}
                  </td>
                  <td className="border-b border-border/30 px-2 py-1.5 text-muted-foreground">
                    {row.purpose}
                  </td>
                  <td className="border-b border-border/30 px-2 py-1.5">{row.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="mb-1 text-base font-bold">{t("noneTitle")}</h2>
        <p className="mb-6 text-sm leading-relaxed text-muted-foreground">{t("none")}</p>

        <h2 className="mb-1 text-base font-bold">{t("manageTitle")}</h2>
        <p className="mb-2 text-sm leading-relaxed text-muted-foreground">{t("manageIntro")}</p>
        <ul className="mb-6 space-y-1 text-sm text-muted-foreground">
          {manage.map((m) => (
            <li key={m} className="flex gap-2">
              <span aria-hidden className="text-emerald-500">
                •
              </span>
              <span>{m}</span>
            </li>
          ))}
        </ul>

        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{t("bannerNote")}</p>

        <Link href="/privacidade" className="text-sm text-emerald-500 hover:underline">
          {t("privacyLink")}
        </Link>
      </div>
    </div>
  );
}
