import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { company } from "@/config/company";
import { InstitutionalHeader } from "@/components/site/institutional-header";

interface LegalSection {
  id: string;
  title: string;
  body: string;
  table?: { headers: string[]; rows: string[][] };
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("privacy");
  return { title: `${t("title")} — ShopFinder` };
}

export default async function PrivacidadePage() {
  const t = await getTranslations("privacy");
  const sections = t.raw("sections") as LegalSection[];

  return (
    <div className="min-h-screen">
      <InstitutionalHeader />
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <h1 className="mb-2 text-3xl font-black tracking-tight">{t("title")}</h1>
        <p className="mb-6 text-xs text-muted-foreground">{t("updated")}</p>

        <nav aria-label={t("toc")} className="mb-8 rounded-lg border border-border/60 bg-muted/20 p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {t("toc")}
          </p>
          <ul className="space-y-1 text-sm">
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-muted-foreground hover:text-foreground hover:underline">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-6">
          {sections.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-20">
              <h2 className="mb-1 text-base font-bold">{s.title}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>

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
                            <td key={j} className="border-b border-border/30 px-2 py-1.5 text-muted-foreground">
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
