import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { InstitutionalHeader } from "@/components/site/institutional-header";
import { CookiePreferences } from "@/components/site/cookie-preferences";

export const metadata: Metadata = {
  title: "Política de Cookies — ShopFinder"
};

interface PolicySection {
  id: string;
  title: string;
  body: string | string[];
  table?: { headers: string[]; rows: string[][] };
}

/**
 * Política de Cookies v2.0 (T067/cookies) — renderiza o documento como
 * seções (padrão /termos e /privacidade) + painel permanente "Preferências
 * de Cookies" exigido pela especificação de consentimento LGPD.
 */
export default async function CookiesPage() {
  const t = await getTranslations("cookies");

  const sections = t.raw("sections") as PolicySection[];
  const intro = t("intro");

  return (
    <div className="min-h-screen">
      <InstitutionalHeader />
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <h1 className="mb-2 text-3xl font-black tracking-tight">{t("title")}</h1>
        <p className="mb-6 text-xs text-muted-foreground">{t("updated")}</p>
        <p className="mb-6 text-sm leading-relaxed text-muted-foreground">{intro}</p>

        <div className="mb-8">
          <CookiePreferences />
        </div>

        <div className="space-y-6">
          {sections.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-20">
              <h2 className="mb-1 text-base font-bold">{s.title}</h2>
              {Array.isArray(s.body) ? (
                <div className="space-y-2">
                  {s.body.map((paragraph, i) => (
                    <p
                      key={i}
                      className="text-sm leading-relaxed text-muted-foreground"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              )}

              {s.table && (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr>
                        {s.table.headers.map((h) => (
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
                      {s.table.rows.map((row, i) => (
                        <tr key={i} className="align-top">
                          {row.map((cell, j) => (
                            <td
                              key={j}
                              className={`border-b border-border/30 px-2 py-1.5 text-muted-foreground ${j === 0 ? "font-mono text-[11px] text-foreground" : ""}`}
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
