import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { InstitutionalHeader } from "@/components/site/institutional-header";

export const metadata: Metadata = {
  title: "Política de Cookies — ShopFinder"
};

// Nomes técnicos das chaves de storage (locale-neutros); os textos descritivos
// (fornecedor/duração/finalidade/tipo) vêm de messages/*.json (cookies.rows.*).
const COOKIE_ROWS: Array<{ name: string; key: string }> = [
  { name: "sf:cart", key: "cart" },
  { name: "sf:locale + cookie locale", key: "locale" },
  { name: "sf:currency", key: "currency" },
  { name: "sf:notifications", key: "notifications" },
  { name: "shopfinder:compare", key: "compare" },
  { name: "shopfinder:read-notifications", key: "notificationsRead" },
  { name: "sf:fx", key: "fx" },
  { name: "sf:img:*", key: "img" },
  { name: "next-auth.session-token", key: "session" },
  { name: "next-auth.csrf-token", key: "csrf" }
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
                    {t(`rows.${row.key}.provider`)}
                  </td>
                  <td className="border-b border-border/30 px-2 py-1.5 text-muted-foreground">
                    {t(`rows.${row.key}.duration`)}
                  </td>
                  <td className="border-b border-border/30 px-2 py-1.5 text-muted-foreground">
                    {t(`rows.${row.key}.purpose`)}
                  </td>
                  <td className="border-b border-border/30 px-2 py-1.5">
                    {t(`rows.${row.key}.type`)}
                  </td>
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
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
          {t("preferencesNote")}
        </p>

        <Link href="/privacidade" className="text-sm text-emerald-500 hover:underline">
          {t("privacyLink")}
        </Link>
      </div>
    </div>
  );
}
