/**
 * ShopFinder — Global site footer (Sprint 11 recriação com i18n).
 *
 * Renders on every page (mounted in RootLayout).
 *
 * Layout (left-aligned text · right-aligned copyright):
 *   ShopFinder - compra inteligente - V0.6.0     Copyright © 2026 END ART
 *
 * The "ShopFinder" name is rendered in BOLD (font-bold text-foreground)
 * to emphasize the brand. The tagline is lowercase per brand guidelines.
 *
 * Sprint 11: tagline agora via useTranslations('hero') — vira "smart shopping"
 * em EN. Copyright via useTranslations('footer').
 *
 * Source of truth for name, version: PROJECT_META in `@/components/site/data`.
 */
import Link from "next/link";
import { useTranslations } from "next-intl";
import { PROJECT_META } from "@/components/site/data";
import { company } from "@/config/company";

export function SiteFooter() {
  const t = useTranslations("hero");
  const tFooter = useTranslations("footer");

  return (
    <footer className="mt-auto border-t border-border/60 bg-muted/20">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        {/* Navegação: âncoras da vitrine + páginas institucionais */}
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <a href="/#nichos" className="hover:text-foreground transition-colors">
            Nichos
          </a>
          <a href="/#categorias" className="hover:text-foreground transition-colors">
            Categorias
          </a>
          <a href="/#fabricantes" className="hover:text-foreground transition-colors">
            Fabricantes
          </a>
          <a href="/#produtos" className="hover:text-foreground transition-colors">
            Produtos
          </a>
          <span aria-hidden className="text-border">
            |
          </span>
          <Link href="/sobre" className="hover:text-foreground transition-colors">
            Sobre
          </Link>
          <Link href="/contato" className="hover:text-foreground transition-colors">
            Contato
          </Link>
          <Link href="/termos" className="hover:text-foreground transition-colors">
            Termos
          </Link>
          <Link href="/privacidade" className="hover:text-foreground transition-colors">
            Privacidade
          </Link>
          <Link href="/cookies" className="hover:text-foreground transition-colors">
            Cookies
          </Link>
        </div>

        <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
          <div className="text-xs text-muted-foreground">
            <span className="font-bold text-foreground">{PROJECT_META.name}</span>
            <span className="mx-1">-</span>
            <span>{t("tagline")}</span>
            <span className="mx-1">-</span>
            <span>V{PROJECT_META.version.toUpperCase()}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Copyright © {new Date().getFullYear()} {company.legalName}
          </div>
        </div>
      </div>
    </footer>
  );
}
