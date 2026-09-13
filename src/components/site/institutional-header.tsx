import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PROJECT_META } from "@/components/site/data";

/**
 * Header institucional compartilhado das páginas estánicas
 * (/sobre, /termos, /privacidade, /contato) — logo clicável → "/".
 */
export async function InstitutionalHeader() {
  const t = await getTranslations("hero");

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2" aria-label={PROJECT_META.name}>
          <img src="/icon.svg" alt="" width={32} height={32} className="h-8 w-8 rounded-lg" />
          <span className="text-sm font-bold tracking-tight">{PROJECT_META.name}</span>
        </Link>
        <span className="text-[10px] tracking-widest text-muted-foreground">
          {t("tagline")}
        </span>
      </div>
    </header>
  );
}
