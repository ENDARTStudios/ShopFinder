/**
 * ShopFinder — Global site footer.
 *
 * Renders on every page (mounted in RootLayout).
 *
 * Layout (left-aligned text · right-aligned copyright):
 *   ShopFinder - compra inteligente - V0.6.0     Copyright © 2026 END ART
 *
 * The "ShopFinder" name is rendered in BOLD (font-bold text-foreground)
 * to emphasize the brand. The tagline is lowercase per brand guidelines.
 *
 * Source of truth for name, tagline, version: PROJECT_META in
 * `@/components/site/data`. Update version there to bump everywhere.
 */
import { PROJECT_META } from "@/components/site/data";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/60 bg-muted/20">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-2 px-4 py-4 sm:flex-row sm:items-center sm:px-6 lg:px-8">
        <div className="text-xs text-muted-foreground">
          <span className="font-bold text-foreground">{PROJECT_META.name}</span>
          <span className="mx-1">-</span>
          <span>{PROJECT_META.tagline}</span>
          <span className="mx-1">-</span>
          <span>V{PROJECT_META.version.toUpperCase()}</span>
        </div>
        <div className="text-xs text-muted-foreground">Copyright © 2026 END ART</div>
      </div>
    </footer>
  );
}
