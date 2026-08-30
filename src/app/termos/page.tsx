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
  const t = await getTranslations("terms");
  return { title: `${t("title")} — ShopFinder` };
}

export default async function TermosPage() {
  const t = await getTranslations("terms");
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

              {s.id === "identificacao" && (
                <div className="mt-3 grid grid-cols-1 gap-1 rounded-lg border border-border/40 bg-muted/20 p-3 text-xs sm:grid-cols-2">
                  <p>
                    <span className="text-muted-foreground">Razão social: </span>
                    <span className="font-medium">{company.legalName}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">CNPJ: </span>
                    <span className="font-medium">{company.cnpj}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Endereço: </span>
                    <span className="font-medium">{company.address}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Email: </span>
                    <span className="font-medium">{company.email}</span>
                  </p>
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
